# @hyper-odds/contracts

Smart contracts for the Hyper-Odds prediction market protocol on Hyperliquid.

## Setup

1. Install dependencies:
```bash
forge install
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Build
```bash
forge build
```

### Test
```bash
forge test              # Run all tests
forge test --gas-report # With gas reporting
forge test --match-test testFuzz # Fuzz tests only
forge test --match-test invariant # Invariant tests only
```

### Deploy
```bash
# Local deployment
forge script script/DeployAll.s.sol --rpc-url http://localhost:8545 --broadcast

# Testnet deployment
forge script script/DeployAll.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### Format
```bash
forge fmt
```

## Contracts

- **ParimutuelMarketImplementation**: Core market logic for binary outcome prediction markets
- **MarketFactory**: Factory for deploying markets using EIP-1167 minimal proxies
- **Oracle**: Commit-reveal oracle system for secure market resolution
- **stHYPE**: ERC4626 liquid staking token for HYPE, used as collateral for market creation

## Architecture

Markets use a parimutuel betting system where:
- Users deposit into YES or NO pools
- Winners split the losing pool proportionally to their stake
- 5% fee is taken from the losing pool (configurable)
- Markets can be resolved by the oracle after the resolution time

See the main [README](../../README.md) for more details.
