# CPMM Market Implementation Tasks

> Constant Product Market Maker for binary prediction markets with dynamic pricing
> Security-first, minimal implementation with upgrade path for LP functionality

---

## Design Principles

1. **Security First**: Every function must be bulletproof against manipulation
2. **Minimal Viable Product**: Creator-only liquidity, no LP tokens initially  
3. **Upgrade Path**: Design allows future LP functionality without breaking changes
4. **Gas Efficient**: Optimize for common operations (buy/sell)
5. **Precise Math**: No rounding errors that can be exploited

---

## Core Formula & Invariants

**AMM Formula**: x * y = k
- x = NO share reserves
- y = YES share reserves  
- k = constant product (changes only on liquidity events)

**Initial Liquidity**: 
- Creator provides: totalSeed (minimum $1000)
- Split equally: reserveYES = reserveNO = totalSeed / 2

**Price Formula**: 
- Price of YES = y / (x + y)
- Price of NO = x / (x + y)

**Critical Invariants**:
1. Sum of all user shares ≤ total reserves
2. After any trade: new_x * new_y ≥ k (accounting for fees)
3. No trade can drain reserves below minimum liquidity
4. Fee extraction never breaks AMM math

---

## Phase 1: Core CPMM Contract

### Task 1.1: Create CPMMMarketImplementation.sol skeleton
- **Start**: Empty file
- **End**: Contract structure with state variables
- **Key Storage**:
  - uint256 reserveYES
  - uint256 reserveNO
  - uint256 constant MIN_TOTAL_LIQUIDITY = 1000e18 (total minimum)
  - uint256 initialLiquidity (store the initial seed amount)
  - uint256 constant FEE_BPS = 300 (3%, updateable by owner)
  - mapping(address => uint256) sharesYES
  - mapping(address => uint256) sharesNO
  - uint256 totalFeesCollected
  - bool initialized
  - bool resolved
  - uint8 winningOutcome
- **Security**: No constructor, only initializer pattern

### Task 1.2: Implement initialize() with liquidity seeding
- **Start**: Skeleton exists
- **End**: Market initialized with creator-specified liquidity split equally
- **Requirements**:
  - Accept liquidityAmount parameter (must be >= MIN_TOTAL_LIQUIDITY)
  - Pull exactly liquidityAmount from creator
  - Set reserveYES = reserveNO = liquidityAmount / 2
  - Store initialLiquidity = liquidityAmount
  - Emit MarketInitialized event with liquidity amount
- **Security Checks**:
  - Require not initialized
  - Require msg.sender == factory
  - Require liquidityAmount >= MIN_TOTAL_LIQUIDITY
  - Validate all addresses non-zero
  - Ensure actual token transfer (no callbacks)

### Task 1.3: Implement getSpotPrice() view
- **Start**: Initialized market
- **End**: Returns current probability (0-100%)
- **Formula**: (reserveYES * 1e18) / (reserveYES + reserveNO)
- **Security**: Pure math, no state changes

### Task 1.4: Implement getAmountOut() calculation
- **Start**: Price function exists
- **End**: Calculate output for given input
- **Formula** (buying YES with amountIn):
  ```
  amountOutGross = (reserveYES * amountIn) / (reserveNO + amountIn)
  fee = amountOutGross * FEE_BPS / 10000
  amountOut = amountOutGross - fee
  ```
- **Security**: Check for overflow, ensure output < reserves

### Task 1.5: Implement buyShares()
- **Start**: Calculation functions ready
- **End**: Users can buy YES or NO shares
- **Flow**:
  1. Transfer payment from user
  2. Calculate shares out (including fees)
  3. Update reserves (x*y=k maintained)
  4. Credit user shares
  5. Track fees for distribution
- **Security**:
  - Require not resolved
  - Require before cutoffTime
  - Min output check (slippage protection)
  - Reentrancy guard
  - Reserve minimum check (can't buy all liquidity)

### Task 1.6: Implement sellShares()
- **Start**: Buy function complete
- **End**: Users can sell shares back to AMM
- **Flow**:
  1. Verify user has shares
  2. Calculate payout amount
  3. Update reserves
  4. Burn user shares
  5. Transfer payout
- **Security**:
  - Same guards as buy
  - Check user balance
  - Ensure payout doesn't exceed reserves

### Task 1.7: Implement claim() for resolution
- **Start**: Trading functions complete
- **End**: Winners can claim $1 per share
- **Logic**:
  - If YES wins: sharesYES[user] * 1e18
  - If NO wins: sharesNO[user] * 1e18
  - Losers get nothing
  - First claimer triggers fee distribution
- **Security**: 
  - Require resolved
  - Prevent double claims
  - Safe fee extraction

---

## Phase 2: Factory Integration

### Task 2.1: Update MarketFactory for CPMM
- **Start**: Current factory only supports parimutuel
- **End**: Factory can deploy either type
- **Changes**:
  - Add `enum MarketType { PARIMUTUEL, CPMM }`
  - Add cpmm implementation address
  - Modify createMarket() to accept type and liquidity amount
  - Different initialization based on type
- **Security**: Validate liquidity requirements for CPMM

### Task 2.2: Add liquidity validation
- **Start**: Factory accepts market type
- **End**: CPMM markets require liquidity deposit
- **Requirements**:
  - CPMM requires liquidityAmount >= MIN_TOTAL_LIQUIDITY
  - Creator specifies amount in createMarket() call
  - Factory pulls liquidityAmount from creator
  - Parimutuel keeps existing stHYPE logic
- **Security**: Ensure transfers complete before deployment

---

## Phase 3: Safety Features

### Task 3.1: Add emergency pause
- **Start**: Basic CPMM working
- **End**: Owner can pause all trading
- **Security**: Only pause trading, not claims

### Task 3.2: Add maximum position limits
- **Start**: No position limits
- **End**: Single address can't own >X% of outcome
- **Security**: Prevent whale manipulation

### Task 3.3: Add minimum liquidity protection
- **Start**: Basic reserve checks
- **End**: Can't trade if reserves would go below 10% of initial
- **Security**: Maintain minimum viable market

---

## Phase 4: Testing

### Task 4.1: Unit tests for AMM math
- Test precise share calculations
- Test fee extraction
- Test slippage scenarios
- Test edge cases (tiny amounts, huge amounts)

### Task 4.2: Fuzz testing for invariants
- Property: x * y ≥ k always
- Property: Total shares ≤ reserves
- Property: No profitable arbitrage cycles

### Task 4.3: Integration tests
- Full lifecycle: create → trade → resolve → claim
- Multi-user trading scenarios
- Fee distribution correctness

### Task 4.4: Security scenarios
- Sandwich attack resistance
- Manipulation attempts
- Reentrancy attempts
- Mathematical edge cases

---

## Phase 5: Gas Optimization

### Task 5.1: Optimize storage layout
- Pack structs efficiently
- Use uint128 where possible
- Minimize SSTORE operations

### Task 5.2: Optimize hot paths
- Cache storage reads in memory
- Batch operations where possible

---

## Critical Security Considerations

1. **Decimal Precision**: All calculations in 18 decimals
2. **Rounding Direction**: Always round against user, in favor of protocol
3. **Minimum Amounts**: Enforce minimums to prevent dust attacks
4. **Reentrancy**: Guards on all external calls
5. **Front-running**: Slippage protection required
6. **Oracle Manipulation**: Resolution through same trusted oracle
7. **Integer Overflow**: Use Solidity 0.8.20+ built-in checks
8. **Reserve Drain**: Never allow reserves below minimum
9. **Fee Extraction**: Must not break AMM invariant
10. **Initialization**: One-time only, through factory only

---

## Future Upgrades (Not in MVP)

- LP token minting for additional liquidity providers
- Dynamic fees based on volatility
- Limit orders via off-chain matching
- Multi-outcome markets (>2 outcomes)
- Cross-market liquidity sharing
- Concentrated liquidity ranges

---

## Success Metrics

- [ ] All unit tests pass
- [ ] Fuzz tests run 10,000+ iterations without breaking invariants
- [ ] Gas cost per trade < 150k
- [ ] Slippage < 2% for trades up to 10% of liquidity
- [ ] No high/critical findings in security review