import { ethers } from 'ethers';
import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'redis';

// Mock ethers provider and contract
export const createMockProvider = () => {
  const mockProvider = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 421614n, name: 'arbitrum-sepolia' }),
    getBlock: jest.fn().mockResolvedValue({ number: 12345, timestamp: Math.floor(Date.now() / 1000) }),
    getTransactionReceipt: jest.fn(),
    getGasPrice: jest.fn().mockResolvedValue(ethers.parseUnits('0.1', 'gwei')),
    getFeeData: jest.fn().mockResolvedValue({
      gasPrice: ethers.parseUnits('0.1', 'gwei'),
      maxFeePerGas: ethers.parseUnits('2', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
    }),
    waitForTransaction: jest.fn(),
    _isProvider: true,
  };
  return mockProvider as unknown as ethers.JsonRpcProvider;
};

// Mock ethers wallet
export const createMockWallet = () => {
  const mockWallet = {
    address: '0x742d35Cc6639C0532fD46E91A9d7e7D3C4B8E0F9',
    connect: jest.fn().mockReturnThis(),
    signTransaction: jest.fn(),
    sendTransaction: jest.fn(),
  };
  return mockWallet as unknown as ethers.Wallet;
};

// Mock ethers contract
export const createMockContract = () => {
  const mockCommit = jest.fn();
  const mockFinalize = jest.fn();
  
  // Add estimateGas methods
  mockCommit.estimateGas = jest.fn().mockResolvedValue(50000n);
  mockFinalize.estimateGas = jest.fn().mockResolvedValue(30000n);
  
  const mockContract = {
    commit: mockCommit,
    finalize: mockFinalize,
    pending: jest.fn().mockResolvedValue({
      outcome: 0n,
      dataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      commitTime: 0n,
      committed: false,
      finalized: false,
    }),
    disputeWindow: jest.fn().mockResolvedValue(3600n), // 1 hour
    interface: {
      encodeFunctionData: jest.fn(),
      decodeFunctionResult: jest.fn(),
    },
    filters: {
      ResolutionCommitted: jest.fn(),
      ResolutionFinalized: jest.fn(),
    },
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };
  return mockContract as unknown as ethers.Contract;
};

// Mock transaction response
export const createMockTransaction = (overrides: Partial<ethers.TransactionResponse> = {}) => {
  return {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from: '0x742d35Cc6639C0532fD46E91A9d7e7D3C4B8E0F9',
    to: '0x0000000000000000000000000000000000000002',
    value: 0n,
    gasLimit: 21000n,
    gasPrice: ethers.parseUnits('0.1', 'gwei'),
    data: '0x',
    nonce: 1,
    blockNumber: null,
    blockHash: null,
    timestamp: null,
    confirmations: 0,
    wait: jest.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      blockNumber: 12345,
      blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      transactionIndex: 0,
      from: '0x742d35Cc6639C0532fD46E91A9d7e7D3C4B8E0F9',
      to: '0x0000000000000000000000000000000000000002',
      gasUsed: 21000n,
      cumulativeGasUsed: 21000n,
      effectiveGasPrice: ethers.parseUnits('0.1', 'gwei'),
      status: 1,
      logs: [],
    }),
    ...overrides,
  } as ethers.TransactionResponse;
};

// Mock Redis client
export const createMockRedis = () => {
  const mockRedis = {
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
  };
  return mockRedis as unknown as Redis;
};

// Mock BullMQ Queue
export const createMockQueue = () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123', data: {} } as Job),
    remove: jest.fn().mockResolvedValue(1),
    getJob: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  };
  return mockQueue;
};

// Mock BullMQ Worker
export const createMockWorker = () => {
  const mockWorker = {
    on: jest.fn(),
    off: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    run: jest.fn(),
  };
  return mockWorker;
};

// Mock Prisma client
export const createMockPrismaClient = () => {
  const mockClient = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ version: '14.0' }]),
    market: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    resolution: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    job: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    metricData: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return mockClient as unknown as PrismaClient;
};

// Mock axios for HTTP requests
export const createMockAxios = () => {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    defaults: {
      headers: {
        common: {},
        get: {},
        post: {},
        put: {},
        delete: {},
      },
    },
  };
};

// Sample market data for testing
export const createMockMarket = (overrides: any = {}) => {
  return {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    title: 'Test Market',
    subject: 'CRYPTO',
    question: 'Will ETH price be above $3000?',
    resolutionSource: 'coinmarketcap',
    resolutionDetails: JSON.stringify({ symbol: 'ETH', threshold: 3000 }),
    tStart: new Date('2024-01-01'),
    tEnd: new Date('2024-12-31'),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// Sample resolution data for testing
export const createMockResolution = (overrides: any = {}) => {
  return {
    id: 'resolution-123',
    marketId: '0x1234567890abcdef1234567890abcdef12345678',
    result: true,
    confidence: 0.95,
    metricValue: '3500.00',
    metricHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    sources: JSON.stringify(['coinmarketcap']),
    resolvedAt: new Date(),
    status: 'PENDING_COMMIT',
    transactionHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// Sample metric data for testing
export const createMockMetricData = (overrides: any = {}) => {
  return {
    id: 'metric-123',
    source: 'coinmarketcap',
    symbol: 'ETH',
    value: '3500.00',
    confidence: 0.95,
    timestamp: new Date(),
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    metadata: JSON.stringify({ priceUsd: 3500 }),
    createdAt: new Date(),
    ...overrides,
  };
};

// Sample job data for testing
export const createMockJob = (overrides: any = {}) => {
  return {
    id: 'job-123',
    marketId: '0x1234567890abcdef1234567890abcdef12345678',
    type: 'RESOLVE_MARKET',
    status: 'PENDING',
    scheduledFor: new Date(Date.now() + 3600000), // 1 hour from now
    attempts: 0,
    maxAttempts: 3,
    data: JSON.stringify({ marketId: '0x1234567890abcdef1234567890abcdef12345678' }),
    error: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// Health check mock data
export const createMockHealthCheck = (overrides: any = {}) => {
  return {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    summary: {
      healthy: 5,
      unhealthy: 0,
      degraded: 0,
    },
    checks: {
      database: { status: 'healthy' as const, responseTime: 10, details: {} },
      oracle: { status: 'healthy' as const, responseTime: 50, details: {} },
      transactionMonitor: { status: 'healthy' as const, responseTime: 5, details: {} },
      metricFetchers: { status: 'healthy' as const, responseTime: 100, details: {} },
      jobQueue: { status: 'healthy' as const, responseTime: 20, details: {} },
    },
    ...overrides,
  };
};