# @hyper-odds/runner

Webhook-driven oracle runner service for automated market resolution in Hyper-Odds prediction markets.

## Overview

The runner service receives webhooks from Goldsky when market events occur and automatically resolves markets by:
1. Receiving webhook notifications for market updates
2. Checking if markets are ready for resolution
3. Retrieving actual values from Hyperliquid API
4. Evaluating predicates to determine outcomes
5. Submitting resolutions to the Oracle contract
6. Finalizing resolutions after the dispute window

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your resolver private key and contract addresses
```

3. Build the service:
```bash
pnpm build
```

4. Configure Goldsky webhook:
```bash
# From the indexer package
goldsky subgraph webhook create hyper-odds/1.0.0 \
  --name market-resolver \
  --url http://your-runner-url:3000/webhook/market \
  --entity Market \
  --secret your-webhook-secret
```

## Running

### Development mode (with hot reload):
```bash
pnpm dev
```

### Production mode:
```bash
pnpm start
```

## Configuration

Key environment variables:
- `PRIVATE_KEY`: Resolver account private key
- `ORACLE_ADDRESS`: Deployed Oracle contract address
- `FACTORY_ADDRESS`: Deployed MarketFactory address
- `WEBHOOK_PORT`: Port for webhook server (default: 3000)
- `WEBHOOK_SECRET`: Secret for webhook signature verification
- `BATCH_SIZE`: Max parallel market resolutions (default: 10)

## Architecture

### Components

1. **WebhookServer**: HTTP server that receives Goldsky webhooks
2. **ResolutionService**: Core logic for evaluating and resolving markets
3. **ContractService**: Handles blockchain interactions
4. **HyperliquidAPI**: Retrieves metric values and token prices

### Webhook Flow

1. **Receive Webhook**: Goldsky sends webhook when Market entity changes
2. **Verify Signature**: Validate webhook authenticity using HMAC-SHA256
3. **Check Resolution Criteria**:
   - Market not resolved
   - Market not cancelled
   - Current time past resolve time
   - Market has participants
4. **Queue Resolution**: Add market to processing queue
5. **Execute Resolution**: Fetch data, evaluate, and submit to oracle

### Endpoints

- `GET /health`: Health check and queue status
- `POST /webhook/market`: Goldsky webhook endpoint
- `POST /resolve/:marketId`: Manual resolution trigger (testing)

### Data Sources

- **HL_METRIC**: Hyperliquid protocol metrics (TVL, volume, etc.)
- **TOKEN_PRICE**: Token prices from Hyperliquid
- **GENERIC**: Custom data sources via IPFS/external APIs

## Monitoring

The service logs all operations with structured logging:
```bash
# View logs in development
pnpm dev

# Production logs with specific level
LOG_LEVEL=debug pnpm start
```

Key log events:
- Webhook received and processed
- Market resolution attempts
- Transaction submissions
- API calls and responses
- Error conditions and retries

## Error Handling

- Automatic retry with exponential backoff
- Graceful shutdown on SIGINT/SIGTERM
- Transaction gas estimation with multiplier
- Rate limiting for concurrent operations
- Webhook signature verification

## Security

- Private key never logged
- Webhook signatures verified
- Validates all inputs with Zod schemas
- Only resolver account can submit resolutions
- Dispute window prevents immediate finalization

## Goldsky Integration

The runner is designed to work with Goldsky webhooks:

1. **Entity Tracking**: Monitors Market entity changes
2. **Event Types**: INSERT, UPDATE, DELETE operations
3. **Payload Structure**: Includes old/new entity data
4. **Signature Verification**: HMAC-SHA256 with shared secret

Example webhook payload:
```json
{
  "op": "UPDATE",
  "data_source": "hyper-odds/1.0.0",
  "data": {
    "old": { /* previous market state */ },
    "new": { /* current market state */ }
  },
  "webhook_name": "market-resolver",
  "webhook_id": "unique-id",
  "entity": "Market"
}
```