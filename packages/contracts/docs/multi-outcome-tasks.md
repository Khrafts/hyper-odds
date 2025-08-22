# Multi-Outcome Parimutuel Market Implementation Tasks

> Parimutuel betting system for prediction markets with 3-8 possible outcomes
> Winner-takes-all pooling with proportional payouts based on stake distribution

---

## Design Principles

1. **Simplicity First**: Extend proven parimutuel model to multiple outcomes
2. **Gas Efficient**: Minimal overhead compared to binary parimutuel markets
3. **Flexible Outcomes**: Support 3-8 outcomes per market with clear labeling
4. **Winner Takes All**: Only one outcome can win, winners split all losing pools
5. **Familiar UX**: Same deposit/claim flow as binary, just with outcome selection

---

## Core Formula & Logic

**Parimutuel Formula**: Winners split all losing pools proportionally
- Total Pool = sum of all outcome pools
- Losing Pool = Total Pool - Winning Pool  
- Payout Ratio = Losing Pool / Winning Pool
- User Payout = User Stake × (1 + Payout Ratio) - Fees

**Example**:
- 4 outcomes: [Team A: $1000, Team B: $500, Team C: $300, Team D: $200]
- Total Pool: $2000, Team A wins
- Losing Pool: $500 + $300 + $200 = $1000
- Payout Ratio: $1000 / $1000 = 1.0 (2x return)
- User with $100 on Team A gets: $100 × (1 + 1.0) = $200

**Critical Invariants**:
1. Sum of all payouts ≤ total pool collected
2. Only resolved markets can distribute payouts
3. Each user can only claim once
4. Outcome indices must be valid (0 to outcomeCount-1)

---

## Phase 1: Core Multi-Outcome Contract

### Task 1.1: Create MultiOutcomeParimutuelMarketImplementation.sol skeleton
- **Start**: Empty file  
- **End**: Contract structure with multi-outcome state variables
- **Key Storage**:
  - uint8 outcomeCount (3-8 outcomes allowed)
  - string[] outcomeLabels (human-readable outcome names)
  - mapping(uint8 => uint256) pools (outcome index => pool amount)
  - mapping(address => mapping(uint8 => uint256)) stakes (user => outcome => stake)
  - mapping(address => bool) claimed (prevent double claims)
  - uint8 winningOutcome (set on resolution)
  - uint256 totalFeesCollected
  - bool initialized, resolved
- **Inheritance**: Same base as ParimutuelMarketImplementation
- **Security**: No constructor, only initializer pattern

### Task 1.2: Implement initialize() with outcome validation
- **Start**: Skeleton exists
- **End**: Market initialized with validated outcomes
- **Requirements**:
  - Accept outcomeLabels parameter (3-8 outcomes)
  - Validate outcome uniqueness and non-empty labels
  - Set outcomeCount = outcomeLabels.length
  - Initialize all pools to zero
  - Emit MarketInitialized event with outcome labels
- **Security Checks**:
  - Require not initialized
  - Require msg.sender == factory
  - Require 3 ≤ outcomeCount ≤ 8
  - Require unique, non-empty outcome labels
  - Validate all addresses non-zero

### Task 1.3: Implement deposit() for specific outcomes
- **Start**: Initialized market
- **End**: Users can deposit on any outcome
- **Function**: `deposit(uint8 outcomeIndex, uint256 amount)`
- **Flow**:
  1. Validate outcomeIndex < outcomeCount
  2. Transfer tokens from user
  3. Update pools[outcomeIndex] += amount
  4. Update stakes[user][outcomeIndex] += amount
  5. Emit Deposited event with outcomeIndex
- **Security**:
  - Require not resolved
  - Require before cutoffTime
  - Require valid outcomeIndex
  - Require amount > minimum
  - Reentrancy guard

### Task 1.4: Implement getPoolInfo() view functions
- **Start**: Deposit function ready
- **End**: Complete pool information available
- **Functions**:
  - `getPoolBalance(uint8 outcomeIndex) → uint256`
  - `getTotalPool() → uint256`
  - `getAllPools() → uint256[]`
  - `getOutcomeLabels() → string[]`
  - `getUserStake(address user, uint8 outcomeIndex) → uint256`
  - `getUserTotalStake(address user) → uint256`
- **Security**: Pure view functions, no state changes

### Task 1.5: Implement calculatePayout() for resolution preview
- **Start**: Pool info functions ready
- **End**: Can preview payouts before resolution
- **Function**: `calculatePayout(uint8 winningOutcomeIndex, address user) → uint256`
- **Logic**:
  - Calculate total pool and losing pool
  - Apply fee deduction
  - Calculate proportional payout for user's winning stake
  - Return 0 if user has no stake in winning outcome
- **Security**: Pure calculation, no state changes

### Task 1.6: Implement claim() for multi-outcome resolution
- **Start**: Payout calculation ready
- **End**: Winners can claim proportional payouts
- **Flow**:
  1. Verify market resolved
  2. Calculate user's payout from winning outcome
  3. Verify user hasn't claimed
  4. Mark user as claimed
  5. Transfer payout
  6. Distribute fees on first claim
- **Security**:
  - Require resolved
  - Require user has winning stake
  - Prevent double claims
  - Safe fee extraction

---

## Phase 2: Factory Integration

### Task 2.1: Update MarketFactory for multi-outcome
- **Start**: Current factory supports PARIMUTUEL and CPMM
- **End**: Factory can deploy MULTI_PARIMUTUEL type
- **Changes**:
  - Add `MULTI_PARIMUTUEL` to MarketType enum
  - Add multiOutcomeImplementation address
  - Add createMultiOutcomeMarket() function
  - Validate outcome labels and count
- **Security**: Thorough outcome validation

### Task 2.2: Add outcome validation logic
- **Start**: Factory accepts multi-outcome type
- **End**: Robust outcome validation
- **Requirements**:
  - 3 ≤ outcomeCount ≤ 8
  - Unique outcome labels (case-insensitive)
  - Non-empty labels (trim whitespace)
  - Reasonable label length (≤ 50 characters)
  - No special characters that break UI
- **Security**: Prevent malicious or malformed outcomes

### Task 2.3: Update events and tracking
- **Start**: Basic multi-outcome creation
- **End**: Full event tracking with outcomes
- **Updates**:
  - MarketCreated event includes outcomeLabels
  - Track market type for proper template creation
  - Maintain backward compatibility with existing events
- **Security**: Consistent event emission

---

## Phase 3: Advanced Features

### Task 3.1: Add outcome probability calculation
- **Start**: Basic pools working
- **End**: Real-time probability display
- **Functions**:
  - `getOutcomeProbabilities() → uint256[]` (in basis points)
  - Calculate probability as pool_i / total_pool * 10000
  - Handle edge cases (zero pools, single pool)
- **Security**: Safe division, handle edge cases

### Task 3.2: Add partial claim functionality
- **Start**: Basic claim working
- **End**: Users can claim specific outcomes (future enhancement)
- **Note**: For future if we want to support partial wins
- **Security**: Prevent claim manipulation

### Task 3.3: Add emergency pause for multi-outcome
- **Start**: Core functionality complete
- **End**: Owner can pause deposits
- **Security**: Only pause deposits, not claims

### Task 3.4: Add outcome merging (advanced)
- **Start**: Basic functionality complete
- **End**: Ability to merge similar outcomes pre-resolution
- **Use Case**: Typos, duplicate outcomes discovered
- **Security**: Only before deposits, with strict validation

---

## Phase 4: Testing

### Task 4.1: Unit tests for multi-outcome logic
- Test outcome validation (labels, count, uniqueness)
- Test deposit distribution across outcomes
- Test payout calculations with various scenarios
- Test edge cases (single winner, zero stakes)

### Task 4.2: Integration tests with factory
- Full lifecycle: create → deposit → resolve → claim
- Multiple users across different outcomes
- Fee distribution correctness
- Event emission verification

### Task 4.3: Gas optimization testing
- Compare gas costs vs binary parimutuel
- Optimize for common outcome counts (3-4 outcomes)
- Batch operations where possible

### Task 4.4: Security scenarios
- Malicious outcome labels
- Invalid outcome indices
- Double claiming attempts
- Front-running resolution

---

## Phase 5: Indexer Integration

### Task 5.1: Extend GraphQL schema
- Add outcomeCount, outcomeLabels to Market entity
- Add outcomePools array field
- Extend Position entity with outcomeStakes array
- Add MultiOutcomeDeposited event entity

### Task 5.2: Create multi-outcome template
- New MultiOutcomeParimutuelMarket template
- Event handlers for multi-outcome events
- Probability calculation in indexer
- Array field management

### Task 5.3: Update factory handler
- Detect MULTI_PARIMUTUEL market type
- Create appropriate template
- Initialize outcome-specific fields
- Maintain backward compatibility

---

## Phase 6: Frontend Integration

### Task 6.1: Multi-outcome market creation UI
- Outcome builder interface
- Add/remove outcomes (3-8 limit)
- Label validation and preview
- Market preview with mock probabilities

### Task 6.2: Multi-outcome trading interface
- Outcome selector (dropdown or buttons)
- Probability display for all outcomes
- Stake distribution visualization
- Current position across outcomes

### Task 6.3: Multi-outcome market detail page
- Outcome probability chart
- Trading history by outcome
- User position breakdown
- Payout calculator

---

## Critical Security Considerations

1. **Outcome Validation**: Strict validation prevents UI/calculation issues
2. **Index Bounds**: Always validate outcomeIndex < outcomeCount
3. **Integer Arithmetic**: Safe math for payout calculations
4. **Claim Prevention**: Robust double-claim protection
5. **Fee Distribution**: Ensure fees don't exceed collected amounts
6. **Resolution Validation**: Only oracle can resolve with valid outcome
7. **Gas Limits**: Reasonable outcome limits prevent DoS
8. **Front-running**: Same protections as binary markets
9. **Initialization**: One-time only, through factory only
10. **State Consistency**: Maintain invariants across all operations

---

## Example Market Scenarios

### Scenario 1: Sports Match (4 outcomes)
- **Outcomes**: ["Team A Wins", "Team B Wins", "Draw", "Match Cancelled"]
- **Pools**: [$5000, $3000, $1500, $500] = $10,000 total
- **Resolution**: "Team A Wins"
- **Losing Pool**: $3000 + $1500 + $500 = $5000
- **Payout Ratio**: $5000 / $5000 = 1.0 (2x return)

### Scenario 2: Election (5 outcomes)  
- **Outcomes**: ["Candidate A", "Candidate B", "Candidate C", "Candidate D", "Other"]
- **Pools**: [$8000, $6000, $4000, $1500, $500] = $20,000 total
- **Resolution**: "Candidate B" 
- **Losing Pool**: $8000 + $4000 + $1500 + $500 = $14,000
- **Payout Ratio**: $14,000 / $6000 = 2.33 (3.33x return)

### Scenario 3: Price Range (6 outcomes)
- **Outcomes**: ["< $100", "$100-200", "$200-300", "$300-400", "$400-500", "> $500"]
- **Even Distribution**: Each outcome gets similar pool sizes
- **Resolution**: Based on oracle price data at resolution time

---

## Success Metrics

- [ ] All unit tests pass
- [ ] Gas cost per deposit < 80k (reasonable overhead vs binary)
- [ ] Support 3-8 outcomes without issues
- [ ] Payout calculations are mathematically correct
- [ ] No high/critical findings in security review
- [ ] Indexer correctly tracks all outcome data
- [ ] Frontend provides smooth multi-outcome UX

---

## Future Enhancements (Not in MVP)

- **Partial Outcomes**: Some outcomes can partially win
- **Dynamic Outcomes**: Add/remove outcomes during betting period
- **Outcome Categories**: Group related outcomes together
- **Conditional Markets**: Outcomes depend on other market results
- **Cross-Market Arbitrage**: Link related multi-outcome markets
- **Advanced Analytics**: Outcome correlation tracking

---

## Implementation Priority

1. **Phase 1**: Core contract (highest priority)
2. **Phase 2**: Factory integration (critical for deployment)
3. **Phase 4**: Testing (essential for security)
4. **Phase 5**: Indexer (needed for frontend)
5. **Phase 6**: Frontend (user-facing features)
6. **Phase 3**: Advanced features (nice-to-have)

This modular approach ensures we can deliver a working multi-outcome system incrementally while maintaining security and reliability.