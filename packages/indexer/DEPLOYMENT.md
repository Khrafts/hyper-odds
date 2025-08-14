# Indexer Deployment Guide

## Prerequisites

1. **Goldsky Account**
   - Sign up at https://goldsky.com
   - Get API key from dashboard

2. **Deployed Contracts**
   - MarketFactory address from contracts deployment
   - Block number of deployment

## Deployment Steps

### 1. Configure Subgraph
```bash
# Update subgraph.yaml with actual values
vim subgraph.yaml
```

Update:
```yaml
source:
  address: "0xYOUR_FACTORY_ADDRESS"
  startBlock: YOUR_DEPLOYMENT_BLOCK
```

### 2. Install Goldsky CLI
```bash
npm install -g @goldskycom/cli
```

### 3. Login to Goldsky
```bash
pnpm login
# Enter your API key when prompted
```

### 4. Build Subgraph
```bash
pnpm codegen  # Generate TypeScript types
pnpm build    # Compile subgraph
```

### 5. Deploy to Goldsky
```bash
# For testnet
goldsky subgraph deploy hyper-odds-testnet/1.0.0

# For mainnet
goldsky subgraph deploy hyper-odds/1.0.0
```

### 6. Create Webhook for Runner
```bash
goldsky subgraph webhook create hyper-odds-testnet/1.0.0 \
  --name market-resolver \
  --url https://your-runner-url/webhook/market \
  --entity Market \
  --secret your-secure-webhook-secret
```

## Monitoring

### View Deployment Status
```bash
goldsky subgraph list
```

### Check Logs
```bash
goldsky subgraph log hyper-odds-testnet/1.0.0
```

### Query Subgraph
Your GraphQL endpoint will be:
```
https://api.goldsky.com/api/public/project_YOUR_PROJECT/subgraphs/hyper-odds-testnet/1.0.0/gn
```

Example query:
```graphql
{
  markets(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    title
    poolYes
    poolNo
    resolved
    winningOutcome
  }
}
```

## Troubleshooting

### Subgraph Not Indexing
- Verify factory address is correct
- Check start block is before first transaction
- Ensure ABI files match deployed contracts

### Webhook Not Working
- Verify webhook URL is accessible
- Check secret matches in runner
- View webhook logs in Goldsky dashboard

### Re-deployment
```bash
# Delete existing deployment
goldsky subgraph delete hyper-odds-testnet/1.0.0

# Deploy fresh version
goldsky subgraph deploy hyper-odds-testnet/1.0.1
```