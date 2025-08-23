# **Hyper-Odds Market Runner Architecture**

> Autonomous market resolution service that listens to market creation events and schedules resolution jobs based on market parameters.

---

## **Overview**

The Market Runner is a TypeScript service that:
1. **Listens** to `MarketCreated` events from the Factory contract
2. **Schedules** resolution jobs based on market timing parameters
3. **Fetches** real-world data from various sources (Hyperliquid, price feeds, etc.)
4. **Resolves** markets by submitting data to the Oracle contract
5. **Manages** the complete market lifecycle from creation to resolution

---

## **Core Architecture**

### **Event-Driven Pipeline**
```
[Factory Contract] → [Event Listener] → [Job Scheduler] → [Metric Fetcher] → [Oracle Resolver]
       ↓                    ↓                ↓               ↓                ↓
   MarketCreated      Parse Params      Schedule Job    Fetch Data      Commit/Finalize
```

### **System Components**

#### **1. Event Listener Service**
- **Purpose**: Monitor blockchain for new market creation events
- **Technology**: viem WebSocket subscriptions
- **Responsibilities**:
  - Listen to Factory contract events
  - Parse market parameters from event data
  - Extract metric requirements and timing info
  - Trigger job scheduling

#### **2. Job Scheduler**
- **Purpose**: Manage timed execution of market resolution tasks
- **Technology**: BullMQ + Redis
- **Responsibilities**:
  - Schedule resolution jobs at market `tEnd` timestamp
  - Handle job retries and failure scenarios
  - Support delayed and recurring jobs
  - Job status tracking and monitoring

#### **3. Metric Fetchers**
- **Purpose**: Retrieve real-world data for market resolution
- **Technology**: HTTP clients, WebSocket connections
- **Data Sources**:
  - **Hyperliquid API**: Trading volume, TVL, open interest
  - **Price Feeds**: Coingecko, Coinbase, Binance APIs
  - **Custom Sources**: Extensible plugin system
- **Features**:
  - Data validation and normalization
  - Fallback source handling
  - Rate limiting and caching

#### **4. Oracle Integration**
- **Purpose**: Submit resolution data to on-chain oracle
- **Technology**: viem contract interactions
- **Flow**:
  1. Commit resolution with data hash
  2. Wait for dispute window
  3. Finalize resolution
- **Features**:
  - Transaction retry logic
  - Gas estimation and optimization
  - Error handling and recovery

#### **5. Storage Layer**
- **Purpose**: Persist market data and job state
- **Technology**: SQLite (dev) / PostgreSQL (prod)
- **Schema**:
  - Markets table (metadata, timing)
  - Jobs table (status, retry count)
  - Resolutions table (data, outcomes)
  - Metrics cache table

---

## **Data Models**

### **Market**
```typescript
interface Market {
  id: string; // Market contract address
  title: string;
  description: string;
  creator: string;
  cutoffTime: number; // Unix timestamp
  resolveTime: number; // Unix timestamp (tEnd)
  subject: MarketSubject;
  predicate: MarketPredicate;
  window: MarketWindow;
  oracle: OracleSpec;
  economics: Economics;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  createdAt: number;
}
```

### **Resolution Job**
```typescript
interface ResolutionJob {
  id: string;
  marketId: string;
  scheduledFor: number; // Unix timestamp
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  metricType: 'HL_METRIC' | 'TOKEN_PRICE';
  metricParams: Record<string, any>;
  lastError?: string;
  createdAt: number;
  completedAt?: number;
}
```

### **Metric Data**
```typescript
interface MetricData {
  marketId: string;
  value: string; // Decimal string for precision
  decimals: number;
  source: string;
  sourceId: string;
  timestamp: number;
  dataHash: string; // keccak256 of canonical data
}
```

---

## **Service Flow**

### **1. Market Detection**
1. WebSocket connection to Arbitrum Sepolia RPC
2. Subscribe to Factory contract `MarketCreated` events
3. Parse event data to extract market parameters
4. Store market metadata in database

### **2. Job Scheduling**
1. Calculate resolution timestamp from market `tEnd`
2. Create BullMQ job with delay until resolution time
3. Store job metadata for monitoring
4. Set up retry policies and error handling

### **3. Market Resolution**
1. Job executes at scheduled time
2. Determine metric type from market subject
3. Fetch data from appropriate source(s)
4. Validate and format data according to oracle spec
5. Submit to oracle contract (commit → finalize)

### **4. Error Handling**
- **Network Issues**: Exponential backoff retry
- **Data Source Failures**: Fallback to alternative sources
- **Transaction Failures**: Gas adjustment and retry
- **Oracle Disputes**: Monitor and handle challenges

---

## **Configuration**

### **Environment Variables**
```env
# Blockchain
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=0x...
FACTORY_ADDRESS=0xab2632A369366Fc5b0EAb208c5e5AebfAD8F8920
ORACLE_ADDRESS=0x741c8a67ECc595252776B9CE9474bC7dbDFd9f4F

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/runner

# APIs
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
COINGECKO_API_KEY=...
COINBASE_API_KEY=...

# Monitoring
LOG_LEVEL=info
METRICS_PORT=3001
HEALTH_CHECK_PORT=3002
```

---

## **Deployment Architecture**

### **Development**
- Single Node.js process
- SQLite database
- Local Redis instance
- File-based logging

### **Production**
- Docker containerization
- PostgreSQL database
- Redis cluster
- Structured logging (JSON)
- Prometheus metrics
- Health check endpoints

### **Scaling Considerations**
- **Horizontal**: Multiple runner instances with job distribution
- **Vertical**: Increased job concurrency per instance
- **Geographic**: Deploy closer to data sources for latency

---

## **Monitoring & Observability**

### **Metrics**
- Market detection rate
- Job success/failure rates
- Resolution latency
- API response times
- Database performance

### **Alerts**
- Failed market resolutions
- High error rates
- Service downtime
- Data source unavailability

### **Logging**
- Structured JSON logs
- Request/response tracing
- Error context preservation
- Performance profiling

---

## **Security Considerations**

### **Private Key Management**
- Environment variable injection
- Hardware Security Module (HSM) integration
- Key rotation procedures

### **API Security**
- Rate limiting
- API key management
- Request signing
- HTTPS enforcement

### **Smart Contract Interaction**
- Gas limit management
- Transaction simulation
- Revert reason analysis
- MEV protection

---

## **Extension Points**

### **Custom Metric Fetchers**
```typescript
interface MetricFetcher {
  supports(subject: MarketSubject): boolean;
  fetch(params: MetricParams): Promise<MetricData>;
}
```

### **Resolution Plugins**
```typescript
interface ResolutionPlugin {
  beforeResolve(market: Market, data: MetricData): Promise<void>;
  afterResolve(market: Market, txHash: string): Promise<void>;
}
```

### **Notification Handlers**
```typescript
interface NotificationHandler {
  onMarketCreated(market: Market): Promise<void>;
  onMarketResolved(market: Market, outcome: boolean): Promise<void>;
  onResolutionFailed(market: Market, error: Error): Promise<void>;
}
```

---

This architecture provides a robust, scalable foundation for automated market resolution with clear separation of concerns and extensibility for future requirements.