# Runner Architecture

## Overview

The Oracle Runner is a webhook-driven service that listens for MarketCreated events from the Goldsky subgraph and automatically schedules market resolutions at the appropriate time.

## Event Flow

```
1. MarketFactory creates new market on-chain
    ↓
2. Subgraph indexes MarketCreated event  
    ↓
3. Goldsky webhook triggers runner at /webhook/market-created
    ↓
4. Runner fetches full market details from subgraph
    ↓
5. JobScheduler schedules resolution at market.resolveTime
    ↓
6. At scheduled time, ResolutionService resolves market
    ↓
7. Oracle contract records resolution on-chain
```

## Components

### WebhookServer
- Listens for MarketCreated events from Goldsky
- Verifies webhook signatures for security
- Fetches market details from subgraph GraphQL API
- Delegates scheduling to JobScheduler

### JobScheduler
- Schedules market resolutions based on resolveTime
- Uses setTimeout for delays < 24 hours
- Uses node-cron for longer delays
- Tracks all scheduled jobs
- Handles immediate resolution for past times

### ResolutionService
- Executes actual market resolution
- Fetches data from appropriate source (HyperLiquid API, price feeds, etc.)
- Evaluates market predicate
- Submits resolution to Oracle contract

### ContractService
- Interfaces with on-chain contracts
- Handles transaction signing and submission
- Manages gas estimation and retries

## API Endpoints

### Webhook Endpoints
- `POST /webhook/market-created` - Receives MarketCreated events from Goldsky

### Management Endpoints
- `GET /health` - Health check with scheduled jobs info
- `GET /jobs` - List all scheduled resolution jobs
- `POST /resolve/:marketId` - Manually trigger resolution (testing)
- `DELETE /job/:marketId` - Cancel a scheduled job

## Configuration

Key environment variables:
- `WEBHOOK_SECRET` - Secret for Goldsky webhook verification
- `WEBHOOK_PORT` - Port for webhook server (default: 3000)
- `ORACLE_ADDRESS` - On-chain Oracle contract address
- `FACTORY_ADDRESS` - MarketFactory contract address
- `RPC_URL` - Blockchain RPC endpoint
- `PRIVATE_KEY` - Resolver wallet private key

## Job Scheduling Strategy

### Immediate Resolution
- If resolveTime has already passed
- Adds 5-second delay to avoid race conditions

### Short-term Scheduling (< 24 hours)
- Uses JavaScript setTimeout
- More efficient for short delays
- Precise timing

### Long-term Scheduling (> 24 hours)
- Uses node-cron with specific datetime
- Survives process restarts if persisted
- Handles timezone considerations (UTC)

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using Goldsky's secret header
2. **Private Key Security**: Resolver private key should be kept secure and rotated regularly
3. **Rate Limiting**: Queue system prevents overwhelming the blockchain with transactions
4. **Error Handling**: Failed resolutions are logged and can be retried

## Monitoring

The runner provides several monitoring points:
- Health endpoint shows queue status and scheduled jobs
- Structured logging with pino for tracking events
- Job scheduler tracks all scheduled resolutions
- Failed resolutions are logged with full context

## Recovery & Resilience

### Process Restart
- On restart, runner should query subgraph for unresolved markets
- Re-schedule any markets that need resolution
- This can be added as a startup routine

### Failed Resolutions
- Logged with full error context
- Can be manually retried via API
- Could implement automatic retry with exponential backoff

### Missed Events
- If webhook is down, events may be missed
- Periodic sync with subgraph can catch missed markets
- Manual resolution endpoint allows recovery