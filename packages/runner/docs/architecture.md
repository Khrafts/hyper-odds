# **Hyperliquid Prediction Markets — Oracle Runner Service Architecture**

> Event-driven oracle service that automatically resolves prediction markets by fetching external data and executing smart contract calls.

---

## **0. Tech Stack & Dependencies**

- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js for HTTP endpoints
- **Blockchain:** ethers.js v6 for smart contract interaction
- **Data Sources:** Hyperliquid API for market data and metrics
- **Scheduling:** node-cron for time-based job execution
- **Queue Management:** p-queue for controlled concurrency
- **Configuration:** Environment variables with Zod validation
- **Logging:** Pino for structured logging
- **Monitoring:** Health check endpoints and metrics collection

---

## **1. Service Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Runner Service                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ EventListener│ -> │  JobScheduler   │ -> │ResolutionSvc│  │
│  │             │    │                 │    │             │  │
│  │ - Market    │    │ - Cron Jobs     │    │ - Data Fetch│  │
│  │   Created   │    │ - Queue Mgmt    │    │ - Oracle    │  │
│  │ - Webhook   │    │ - Job Tracking  │    │   Calls     │  │
│  │   Server    │    │                 │    │             │  │
│  └─────────────┘    └─────────────────┘    └─────────────┘  │
│           │                   │                     │       │
│           v                   v                     v       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            External Integrations Layer                 │ │
│  │                                                         │ │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │
│  │ │ContractSvc  │  │HyperliquidAPI│ │  Smart Contract │  │ │
│  │ │             │  │             │  │                 │  │ │
│  │ │ - Oracle    │  │ - Price Data│  │ - SimpleOracle  │  │ │
│  │ │   Contract  │  │ - Metrics   │  │ - Market Impl   │  │ │
│  │ │ - Wallet    │  │ - API Client│  │ - Factory       │  │ │
│  │ │   Mgmt      │  │             │  │                 │  │ │
│  │ └─────────────┘  └─────────────┘  └─────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## **2. Core Services & Responsibilities**

### **2.1 EventListener Service**

**Role:** Listen for market creation events and schedule resolution jobs.

- **Data Sources:**
  - Goldsky webhook endpoints (primary)
  - Direct blockchain event listening (fallback)
  - HTTP webhook server for external triggers
- **Key Functions:**
  - `start()` - Initialize webhook server and event subscriptions
  - `stop()` - Graceful shutdown with cleanup
  - `handleMarketCreated(event)` - Process new market events
  - `validateEvent(data)` - Event data validation with Zod
- **State:**
  - Active webhook subscriptions
  - Event processing queue
  - Connection health status
- **Events Emitted:**
  - Market creation notifications to JobScheduler
  - Health status updates

### **2.2 JobScheduler Service**

**Role:** Manage scheduled resolution jobs with retry logic and persistence.

- **State:**
  - `Map<string, ScheduledJob>` active jobs by market ID
  - Job execution queue (p-queue for concurrency control)
  - Retry configurations per job type
- **Key Functions:**
  - `scheduleJob(marketId, resolveTime, marketParams)` - Schedule new resolution
  - `cancelJob(marketId)` - Cancel pending job
  - `getScheduledJobs()` - Get all active jobs for monitoring
  - `executeJob(marketId)` - Execute resolution with retry logic
  - `destroy()` - Cleanup all jobs and timers
- **Job Types:**
  - Time-based resolution (cron scheduling)
  - Event-driven resolution (immediate execution)
  - Retry jobs (failed resolution attempts)
- **Persistence Requirements:**
  - Job state should survive service restarts
  - Failed jobs should be retried with exponential backoff
  - Completed jobs should be logged for audit

### **2.3 ResolutionService Service**

**Role:** Core business logic for market resolution and data fetching.

- **Key Functions:**
  - `resolveMarket(marketId)` - Main resolution orchestration
  - `fetchMarketData(marketParams)` - Get data from external sources
  - `evaluatePredicate(data, predicate)` - Apply market logic
  - `submitResolution(marketId, outcome, dataHash)` - Submit to blockchain
- **Data Flow:**
  1. Parse market parameters (Subject × Predicate × Window)
  2. Fetch required data from appropriate sources
  3. Apply predicate logic to determine outcome
  4. Generate data hash for verification
  5. Submit commit transaction to oracle
  6. Wait dispute window
  7. Submit finalize transaction
- **Error Handling:**
  - Network failures (retry with backoff)
  - Invalid data responses (fallback sources)
  - Transaction failures (gas estimation, resubmission)
  - Oracle contract failures (emergency handling)

### **2.4 ContractService Service**

**Role:** Blockchain interaction layer with wallet management.

- **State:**
  - ethers.js provider connection
  - Wallet instance with private key
  - Contract instances (Oracle, Factory, Markets)
  - Transaction nonce management
- **Key Functions:**
  - `commitResolution(marketId, outcome, dataHash)` - Submit commit transaction
  - `finalizeResolution(marketId)` - Submit finalize transaction
  - `getMarketDetails(marketId)` - Read market parameters
  - `estimateGas(txData)` - Gas estimation with safety margins
  - `waitForTransaction(txHash)` - Transaction confirmation
- **Transaction Management:**
  - Nonce tracking and collision avoidance
  - Gas price optimization (EIP-1559)
  - Transaction replacement (RBF) for stuck transactions
  - Receipt validation and error parsing

### **2.5 HyperliquidAPI Service**

**Role:** External data source integration for Hyperliquid metrics.

- **Key Functions:**
  - `getTokenPrice(token, timestamp?)` - Current/historical price data
  - `getVolumeMetrics(timeWindow)` - Trading volume in time periods
  - `getUserMetrics(address)` - User-specific trading metrics
  - `getMarketData(pair)` - Market depth, spreads, liquidity
- **Data Types Supported:**
  - Token prices (HYPE, USDC, etc.)
  - Trading volumes (24h, 7d, custom windows)
  - User trading statistics
  - Market liquidity metrics
- **Caching Strategy:**
  - Short-term cache (1-5 minutes) for frequently accessed data
  - Historical data caching for snapshot queries
  - Cache invalidation on API errors
- **Fallback Mechanisms:**
  - Multiple API endpoint failover
  - Data source redundancy
  - Graceful degradation with partial data

---

## **3. Market Resolution Logic**

### **3.1 Subject × Predicate × Window Model**

The runner implements the same **Subject × Predicate × Window** model as defined in the contracts:

#### **Subject Types:**
- `HL_METRIC` - Hyperliquid trading metrics (volume, user stats)
- `TOKEN_PRICE` - Token price data (HYPE, stablecoins)

#### **Predicate Operations:**
- `GT/GTE/LT/LTE` - Numerical comparisons with threshold values

#### **Window Types:**
- `SNAPSHOT_AT` - Value at specific timestamp
- `WINDOW_SUM` - Aggregate sum over time period  
- `WINDOW_COUNT` - Count events in time period

### **3.2 Resolution Process**

```typescript
interface ResolutionFlow {
  // 1. Parse market parameters
  parseMarketParams(marketId: string): MarketParams
  
  // 2. Fetch data based on subject type
  fetchData(subject: SubjectParams, window: WindowParams): Promise<BigInt>
  
  // 3. Apply predicate logic
  evaluatePredicate(value: BigInt, predicate: PredicateParams): boolean
  
  // 4. Generate verification data
  generateDataHash(value: BigInt, sources: string[]): string
  
  // 5. Submit to blockchain
  submitCommit(marketId: string, outcome: 0|1, dataHash: string): Promise<string>
  
  // 6. Wait dispute window
  waitDisputeWindow(commitTime: number): Promise<void>
  
  // 7. Finalize resolution
  submitFinalize(marketId: string): Promise<string>
}
```

### **3.3 Data Hash Generation**

For verification and dispute resolution:

```typescript
interface DataProof {
  value: string;           // The resolved value
  timestamp: number;       // When data was fetched
  sources: string[];       // API endpoints used
  metadata: {
    subject: SubjectParams;
    predicate: PredicateParams;
    window: WindowParams;
    apiResponses: object[];  // Raw API responses for verification
  }
}

// Hash = keccak256(JSON.stringify(dataProof))
```

---

## **4. Configuration & Environment**

### **4.1 Environment Variables**

```bash
# Blockchain Configuration
RPC_URL=https://api.hyperliquid-testnet.xyz/evm
PRIVATE_KEY=0x...                    # Oracle resolver private key
ORACLE_ADDRESS=0x...                 # SimpleOracle contract address
FACTORY_ADDRESS=0x...                # MarketFactory contract address

# API Configuration  
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz/info
API_TIMEOUT=30000                    # API request timeout (ms)
API_RETRY_COUNT=3                    # Number of API retries

# Service Configuration
WEBHOOK_PORT=3001                    # HTTP server port
JOB_CONCURRENCY=5                   # Max concurrent resolutions
LOG_LEVEL=info                      # Logging level
NODE_ENV=production                 # Environment mode

# Timing Configuration
DISPUTE_WINDOW=600                  # Oracle dispute window (seconds)
RESOLUTION_BUFFER=60                # Buffer before resolution time (seconds)
RETRY_DELAY_BASE=5000              # Base retry delay (ms)
RETRY_MAX_ATTEMPTS=5               # Max retry attempts per job

# Monitoring
HEALTH_CHECK_INTERVAL=60000        # Health check frequency (ms)
METRICS_PORT=9090                  # Metrics server port (optional)
```

### **4.2 Configuration Validation**

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  rpcUrl: z.string().url(),
  privateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  oracleAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  hyperliquidApiUrl: z.string().url(),
  webhookPort: z.coerce.number().int().min(1024).max(65535),
  jobConcurrency: z.coerce.number().int().min(1).max(20),
  disputeWindow: z.coerce.number().int().min(60).max(86400),
});

export const config = ConfigSchema.parse(process.env);
```

---

## **5. Data Flow & State Management**

### **5.1 Event Processing Flow**

```
[MarketCreated Event] 
         ↓
[EventListener.handleMarketCreated()]
         ↓
[Parse market parameters]
         ↓
[Validate resolution time]
         ↓
[JobScheduler.scheduleJob()]
         ↓
[Store job in memory/persistence]
         ↓
[Schedule cron job or immediate execution]
         ↓
[Wait for resolution time]
         ↓
[ResolutionService.resolveMarket()]
         ↓
[Fetch data → Evaluate → Submit → Wait → Finalize]
```

### **5.2 State Persistence**

Currently in-memory only (demo implementation). Production requirements:

```typescript
interface PersistentState {
  // Active jobs that survive restarts
  scheduledJobs: Map<string, {
    marketId: string;
    resolveTime: number;
    marketParams: MarketParams;
    status: 'scheduled' | 'executing' | 'completed' | 'failed';
    retryCount: number;
    lastError?: string;
  }>;
  
  // Resolution history for audit
  resolutionHistory: Array<{
    marketId: string;
    resolvedAt: number;
    outcome: 0 | 1;
    dataHash: string;
    dataProof: DataProof;
    transactionHash: string;
  }>;
  
  // Service health metrics
  healthMetrics: {
    successfulResolutions: number;
    failedResolutions: number;
    avgResolutionTime: number;
    lastHealthCheck: number;
  };
}
```

---

## **6. Error Handling & Retry Strategy**

### **6.1 Error Categories**

1. **Transient Errors** (retry with backoff):
   - Network timeouts
   - API rate limits
   - Temporary blockchain congestion
   - Insufficient gas price

2. **Configuration Errors** (immediate failure):
   - Invalid contract addresses
   - Incorrect private keys
   - Malformed market parameters

3. **Data Errors** (fallback strategies):
   - API data unavailable
   - Invalid data format
   - Missing historical data

4. **Contract Errors** (context-dependent):
   - Oracle already resolved
   - Resolution time not reached
   - Dispute window active

### **6.2 Retry Configuration**

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 5000,        // 5 seconds
  maxDelay: 300000,       // 5 minutes
  backoffFactor: 2,       // Exponential backoff
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMIT',
    'INSUFFICIENT_GAS',
    'NONCE_TOO_LOW'
  ]
};
```

---

## **7. Monitoring & Health Checks**

### **7.1 Health Check Endpoints**

- `GET /health` - Service health status
- `GET /jobs` - Active scheduled jobs
- `GET /metrics` - Performance metrics
- `POST /resolve/:marketId` - Manual resolution trigger
- `DELETE /job/:marketId` - Cancel scheduled job

### **7.2 Metrics Collection**

```typescript
interface ServiceMetrics {
  // Job metrics
  totalJobsScheduled: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  
  // Performance metrics
  avgResolutionTime: number;
  avgApiResponseTime: number;
  avgBlockchainConfirmTime: number;
  
  // Error metrics
  apiErrors: number;
  blockchainErrors: number;
  dataValidationErrors: number;
  
  // Resource metrics
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
}
```

### **7.3 Logging Strategy**

- **Structured JSON logging** with Pino
- **Request correlation IDs** for tracing
- **Different log levels** per environment
- **Sensitive data filtering** (private keys, API keys)
- **Error context preservation** with stack traces

---

## **8. Security Considerations**

### **8.1 Private Key Management**

- Environment variable storage only
- Never log private keys
- Use hardware wallets for production
- Implement key rotation procedures
- Monitor for unauthorized transactions

### **8.2 API Security**

- Rate limiting on webhook endpoints
- Input validation with Zod schemas  
- CORS configuration for browser access
- Authentication for sensitive endpoints
- Request size limits and timeouts

### **8.3 Smart Contract Interaction**

- Gas limit safety margins
- Transaction simulation before sending
- Nonce collision prevention
- Failed transaction handling
- Contract upgrade detection

---

## **9. Deployment Architecture**

### **9.1 Service Dependencies**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     Oracle      │    │    Blockchain   │
│                 │    │    Runner       │    │      Node       │
│   - Health      │ -> │                 │ -> │                 │
│   - Failover    │    │   - EventListen │    │   - RPC API     │
│   - SSL Term    │    │   - JobSchedule │    │   - WebSocket   │
└─────────────────┘    │   - Resolution  │    │   - Mempool     │
                       │   - Monitoring  │    └─────────────────┘
                       └─────────────────┘
                                │
                                v
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Hyperliquid    │    │   Persistence   │
                       │      API        │    │     Layer       │
                       │                 │    │                 │
                       │   - Price Data  │    │   - Redis       │
                       │   - Metrics     │    │   - PostgreSQL  │
                       │   - Market Info │    │   - Job Queue   │
                       └─────────────────┘    └─────────────────┘
```

### **9.2 Scaling Strategy**

- **Horizontal scaling:** Multiple runner instances with job distribution
- **Geographic distribution:** Reduced latency to data sources
- **Failover handling:** Health checks and automatic restart
- **Load balancing:** Round-robin with health-based routing

---

## **10. Development Workflow**

### **10.1 Local Development**

```bash
# Install dependencies
pnpm install

# Environment setup
cp .env.example .env

# Development mode with hot reload
pnpm dev

# Type checking
pnpm typecheck

# Build production bundle
pnpm build

# Start production server
pnpm start
```

### **10.2 Testing Strategy**

- **Unit tests:** Individual service testing with mocks
- **Integration tests:** End-to-end resolution workflows  
- **Contract tests:** Smart contract interaction testing
- **Performance tests:** Load testing and profiling
- **Security tests:** Input validation and attack scenarios

---

## **11. Future Enhancements**

### **11.1 Persistent Storage Integration**

- Redis for job queuing and caching
- PostgreSQL for audit logs and metrics
- Job persistence across service restarts
- Historical data archival

### **11.2 Advanced Features**

- Multi-source data aggregation
- Price oracle integration (Chainlink, Pyth)
- Machine learning for anomaly detection
- Advanced retry strategies with circuit breakers
- Distributed consensus for multi-oracle setups

### **11.3 Operations & Monitoring**

- Prometheus metrics export
- Grafana dashboards
- Alerting on failures
- Performance profiling
- Automated deployment pipelines

---

This architecture provides a robust foundation for the Oracle Runner Service that can handle real-world market resolution requirements with proper error handling, monitoring, and scalability considerations.