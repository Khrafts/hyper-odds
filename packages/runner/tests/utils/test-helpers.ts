import { EventEmitter } from 'events';

// Test utilities for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await waitFor(interval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Event emitter testing utilities
export const waitForEvent = (
  emitter: EventEmitter,
  event: string,
  timeout = 5000
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off(event, handler);
      reject(new Error(`Event "${event}" not emitted within ${timeout}ms`));
    }, timeout);

    const handler = (...args: any[]) => {
      clearTimeout(timer);
      emitter.off(event, handler);
      resolve(args);
    };

    emitter.on(event, handler);
  });
};

// Mock environment setup
export const withMockEnv = (envVars: Record<string, string>, callback: () => void | Promise<void>) => {
  const originalEnv = { ...process.env };
  
  return async () => {
    // Set mock environment variables
    Object.assign(process.env, envVars);
    
    try {
      await callback();
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  };
};

// Time travel utilities for testing time-dependent code
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  const originalDate = Date;
  
  beforeAll(() => {
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    global.Date.parse = originalDate.parse;
    global.Date.UTC = originalDate.UTC;
  });
  
  afterAll(() => {
    global.Date = originalDate;
  });
};

// Error testing utilities
export const expectThrowsAsync = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp | jest.Constructable
): Promise<void> => {
  let error: Error | undefined;
  
  try {
    await asyncFn();
  } catch (e) {
    error = e as Error;
  }
  
  expect(error).toBeDefined();
  
  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(error?.message).toContain(expectedError);
    } else if (expectedError instanceof RegExp) {
      expect(error?.message).toMatch(expectedError);
    } else {
      expect(error).toBeInstanceOf(expectedError);
    }
  }
};

// Memory leak detection for event emitters
export const checkEventListeners = (emitter: EventEmitter, maxListeners = 10) => {
  afterEach(() => {
    const events = emitter.eventNames();
    events.forEach(event => {
      const listenerCount = emitter.listenerCount(event);
      if (listenerCount > maxListeners) {
        console.warn(`Event "${String(event)}" has ${listenerCount} listeners (max: ${maxListeners})`);
      }
    });
  });
};

// Database cleanup utilities
export const cleanupDatabase = async (prisma: any) => {
  // Clean up in dependency order
  await prisma.resolution.deleteMany();
  await prisma.job.deleteMany();
  await prisma.metricData.deleteMany();
  await prisma.market.deleteMany();
};

// Redis cleanup utilities
export const cleanupRedis = async (redis: any) => {
  if (redis.isOpen) {
    await redis.flushall();
  }
};

// Test data generators
export const generateTestMarketId = () => 
  '0x' + Math.random().toString(16).substring(2).padStart(40, '0');

export const generateTestTransactionHash = () =>
  '0x' + Math.random().toString(16).substring(2).padStart(64, '0');

export const generateTestJobId = () => 
  'job_' + Math.random().toString(36).substring(7);

// Assert utilities for complex objects
export const expectHealthyStatus = (status: any) => {
  expect(status).toHaveProperty('status', 'healthy');
  expect(status).toHaveProperty('timestamp');
  expect(status).toHaveProperty('checks');
  expect(typeof status.timestamp).toBe('string');
  expect(status.checks).toBeDefined();
};

export const expectUnhealthyStatus = (status: any, component?: string) => {
  expect(status.status).toMatch(/unhealthy|degraded/);
  expect(status).toHaveProperty('timestamp');
  expect(status).toHaveProperty('checks');
  
  if (component) {
    expect(status.checks[component]?.status).toMatch(/unhealthy|degraded/);
  }
};

// Logging utilities for tests
export const captureLogMessages = () => {
  const messages: any[] = [];
  const originalConsole = { ...console };
  
  beforeEach(() => {
    messages.length = 0;
    console.log = jest.fn((msg) => messages.push({ level: 'log', msg }));
    console.error = jest.fn((msg) => messages.push({ level: 'error', msg }));
    console.warn = jest.fn((msg) => messages.push({ level: 'warn', msg }));
    console.info = jest.fn((msg) => messages.push({ level: 'info', msg }));
  });
  
  afterEach(() => {
    Object.assign(console, originalConsole);
  });
  
  return messages;
};

// Performance testing utilities
export const measureExecutionTime = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectExecutionTimeUnder = async (fn: () => Promise<void> | void, maxTime: number) => {
  const executionTime = await measureExecutionTime(fn);
  expect(executionTime).toBeLessThan(maxTime);
};

// Network mock utilities
export const mockNetworkFailure = () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });
};

export const mockNetworkDelay = (delay: number) => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(async (...args) => {
      await waitFor(delay);
      return originalFetch(...args);
    });
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });
};