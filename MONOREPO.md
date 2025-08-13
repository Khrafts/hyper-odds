# Hyper-Odds Monorepo Structure

## Overview

Hyper-Odds is a decentralized prediction market protocol built for Hyperliquid, organized as a monorepo with the following packages:

```
hyper-odds/
├── packages/
│   ├── contracts/      # Smart contracts (Solidity)
│   ├── indexer/        # Subgraph for event indexing
│   ├── shared/         # Shared types and utilities
│   ├── runner/         # Oracle runner service (TODO)
│   └── frontend/       # Web application (TODO)
```

## Packages

### @hyper-odds/contracts
Smart contracts for the prediction market protocol:
- Parimutuel market implementation
- Market factory with stHYPE gating
- Oracle system with commit-reveal
- Liquid staking token (stHYPE)

**Commands:**
```bash
cd packages/contracts
forge build           # Compile contracts
forge test           # Run tests
forge fmt            # Format code
```

### @hyper-odds/indexer
TheGraph subgraph for indexing on-chain events:
- Market creation and resolution tracking
- User positions and P&L
- Protocol analytics and metrics
- Real-time data via GraphQL

**Commands:**
```bash
cd packages/indexer
pnpm codegen         # Generate TypeScript from schema
pnpm build           # Build subgraph
pnpm deploy:local    # Deploy to local node
```

### @hyper-odds/shared
Shared TypeScript types and utilities:
- Type definitions matching Solidity structs
- Contract ABIs
- Helper functions for calculations
- Constants and configurations

**Commands:**
```bash
cd packages/shared
pnpm build           # Build TypeScript
pnpm dev            # Watch mode
```

### @hyper-odds/runner (TODO)
Oracle runner service for market resolution:
- Monitor markets approaching resolution
- Fetch data from Hyperliquid API
- Submit resolutions to oracle contract
- Handle retries and error cases

### @hyper-odds/frontend (TODO)
Web application for users:
- Browse and create markets
- Place bets with intuitive UI
- Track positions and P&L
- Admin panel for protocol markets

## Development Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Build all packages:**
```bash
pnpm build
```

3. **Run tests:**
```bash
pnpm test
```

4. **Start local development:**
```bash
# Terminal 1: Start local blockchain
cd packages/contracts
anvil

# Terminal 2: Deploy contracts
cd packages/contracts
forge script script/DeployAll.s.sol --rpc-url http://localhost:8545 --broadcast

# Terminal 3: Start Graph node (requires Docker)
cd packages/indexer
docker-compose up

# Terminal 4: Deploy subgraph
cd packages/indexer
pnpm create:local
pnpm deploy:local
```

## Architecture

### Data Flow
1. Users interact with contracts via frontend
2. Contracts emit events for all state changes
3. Indexer captures events and builds queryable data
4. Frontend queries indexer for real-time data
5. Runner monitors markets and triggers resolutions

### Key Components
- **Markets**: Binary outcome prediction markets
- **stHYPE**: Liquid staking token for market creation
- **Oracle**: Commit-reveal pattern for secure resolution
- **Factory**: Deploys markets using EIP-1167 clones

## Contract Addresses

To be updated after deployment:

| Contract | Mainnet | Testnet |
|----------|---------|---------|
| stHYPE | `0x...` | `0x...` |
| Oracle | `0x...` | `0x...` |
| Factory | `0x...` | `0x...` |
| Implementation | `0x...` | `0x...` |

## Next Steps

1. **Runner Service**: Build automated oracle resolution service
2. **Frontend**: Create user interface with Next.js
3. **Testing**: Add integration tests across packages
4. **Deployment**: Deploy to Hyperliquid testnet
5. **Monitoring**: Set up analytics and alerting