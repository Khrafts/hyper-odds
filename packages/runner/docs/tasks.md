# **Market Runner Implementation Tasks**

> Step-by-step development plan for building the autonomous market resolution service

---

## **Phase 0: Project Setup**

### **Task 0.1: Initialize TypeScript Project**
- **Start**: Empty runner package directory
- **End**: Functional TypeScript development environment
- **Steps**:
  1. Create `tsconfig.json` with strict configuration
  2. Set up ESLint and Prettier configs
  3. Create basic `src/` directory structure
  4. Add `.env.example` with required variables
  5. Create basic `README.md`
- **Verify**: `pnpm build` and `pnpm typecheck` succeed

### **Task 0.2: Set Up Development Dependencies**
- **Start**: package.json created
- **End**: All dev tools configured and working
- **Steps**:
  1. Install and configure Jest for testing
  2. Set up tsx for development watching
  3. Configure ESLint rules for TypeScript
  4. Add pre-commit hooks (optional)
- **Verify**: `pnpm test` and `pnpm lint` work

### **Task 0.3: Create Basic Service Structure**
- **Start**: TypeScript project initialized
- **End**: Service skeleton with dependency injection
- **Steps**:
  1. Create `src/index.ts` entry point
  2. Set up logger configuration with Winston
  3. Create `src/config/` for environment management
  4. Add graceful shutdown handling
- **Verify**: Service starts and stops cleanly

---

## **Phase 1: Database & Storage**

### **Task 1.1: Design Database Schema**
- **Start**: Service skeleton ready
- **End**: Database schema defined and documented
- **Steps**:
  1. Choose ORM (Prisma recommended for TypeScript)
  2. Define schema for markets, jobs, resolutions
  3. Create migration files
  4. Add seed data for development
- **Verify**: Database migrates and seeds successfully

### **Task 1.2: Implement Data Models**
- **Start**: Database schema ready
- **End**: TypeScript models and repository patterns
- **Steps**:
  1. Generate TypeScript types from schema
  2. Create repository interfaces
  3. Implement repository classes
  4. Add basic CRUD operations
- **Verify**: Unit tests for repositories pass

### **Task 1.3: Add Database Connection Management**
- **Start**: Data models implemented
- **End**: Robust database connectivity
- **Steps**:
  1. Connection pooling configuration
  2. Health check endpoints
  3. Retry logic for connection failures
  4. Transaction management helpers
- **Verify**: Service handles database restarts gracefully

---

## **Phase 2: Event Listening**

### **Task 2.1: Set Up Blockchain Connection**
- **Start**: Database layer complete
- **End**: WebSocket connection to Arbitrum Sepolia
- **Steps**:
  1. Configure viem client with WebSocket transport
  2. Add connection retry and reconnection logic
  3. Implement health monitoring for RPC connection
  4. Add fallback RPC endpoints
- **Verify**: Maintains stable connection under network issues

### **Task 2.2: Implement MarketCreated Event Listener**
- **Start**: Blockchain connection established
- **End**: Parse and store market creation events
- **Steps**:
  1. Define Factory contract ABI and interface
  2. Set up event filtering for MarketCreated
  3. Parse complex market parameters from events
  4. Store parsed data in database
- **Verify**: Correctly processes historical and new events

### **Task 2.3: Add Event Processing Pipeline**
- **Start**: Basic event listener working
- **End**: Robust event handling with error recovery
- **Steps**:
  1. Implement event deduplication
  2. Add processing queue for events
  3. Handle blockchain reorganizations
  4. Add event processing metrics
- **Verify**: Processes events reliably under high load

---

## **Phase 3: Job Scheduling**

### **Task 3.1: Set Up Redis and BullMQ**
- **Start**: Event processing working
- **End**: Job queue system operational
- **Steps**:
  1. Configure Redis connection with clustering support
  2. Set up BullMQ queues for resolution jobs
  3. Implement job serialization/deserialization
  4. Add queue monitoring and management
- **Verify**: Jobs can be queued and processed

### **Task 3.2: Implement Resolution Job Scheduling**
- **Start**: Job queue system ready
- **End**: Schedule jobs based on market timing
- **Steps**:
  1. Calculate job delay from market `tEnd` timestamp
  2. Create job payload with market parameters
  3. Handle timezone and timestamp edge cases
  4. Add job cancellation for cancelled markets
- **Verify**: Jobs execute at correct times

### **Task 3.3: Add Job Retry and Error Handling**
- **Start**: Basic job scheduling working
- **End**: Resilient job processing
- **Steps**:
  1. Configure retry policies (exponential backoff)
  2. Add dead letter queue for failed jobs
  3. Implement job timeout handling
  4. Add manual job retry capabilities
- **Verify**: Failed jobs retry appropriately

---

## **Phase 4: Metric Fetching**

### **Task 4.1: Create Metric Fetcher Architecture**
- **Start**: Job system operational
- **End**: Pluggable metric fetcher system
- **Steps**:
  1. Define MetricFetcher interface
  2. Create fetcher registry and factory
  3. Implement base fetcher with common functionality
  4. Add fetcher selection based on market subject
- **Verify**: Fetcher system routes correctly by market type

### **Task 4.2: Implement Hyperliquid API Fetcher**
- **Start**: Fetcher architecture ready
- **End**: Fetch Hyperliquid metrics (volume, TVL, etc.)
- **Steps**:
  1. Study Hyperliquid API documentation
  2. Implement HTTP client with proper headers
  3. Handle different metric types (volume, TVL, OI)
  4. Add data validation and normalization
- **Verify**: Successfully fetches real Hyperliquid data

### **Task 4.3: Implement Token Price Fetchers**
- **Start**: Hyperliquid fetcher complete
- **End**: Multi-source price fetching
- **Steps**:
  1. Implement Coingecko price fetcher
  2. Add Coinbase Pro API fetcher
  3. Create price aggregation logic
  4. Handle different token identifiers
- **Verify**: Fetches accurate prices with fallbacks

### **Task 4.4: Add Data Validation and Formatting**
- **Start**: Basic fetchers implemented
- **End**: Robust data processing pipeline
- **Steps**:
  1. Implement data validation schemas (Zod)
  2. Add decimal precision handling
  3. Create canonical data hash generation
  4. Add data caching to reduce API calls
- **Verify**: Processes data consistently and accurately

---

## **Phase 5: Oracle Integration**

### **Task 5.1: Implement Oracle Contract Interface**
- **Start**: Metric fetching complete
- **End**: Can interact with SimpleOracle contract
- **Steps**:
  1. Import SimpleOracle ABI from contracts package
  2. Create Oracle service class
  3. Implement commit and finalize methods
  4. Add gas estimation and transaction management
- **Verify**: Successfully calls oracle contract functions

### **Task 5.2: Implement Resolution Flow**
- **Start**: Oracle interface ready
- **End**: Complete commit → finalize workflow
- **Steps**:
  1. Implement commit transaction with data hash
  2. Add dispute window waiting logic
  3. Implement finalize transaction
  4. Handle transaction failures and retries
- **Verify**: Successfully resolves test markets

### **Task 5.3: Add Transaction Monitoring**
- **Start**: Basic resolution flow working
- **End**: Reliable transaction execution
- **Steps**:
  1. Monitor transaction confirmation status
  2. Handle transaction replacement/acceleration
  3. Add MEV protection strategies
  4. Implement transaction receipt validation
- **Verify**: Handles network congestion gracefully

---

## **Phase 6: Error Handling & Monitoring**

### **Task 6.1: Add Comprehensive Logging**
- **Start**: Core functionality complete
- **End**: Detailed operational visibility
- **Steps**:
  1. Add structured logging throughout services
  2. Implement request/response tracing
  3. Add performance metrics collection
  4. Create log rotation and retention policies
- **Verify**: Logs provide actionable debugging information

### **Task 6.2: Implement Health Checks**
- **Start**: Logging system ready
- **End**: Service health monitoring
- **Steps**:
  1. Create health check endpoints
  2. Monitor database connectivity
  3. Check blockchain connection status
  4. Verify job queue operational status
- **Verify**: Health checks accurately reflect service state

### **Task 6.3: Add Alerting and Notifications**
- **Start**: Health monitoring implemented
- **End**: Proactive issue detection
- **Steps**:
  1. Define alert conditions and thresholds
  2. Implement notification channels (email, Slack)
  3. Add escalation policies
  4. Create operational runbooks
- **Verify**: Alerts trigger appropriately for issues

---

## **Phase 7: Testing & Quality**

### **Task 7.1: Unit Testing**
- **Start**: Core features implemented
- **End**: Comprehensive unit test coverage
- **Steps**:
  1. Test all service classes in isolation
  2. Mock external dependencies (APIs, blockchain)
  3. Test error conditions and edge cases
  4. Achieve >80% code coverage
- **Verify**: All unit tests pass consistently

### **Task 7.2: Integration Testing**
- **Start**: Unit tests complete
- **End**: End-to-end functionality verified
- **Steps**:
  1. Test with actual testnet contracts
  2. Verify complete market resolution flow
  3. Test failure recovery scenarios
  4. Performance testing under load
- **Verify**: Integration tests pass with real data

### **Task 7.3: Load Testing**
- **Start**: Integration tests passing
- **End**: Performance characteristics understood
- **Steps**:
  1. Test handling multiple concurrent markets
  2. Measure job processing throughput
  3. Test database performance under load
  4. Identify and optimize bottlenecks
- **Verify**: Meets performance requirements

---

## **Phase 8: Deployment & Operations**

### **Task 8.1: Create Docker Configuration**
- **Start**: Application tested and ready
- **End**: Containerized deployment
- **Steps**:
  1. Create optimized Dockerfile
  2. Add docker-compose for local development
  3. Configure environment variable injection
  4. Add container health checks
- **Verify**: Container runs correctly in different environments

### **Task 8.2: Add Configuration Management**
- **Start**: Docker setup complete
- **End**: Flexible configuration system
- **Steps**:
  1. Externalize all configuration
  2. Add configuration validation
  3. Support multiple deployment environments
  4. Add configuration change detection
- **Verify**: Deploys correctly across environments

### **Task 8.3: Production Deployment**
- **Start**: Deployment artifacts ready
- **End**: Running in production environment
- **Steps**:
  1. Set up production infrastructure
  2. Configure monitoring and alerting
  3. Deploy with proper secrets management
  4. Verify operation with real markets
- **Verify**: Processes real markets successfully

---

## **Phase 9: Documentation & Handoff**

### **Task 9.1: Complete Technical Documentation**
- **Start**: System operational
- **End**: Comprehensive documentation
- **Steps**:
  1. Document all APIs and interfaces
  2. Create deployment guides
  3. Add troubleshooting guides
  4. Document configuration options
- **Verify**: Documentation enables independent operation

### **Task 9.2: Create Operational Procedures**
- **Start**: Technical docs complete
- **End**: Operations team ready
- **Steps**:
  1. Document monitoring procedures
  2. Create incident response playbooks
  3. Add maintenance procedures
  4. Train operations team
- **Verify**: Operations team can manage service independently

---

## **Success Criteria**

- [ ] **Reliability**: 99.9% uptime, handles network issues gracefully
- [ ] **Accuracy**: Correctly resolves >99% of markets with proper data
- [ ] **Performance**: Processes resolution jobs within 1 minute of schedule
- [ ] **Scalability**: Handles 1000+ concurrent active markets
- [ ] **Maintainability**: Clear code structure, comprehensive tests
- [ ] **Observability**: Complete logging, monitoring, and alerting
- [ ] **Security**: Secure private key handling, API rate limiting

---

This task breakdown provides a clear roadmap from initial setup to production deployment, with verifiable milestones at each step.