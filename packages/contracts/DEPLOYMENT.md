# Contract Deployment Guide

## Prerequisites

1. **Hyperliquid Testnet**
   - RPC URL: https://api.hyperliquid-testnet.xyz/evm
   - Chain ID: 998
   - Get testnet HYPE from faucet

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Deployment Steps

### 1. Deploy Mock Tokens (Testnet Only)
```bash
forge script script/DeployMocks.s.sol --rpc-url $RPC_URL --broadcast
```

### 2. Deploy Core Contracts
```bash
forge script script/DeployAll.s.sol --rpc-url $RPC_URL --broadcast --verify
```

This deploys:
- stHYPE (Liquid staking token)
- Oracle (Commit-reveal oracle)
- MarketFactory (Factory with implementation)

### 3. Verify Deployment
```bash
forge script script/VerifyDeployment.s.sol --rpc-url $RPC_URL
```

### 4. Create Test Market
```bash
forge script script/CreateMarket.s.sol --rpc-url $RPC_URL --broadcast
```

### 5. Interact with Market
```bash
# Deposit to YES position
forge script script/Deposit.s.sol --rpc-url $RPC_URL --broadcast

# Check market state
cast call $MARKET_ADDRESS "poolYes()" --rpc-url $RPC_URL
cast call $MARKET_ADDRESS "poolNo()" --rpc-url $RPC_URL
```

## Post-Deployment

Save the deployed addresses:
```json
{
  "stHYPE": "0x...",
  "Oracle": "0x...",
  "MarketFactory": "0x...",
  "MarketImplementation": "0x..."
}
```

Update these addresses in:
- `packages/indexer/subgraph.yaml`
- `packages/runner/.env`
- `packages/frontend/.env`

## Mainnet Deployment

For mainnet:
1. Use real WHYPE and USDC addresses
2. Set proper treasury and resolver addresses
3. Consider using multisig for admin functions
4. Audit contracts before deployment