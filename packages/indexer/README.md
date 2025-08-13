# @hyper-odds/indexer

Subgraph indexer for Hyper-Odds prediction markets using Goldsky.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Install Goldsky CLI:
```bash
npm install -g @goldskycom/cli
```

3. Login to Goldsky:
```bash
pnpm login
# Paste your API key when prompted
```

## Development

### Generate TypeScript types from GraphQL schema:
```bash
pnpm codegen
```

### Build the subgraph:
```bash
pnpm build
```

## Deployment

### Deploy to production:
```bash
pnpm deploy
# Deploys as hyper-odds/1.0.0
```

### Deploy to staging:
```bash
pnpm deploy:staging
# Deploys as hyper-odds-staging/1.0.0
```

### View deployed subgraphs:
```bash
pnpm list
```

### Monitor logs:
```bash
pnpm logs
```

### Pause/Start subgraph:
```bash
pnpm pause  # Pause indexing
pnpm start  # Resume indexing
```

## Configuration

Before deploying, update the factory address in `subgraph.yaml`:
```yaml
source:
  address: "0x..." # Your deployed MarketFactory address
  startBlock: 0    # Block number where factory was deployed
```

## Entities

The subgraph tracks:
- **Markets**: All prediction markets with metadata and state
- **Users**: User profiles with stats and activity
- **Positions**: User stakes in each market
- **Deposits**: Individual deposit transactions
- **Claims**: Payout claims after resolution
- **Resolutions**: Market resolution events
- **Protocol**: Global protocol statistics

## Queries

Example queries available at the GraphQL endpoint after deployment:

### Get active markets:
```graphql
{
  markets(where: { resolved: false }) {
    id
    title
    description
    poolYes
    poolNo
    cutoffTime
  }
}
```

### Get user positions:
```graphql
{
  positions(where: { user: "0x..." }) {
    market {
      title
      resolved
      winningOutcome
    }
    stakeYes
    stakeNo
    claimed
    payout
  }
}
```
