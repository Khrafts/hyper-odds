# Market Runner Service

Autonomous market resolution service for Hyper-Odds prediction markets. This service listens to market creation events and schedules resolution jobs based on market timing parameters.

## Overview

The Market Runner:
- 📡 Listens to `MarketCreated` events from the Factory contract
- ⏰ Schedules resolution jobs based on market timing
- 🔍 Fetches real-world data from various sources (Hyperliquid, price feeds)  
- ⚡ Resolves markets by submitting data to the Oracle contract
- 🔄 Manages the complete market lifecycle from creation to resolution

## Architecture

See [docs/architecture.md](./docs/architecture.md) for detailed system architecture.

## Development

### Prerequisites

- Node.js 18+
- Redis (for job queue)
- PostgreSQL or SQLite (for data storage)
- Access to Arbitrum Sepolia RPC

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   # If using PostgreSQL
   createdb runner_db
   
   # Run migrations (once implemented)
   pnpm db:migrate
   ```

4. **Start Redis**:
   ```bash
   redis-server
   ```

5. **Start development server**:
   ```bash
   pnpm dev
   ```

### Scripts

- `pnpm build` - Build TypeScript to JavaScript
- `pnpm dev` - Start development server with hot reload
- `pnpm start` - Start production server
- `pnpm test` - Run test suite
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## Configuration

See [.env.example](./.env.example) for all available configuration options.

Key environment variables:
- `RPC_URL` - Arbitrum Sepolia RPC endpoint
- `PRIVATE_KEY` - Private key for oracle transactions
- `FACTORY_ADDRESS` - Market factory contract address
- `ORACLE_ADDRESS` - Oracle contract address
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string

## Implementation Plan

See [docs/tasks.md](./docs/tasks.md) for the detailed implementation roadmap.

## Production Deployment

### Docker

```bash
# Build image
docker build -t market-runner .

# Run container
docker run -d \
  --name market-runner \
  --env-file .env \
  -p 3000:3000 \
  market-runner
```

### Environment Setup

1. **Database**: Set up PostgreSQL with connection pooling
2. **Redis**: Configure Redis cluster for job queue reliability
3. **Monitoring**: Set up Prometheus metrics and Grafana dashboards
4. **Logging**: Configure structured logging with log aggregation
5. **Secrets**: Use secure secret management for private keys and API keys

## Monitoring

The service exposes several endpoints for monitoring:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /metrics` - Prometheus metrics
- `GET /jobs` - Job queue status

## Contributing

1. Follow the implementation tasks in [docs/tasks.md](./docs/tasks.md)
2. Write tests for all new functionality
3. Ensure TypeScript strict mode compliance
4. Add comprehensive logging for debugging
5. Update documentation for any architectural changes

## License

MIT