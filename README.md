# Hyperliquid Parimutuel Prediction Markets

A decentralized prediction market protocol built for Hyperliquid, featuring parimutuel (pool-based) betting mechanics and stHYPE-gated market creation.

## Overview

This protocol enables users to create and participate in binary outcome prediction markets about Hyperliquid metrics (volume, price, TVL) and other events. Markets use a parimutuel system where winners share the losing pool proportionally, minus protocol fees.

### Key Features

- **Parimutuel Markets**: Pool-based betting with pro-rata payouts to winners
- **stHYPE Gating**: Market creators must lock 1000 stHYPE tokens to prevent spam
- **Flexible Predicates**: Support for various comparison operators (>, <, =, etc.)
- **On-chain Oracle**: Commit-reveal pattern with dispute window for secure resolution
- **Protocol Markets**: Special markets created by protocol without stHYPE requirement
- **EIP-2612 Permits**: Gasless approvals for improved UX

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   stHYPE    │────▶│MarketFactory │────▶│   Market   │
│   (LST)     │     │  (EIP-1167)  │     │  (Clone)   │
└─────────────┘     └──────────────┘     └────────────┘
                            │                    │
                            ▼                    ▼
                    ┌──────────────┐     ┌────────────┐
                    │SimpleOracle  │────▶│  Treasury  │
                    │(Commit/Rev.) │     │   (Fees)   │
                    └──────────────┘     └────────────┘
```

## Usage

### Setup

1. Clone the repository and install dependencies:
```bash
forge install
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Deploy Protocol

Deploy the complete protocol infrastructure:

```bash
# 1. Deploy stHYPE (Liquid Staking Token)
forge script script/DeployStHYPE.s.sol --rpc-url $RPC_URL --broadcast

# 2. Deploy Oracle
forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --broadcast

# 3. Deploy Factory and Implementation
forge script script/DeployFactory.s.sol --rpc-url $RPC_URL --broadcast
```

### Create Markets

#### User Market (requires stHYPE)
```bash
forge script script/CreateMarket.s.sol --rpc-url $RPC_URL --broadcast
```

#### Protocol Market (no stHYPE required)
```bash
forge script script/CreateProtocolMarket.s.sol --rpc-url $RPC_URL --broadcast
```

### Market Lifecycle

1. **Create Market**: Define subject, predicate, window, and economics
2. **Deposit Phase**: Users bet on YES (1) or NO (0) outcomes
3. **Cutoff Time**: Deposits close before market window ends
4. **Resolution**: Oracle commits outcome after window.tEnd
5. **Dispute Window**: 10-minute period for challenging resolution
6. **Claim Payouts**: Winners claim proportional share of total pool

### Market Parameters

#### Subject Types
- `HL_METRIC`: Hyperliquid metrics (volume, price, TVL)
- `TOKEN_PRICE`: Any token price in USD
- `GENERIC`: Custom numeric values

#### Predicate Operations
- `GT`: Greater than threshold
- `GTE`: Greater than or equal
- `LT`: Less than threshold
- `LTE`: Less than or equal
- `EQ`: Equal to threshold
- `NEQ`: Not equal to threshold

#### Window Types
- `SNAPSHOT_AT`: Single point in time (window.tEnd)
- `TIME_AVERAGE`: Average over [tStart, tEnd]
- `EXTREMUM`: Min/max value in window

### Example: Create Volume Market

```solidity
MarketParams memory params = MarketParams({
    title: "Hyperliquid Daily Volume > $1B",
    description: "Will HL 24h volume exceed $1 billion?",
    subject: SubjectParams({
        kind: SubjectKind.HL_METRIC,
        metricId: keccak256("daily_volume"),
        token: address(0),
        valueDecimals: 18
    }),
    predicate: PredicateParams({
        op: PredicateOp.GT,
        threshold: 1_000_000_000e18
    }),
    window: WindowParams({
        kind: WindowKind.SNAPSHOT_AT,
        tStart: block.timestamp,
        tEnd: block.timestamp + 1 days
    }),
    oracle: OracleSpec({
        primarySourceId: keccak256("hyperliquid_api"),
        fallbackSourceId: keccak256("coingecko"),
        roundingDecimals: 0
    }),
    cutoffTime: block.timestamp + 20 hours,
    creator: msg.sender,
    econ: Economics({
        feeBps: 500, // 5%
        creatorFeeShareBps: 1000, // 10% of fees
        maxTotalPool: 10000e18
    }),
    isProtocolMarket: false
});
```

## Testing

Run the complete test suite:

```bash
# All tests
forge test

# Specific test file
forge test --match-contract MarketTest

# With gas reporting
forge test --gas-report

# Fuzz tests with more runs
forge test --match-test testFuzz -vvv
```

## Risk Considerations

### Oracle Risk
- Markets rely on trusted resolvers to commit accurate outcomes
- 10-minute dispute window allows challenging incorrect resolutions
- Protocol owner can assign/revoke resolver permissions

### Market Mechanics
- **No Liquidity Guarantees**: Parimutuel markets may have imbalanced pools
- **Winner-Take-All**: If only one side has bets, they get refunded (no profit)
- **Front-running Protection**: Cutoff time prevents last-minute manipulation
- **Pool Caps**: Markets have maximum total pool limits to manage risk

### Emergency Controls
- Markets can be paused by owner to prevent deposits
- Cancel function allows full refunds before resolution
- stHYPE stakes are only released after market resolution

### Fee Structure
- Fixed 5% fee on losing pool
- 90% to protocol treasury, 10% to market creator
- Fees collected once on first claim
- No fees if market is one-sided

### Edge Cases
- **Tie Handling**: Exact equality uses EQ predicate, not automatic tie
- **Decimal Precision**: Different tokens may have different decimal places
- **Gas Limits**: Large number of claimers may require batching
- **Time Dependencies**: All times are Unix timestamps (seconds)

## Scripts Reference

| Script | Purpose | Required Role |
|--------|---------|--------------|
| DeployStHYPE.s.sol | Deploy stHYPE LST | Owner |
| DeployOracle.s.sol | Deploy oracle contract | Owner |
| DeployFactory.s.sol | Deploy factory & implementation | Owner |
| CreateMarket.s.sol | Create user market (needs stHYPE) | Any user |
| CreateProtocolMarket.s.sol | Create protocol market | Owner |
| PauseAndCancel.s.sol | Emergency market controls | Owner |

## Contract Addresses

Update after deployment:

| Contract | Address |
|----------|---------|
| stHYPE | `0x...` |
| Oracle | `0x...` |
| Factory | `0x...` |
| Implementation | `0x...` |
| Treasury | `0x...` |

## Security

This protocol has not been audited. Use at your own risk.

Key security features:
- Reentrancy guards on all state-changing functions
- Pausable markets for emergency response
- Time-based access controls
- Overflow protection via Solidity 0.8.20
- Clone pattern prevents implementation tampering

## License

MIT