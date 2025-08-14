# Runner Deployment Guide

## Prerequisites

1. **Deployed Contracts**
   - Oracle address
   - Factory address (for reference)

2. **Goldsky Webhook**
   - Webhook configured in indexer
   - Webhook secret

3. **Resolver Account**
   - Private key with HYPE for gas
   - Added as resolver in Oracle contract

## Local Development

### 1. Configure Environment
```bash
cp .env.example .env
vim .env
```

Set actual values:
```env
# Testnet
RPC_URL=https://api.hyperliquid-testnet.xyz/evm
PRIVATE_KEY=your_resolver_private_key

# Contract addresses from deployment
ORACLE_ADDRESS=0x...
FACTORY_ADDRESS=0x...

# Webhook configuration
WEBHOOK_PORT=3000
WEBHOOK_SECRET=same_as_goldsky_webhook_secret
```

### 2. Install & Build
```bash
pnpm install
pnpm build
```

### 3. Run Locally
```bash
# Development with hot reload
pnpm dev

# Production
pnpm start
```

### 4. Expose Local Server
For testing webhooks locally, use ngrok:
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Expose local port
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Update Goldsky webhook URL:
```bash
goldsky subgraph webhook update hyper-odds-testnet/1.0.0 \
  --name market-resolver \
  --url https://abc123.ngrok.io/webhook/market
```

## Production Deployment

### Option 1: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
```

### Option 2: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

```bash
docker build -t hyper-odds-runner .
docker run -p 3000:3000 --env-file .env hyper-odds-runner
```

### Option 3: VPS (Ubuntu)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repo>
cd packages/runner
npm install --production
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name hyper-odds-runner
pm2 save
pm2 startup
```

## Health Monitoring

### Check Service Health
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "queueSize": 0,
  "queuePending": 0
}
```

### Manual Market Resolution (Testing)
```bash
curl -X POST http://localhost:3000/resolve/0xMARKET_ADDRESS
```

## Logs & Debugging

### View Logs
```bash
# Development
LOG_LEVEL=debug pnpm dev

# Production with PM2
pm2 logs hyper-odds-runner

# Docker
docker logs <container-id>
```

### Common Issues

1. **Webhook not received**
   - Check ngrok is running
   - Verify webhook secret matches
   - Check Goldsky webhook status

2. **Resolution fails**
   - Verify resolver has HYPE for gas
   - Check resolver is authorized in Oracle
   - Ensure market resolve time has passed

3. **Connection errors**
   - Verify RPC URL is correct
   - Check network connectivity
   - Ensure private key is valid

## Security Checklist

- [ ] Use strong webhook secret
- [ ] Keep private keys secure (use secrets manager)
- [ ] Set up rate limiting
- [ ] Monitor for unusual activity
- [ ] Regular security updates
- [ ] Use HTTPS in production