# **Oracle Runner Service — Implementation Tasks**

> Ultra-granular development tasks for building a production-ready oracle runner service that handles market resolution for Hyperliquid Prediction Markets.

---

## **Phase 0 — Foundation & Setup**

### **Task 0.1 — Package Structure Cleanup**

- **Start:** Current demo implementation
- **End:** Clean TypeScript project with proper structure
- **Steps:**
  1. Remove demo files: `simple-runner.js`, `debug*.js`, `test-events.js`, `check-events.js`
  2. Ensure proper `src/` organization with `services/`, `types/`, `utils/`, `config/`
  3. Update `package.json` scripts for production builds
  4. Add proper `.env.example` with all required variables
- **Verify:** `pnpm build` succeeds, all imports resolve correctly

### **Task 0.2 — Environment Configuration Enhancement**

- **Start:** Basic config loading
- **End:** Robust configuration with validation and defaults
- **Steps:**
  1. Enhance `src/config/index.ts` with Zod schema validation
  2. Add all required environment variables from architecture doc
  3. Implement configuration loading with proper error messages
  4. Add configuration validation on startup
- **Verify:** Invalid config fails fast with clear error messages

### **Task 0.3 — Logging Infrastructure**

- **Start:** Basic pino setup
- **End:** Structured logging with correlation IDs and filtering
- **Steps:**
  1. Enhance `src/utils/logger.ts` with structured logging
  2. Add request correlation ID support
  3. Implement sensitive data filtering (private keys, etc.)
  4. Add different log levels per environment
  5. Add log rotation configuration
- **Verify:** Logs are structured, filterable, and safe

---

## **Phase 1 — Core Service Implementation**

### **Task 1.1 — Enhanced EventListener Service**

- **Start:** Basic event listening
- **End:** Robust event processing with validation and error handling
- **Steps:**
  1. Implement proper Goldsky webhook handling in `src/services/EventListener.ts`
  2. Add event data validation with Zod schemas
  3. Implement fallback to direct blockchain event listening
  4. Add event deduplication logic
  5. Add graceful shutdown handling
- **Verify:** Unit tests pass, handles malformed events gracefully

### **Task 1.2 — JobScheduler with Persistence**

- **Start:** In-memory job tracking
- **End:** Persistent job management with retry logic
- **Steps:**
  1. Design job persistence interface (initially file-based, later database)
  2. Implement job state persistence in `src/services/JobScheduler.ts`
  3. Add retry logic with exponential backoff
  4. Implement job recovery on service restart
  5. Add job status tracking and monitoring
- **Verify:** Jobs survive service restarts, failed jobs retry appropriately

### **Task 1.3 — Enhanced ResolutionService**

- **Start:** Basic resolution logic
- **End:** Complete resolution workflow with all market types
- **Steps:**
  1. Implement all Subject types (HL_METRIC, TOKEN_PRICE) in `src/services/ResolutionService.ts`
  2. Add all Window types (SNAPSHOT_AT, WINDOW_SUM, WINDOW_COUNT)
  3. Implement predicate evaluation logic
  4. Add data hash generation for verification
  5. Implement complete oracle interaction (commit → wait → finalize)
- **Verify:** Can resolve all market types correctly with proper data proofs

### **Task 1.4 — Robust ContractService**

- **Start:** Basic smart contract interaction
- **End:** Production-ready blockchain interaction with error handling
- **Steps:**
  1. Implement transaction nonce management in `src/services/ContractService.ts`
  2. Add gas estimation with safety margins
  3. Implement transaction replacement (RBF) for stuck transactions
  4. Add transaction confirmation waiting with timeouts
  5. Implement contract call error parsing and handling
- **Verify:** Handles blockchain congestion, failed transactions, and gas price fluctuations

### **Task 1.5 — Production HyperliquidAPI Service**

- **Start:** Basic API client
- **End:** Robust external API integration with caching and fallbacks
- **Steps:**
  1. Implement comprehensive API client in `src/services/HyperliquidAPI.ts`
  2. Add request/response caching with appropriate TTLs
  3. Implement API rate limiting and retry logic
  4. Add fallback mechanisms for API failures
  5. Implement data validation for API responses
- **Verify:** Handles API outages gracefully, provides cached data when possible

---

## **Phase 2 — Data Resolution Logic**

### **Task 2.1 — Token Price Resolution**

- **Start:** No price fetching
- **End:** Complete token price resolution for all supported tokens
- **Steps:**
  1. Implement current price fetching for HYPE, USDC, other tokens
  2. Add historical price fetching for snapshot queries
  3. Implement price aggregation from multiple sources
  4. Add price validation and anomaly detection
  5. Handle missing or invalid price data gracefully
- **Verify:** Can fetch current and historical prices reliably

### **Task 2.2 — Hyperliquid Metrics Resolution**

- **Start:** No metrics fetching
- **End:** Complete HL metrics integration for all metric types
- **Steps:**
  1. Implement trading volume metrics (24h, 7d, custom periods)
  2. Add user-specific metrics (trading volume, positions, PnL)
  3. Implement market liquidity metrics
  4. Add aggregate platform metrics
  5. Handle metrics calculation for custom time windows
- **Verify:** Can fetch and calculate all supported Hyperliquid metrics

### **Task 2.3 — Window Type Implementation**

- **Start:** No window logic
- **End:** Complete window calculation for all types
- **Steps:**
  1. Implement SNAPSHOT_AT logic for point-in-time values
  2. Add WINDOW_SUM for aggregating values over time periods
  3. Implement WINDOW_COUNT for counting events in periods
  4. Add time zone handling for window calculations
  5. Implement efficient data aggregation algorithms
- **Verify:** Window calculations are accurate for all time periods

### **Task 2.4 — Data Verification System**

- **Start:** No data verification
- **End:** Complete data proof system for dispute resolution
- **Steps:**
  1. Implement data hash generation with all source data
  2. Add metadata collection (API endpoints, timestamps, raw responses)
  3. Create data proof serialization/deserialization
  4. Add data integrity verification methods
  5. Implement proof storage for dispute resolution
- **Verify:** Data proofs can be independently verified and reconstructed

---

## **Phase 3 — Error Handling & Resilience**

### **Task 3.1 — Comprehensive Error Classification**

- **Start:** Basic error handling
- **End:** Proper error classification and handling strategies
- **Steps:**
  1. Define error categories (transient, permanent, configuration)
  2. Implement error classification logic
  3. Add context preservation for error debugging
  4. Implement error reporting and alerting
  5. Add error recovery strategies per category
- **Verify:** All error types are handled appropriately with proper logging

### **Task 3.2 — Advanced Retry Mechanisms**

- **Start:** Basic retry logic
- **End:** Sophisticated retry with circuit breakers and backoff
- **Steps:**
  1. Implement exponential backoff with jitter
  2. Add circuit breaker pattern for failing services
  3. Implement retry budgets to prevent infinite retries
  4. Add dead letter queue for permanently failed jobs
  5. Implement manual retry triggers for operations staff
- **Verify:** Retry logic prevents cascade failures and resource exhaustion

### **Task 3.3 — Graceful Degradation**

- **Start:** No degradation handling
- **End:** Service continues operating with reduced functionality
- **Steps:**
  1. Implement fallback data sources for API failures
  2. Add partial resolution support (best-effort data)
  3. Implement service health indicators
  4. Add automatic service recovery detection
  5. Implement emergency manual override capabilities
- **Verify:** Service remains functional during partial outages

---

## **Phase 4 — Storage & Persistence**

### **Task 4.1 — Redis Integration for Caching**

- **Start:** No external storage
- **End:** Redis-backed caching and session storage
- **Steps:**
  1. Add Redis client configuration and connection management
  2. Implement API response caching with appropriate TTLs
  3. Add job queue storage in Redis
  4. Implement distributed locks for job execution
  5. Add Redis health monitoring and failover
- **Verify:** Caching improves performance, jobs are persistent across restarts

### **Task 4.2 — PostgreSQL Integration for Audit Logs**

- **Start:** No persistent storage
- **End:** Complete audit trail and historical data storage
- **Steps:**
  1. Design database schema for jobs, resolutions, and audit logs
  2. Implement database migrations and connection management
  3. Add job execution history tracking
  4. Implement resolution audit logs with full data proofs
  5. Add database backup and recovery procedures
- **Verify:** All operations are auditable, historical data is preserved

### **Task 4.3 — Job Persistence Layer**

- **Start:** In-memory job storage
- **End:** Persistent job management with database backing
- **Steps:**
  1. Implement job persistence interface abstraction
  2. Add database-backed job storage implementation
  3. Implement job recovery on service startup
  4. Add job cleanup for completed/expired jobs
  5. Implement job status synchronization across instances
- **Verify:** Jobs survive service restarts and are properly synchronized

---

## **Phase 5 — Monitoring & Observability**

### **Task 5.1 — Health Check System**

- **Start:** Basic health endpoint
- **End:** Comprehensive health monitoring with dependencies
- **Steps:**
  1. Implement detailed health checks for all dependencies
  2. Add service readiness and liveness probes
  3. Implement health check aggregation and scoring
  4. Add health check caching to prevent probe storms
  5. Implement automated health recovery actions
- **Verify:** Health checks accurately reflect service state

### **Task 5.2 — Metrics Collection**

- **Start:** No metrics
- **End:** Comprehensive metrics for monitoring and alerting
- **Steps:**
  1. Implement business metrics (jobs scheduled, resolved, failed)
  2. Add performance metrics (response times, throughput)
  3. Implement resource metrics (CPU, memory, connections)
  4. Add custom metrics for domain-specific monitoring
  5. Implement metrics export (Prometheus format)
- **Verify:** All key metrics are collected and exportable

### **Task 5.3 — Structured Logging Enhancement**

- **Start:** Basic logging
- **End:** Production-ready logging with correlation and analysis
- **Steps:**
  1. Implement request tracing with correlation IDs
  2. Add structured log fields for easier querying
  3. Implement log sampling for high-volume operations
  4. Add log aggregation preparation (JSON format)
  5. Implement log-based alerting triggers
- **Verify:** Logs provide clear insight into system behavior

---

## **Phase 6 — API & Integration**

### **Task 6.1 — Enhanced HTTP API**

- **Start:** Basic Express server
- **End:** Production-ready API with proper validation and documentation
- **Steps:**
  1. Implement request validation middleware with Zod
  2. Add rate limiting and request size limits
  3. Implement API authentication for sensitive endpoints
  4. Add API documentation (OpenAPI/Swagger)
  5. Implement CORS and security headers
- **Verify:** API is secure, documented, and properly validated

### **Task 6.2 — Webhook Integration**

- **Start:** Basic webhook handling
- **End:** Robust webhook processing with verification
- **Steps:**
  1. Implement webhook signature verification
  2. Add webhook payload validation and parsing
  3. Implement webhook retry handling for failed processing
  4. Add webhook event deduplication
  5. Implement webhook endpoint monitoring
- **Verify:** Webhooks are processed reliably and securely

### **Task 6.3 — External API Integration Hardening**

- **Start:** Basic API calls
- **End:** Production-ready external API integration
- **Steps:**
  1. Implement API authentication and key management
  2. Add request/response validation schemas
  3. Implement API versioning support
  4. Add API usage monitoring and billing tracking
  5. Implement emergency API shutdown procedures
- **Verify:** External APIs are integrated securely and monitored

---

## **Phase 7 — Security & Compliance**

### **Task 7.1 — Private Key Security**

- **Start:** Environment variable storage
- **End:** Secure key management with rotation support
- **Steps:**
  1. Implement key loading from secure storage (HashiCorp Vault, AWS KMS)
  2. Add key validation and format checking
  3. Implement key rotation procedures
  4. Add transaction signing audit logging
  5. Implement key compromise detection and response
- **Verify:** Private keys are managed securely with audit trails

### **Task 7.2 — Input Validation & Sanitization**

- **Start:** Basic validation
- **End:** Comprehensive input validation for all endpoints
- **Steps:**
  1. Implement strict input validation with Zod schemas
  2. Add input sanitization to prevent injection attacks
  3. Implement request size and rate limiting
  4. Add input validation error reporting
  5. Implement validation bypass detection and alerting
- **Verify:** All inputs are properly validated and sanitized

### **Task 7.3 — Network Security**

- **Start:** Basic HTTP server
- **End:** Secure network configuration with TLS and monitoring
- **Steps:**
  1. Implement TLS termination and certificate management
  2. Add network access control and firewall rules
  3. Implement connection monitoring and intrusion detection
  4. Add secure communication with external services
  5. Implement network-level attack mitigation
- **Verify:** Network communications are secure and monitored

---

## **Phase 8 — Performance & Scalability**

### **Task 8.1 — Concurrency Management**

- **Start:** Basic job execution
- **End:** Optimized concurrent processing with resource management
- **Steps:**
  1. Implement job queue with priority and concurrency limits
  2. Add resource pooling for database and API connections
  3. Implement backpressure handling for overload scenarios
  4. Add job execution time monitoring and limits
  5. Implement dynamic concurrency adjustment based on performance
- **Verify:** System handles high load without resource exhaustion

### **Task 8.2 — Memory Management**

- **Start:** No memory optimization
- **End:** Efficient memory usage with monitoring
- **Steps:**
  1. Implement memory usage monitoring and alerting
  2. Add memory leak detection and prevention
  3. Implement efficient data structures for large datasets
  4. Add garbage collection optimization
  5. Implement memory pressure handling
- **Verify:** Memory usage is stable under load

### **Task 8.3 — Database Performance**

- **Start:** Basic database usage
- **End:** Optimized database performance with monitoring
- **Steps:**
  1. Implement database connection pooling
  2. Add query optimization and indexing
  3. Implement database query monitoring
  4. Add database backup and recovery testing
  5. Implement database failover and read replicas
- **Verify:** Database performance is optimal and reliable

---

## **Phase 9 — Testing & Quality Assurance**

### **Task 9.1 — Unit Test Suite**

- **Start:** No tests
- **End:** Comprehensive unit test coverage
- **Steps:**
  1. Set up testing framework (Vitest) with proper configuration
  2. Implement unit tests for all service classes
  3. Add mock implementations for external dependencies
  4. Implement test data factories and fixtures
  5. Add code coverage reporting and enforcement
- **Verify:** `pnpm test` achieves >90% code coverage

### **Task 9.2 — Integration Test Suite**

- **Start:** No integration tests
- **End:** End-to-end integration test coverage
- **Steps:**
  1. Set up test environment with Docker containers
  2. Implement integration tests for complete resolution workflows
  3. Add tests for external API integration
  4. Implement database integration tests
  5. Add performance benchmarks and regression tests
- **Verify:** Integration tests pass consistently, performance meets SLAs

### **Task 9.3 — Contract Integration Tests**

- **Start:** No blockchain tests
- **End:** Complete smart contract interaction testing
- **Steps:**
  1. Set up local blockchain test environment
  2. Implement tests for all oracle contract interactions
  3. Add tests for various market types and scenarios
  4. Implement gas usage optimization tests
  5. Add blockchain failure scenario testing
- **Verify:** All contract interactions work correctly under various conditions

---

## **Phase 10 — Deployment & Operations**

### **Task 10.1 — Docker Configuration**

- **Start:** No containerization
- **End:** Production-ready Docker setup
- **Steps:**
  1. Create optimized Dockerfile with multi-stage builds
  2. Implement Docker Compose for local development
  3. Add container health checks and resource limits
  4. Implement proper signal handling for graceful shutdown
  5. Add container security scanning and hardening
- **Verify:** Containers start correctly, handle signals, and shut down gracefully

### **Task 10.2 — CI/CD Pipeline**

- **Start:** No automation
- **End:** Complete deployment pipeline
- **Steps:**
  1. Set up GitHub Actions or similar CI/CD platform
  2. Implement automated testing and quality gates
  3. Add automatic security scanning and vulnerability checks
  4. Implement staging and production deployment workflows
  5. Add deployment rollback and canary deployment capabilities
- **Verify:** Code changes are automatically tested and deployed

### **Task 10.3 — Production Monitoring Setup**

- **Start:** No production monitoring
- **End:** Complete observability stack
- **Steps:**
  1. Set up Prometheus metrics collection
  2. Implement Grafana dashboards for service monitoring
  3. Add alerting rules for critical failures and performance issues
  4. Implement log aggregation with ELK stack or similar
  5. Add on-call procedures and runbooks
- **Verify:** Production issues are detected and alerted promptly

---

## **Phase 11 — Documentation & Maintenance**

### **Task 11.1 — Operational Documentation**

- **Start:** Basic README
- **End:** Complete operational documentation
- **Steps:**
  1. Write deployment and configuration guides
  2. Create troubleshooting runbooks for common issues
  3. Document monitoring and alerting procedures
  4. Add disaster recovery and backup procedures
  5. Create on-call escalation procedures
- **Verify:** Operations team can deploy and maintain the service

### **Task 11.2 — API Documentation**

- **Start:** No API docs
- **End:** Complete API documentation with examples
- **Steps:**
  1. Generate OpenAPI specification from code
  2. Add detailed endpoint descriptions and examples
  3. Create integration guides for consumers
  4. Add authentication and rate limiting documentation
  5. Implement API versioning strategy documentation
- **Verify:** API consumers can integrate successfully using documentation

### **Task 11.3 — Architecture Decision Records**

- **Start:** No decision tracking
- **End:** Complete ADR documentation for major decisions
- **Steps:**
  1. Document technology choices and rationale
  2. Record architectural patterns and design decisions
  3. Document security and compliance decisions
  4. Add performance and scalability decisions
  5. Create decision review and update processes
- **Verify:** Architectural decisions are documented and justified

---

## **Development Workflow Commands**

### **Daily Development**
```bash
# Start development mode
pnpm dev

# Run tests
pnpm test
pnpm test:watch
pnpm test:coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Build for production
pnpm build
```

### **Quality Gates**
```bash
# Before committing
pnpm typecheck && pnpm lint && pnpm test

# Build verification
pnpm build && pnpm start

# Security scanning
npm audit
```

### **Production Operations**
```bash
# Health check
curl http://localhost:3001/health

# View active jobs
curl http://localhost:3001/jobs

# Manual resolution
curl -X POST http://localhost:3001/resolve/MARKET_ID

# Cancel job
curl -X DELETE http://localhost:3001/job/MARKET_ID
```

---

## **Success Criteria per Phase**

### **Phase 1-3: Core Implementation**
- All services start successfully
- Event processing works end-to-end
- Job scheduling and execution is reliable
- Error handling prevents crashes

### **Phase 4-6: Production Features**
- Data persists across restarts
- Monitoring provides clear visibility
- APIs are secure and documented
- External integrations are robust

### **Phase 7-9: Security & Quality**
- Security audits pass
- Test coverage >90%
- Performance meets SLAs
- Load testing passes

### **Phase 10-11: Operations**
- Deployment is automated
- Monitoring alerts on issues
- Documentation is complete
- On-call procedures work

---

This task breakdown ensures each phase builds incrementally toward a production-ready oracle runner service that can handle real prediction markets reliably and securely.