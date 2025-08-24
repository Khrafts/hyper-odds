import { config } from '../src/config/config';
import { logger } from '../src/config/logger';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
process.env.FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '0x0000000000000000000000000000000000000001';
process.env.ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || '0x0000000000000000000000000000000000000002';
process.env.MARKET_IMPLEMENTATION = process.env.MARKET_IMPLEMENTATION || '0x0000000000000000000000000000000000000003';
process.env.CPMM_IMPLEMENTATION = process.env.CPMM_IMPLEMENTATION || '0x0000000000000000000000000000000000000004';

// Global test timeout
jest.setTimeout(30000);

// Mock logger to avoid console noise during tests
const originalLogger = logger;
beforeAll(() => {
  logger.level = 'error';
});

afterAll(() => {
  logger.level = originalLogger.level;
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after tests
afterAll(async () => {
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});