import { ServiceContainer } from '../../src/services/container';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(async () => {
    if (container.isInitialized()) {
      await container.shutdown();
    }
  });

  it('should create instance successfully', () => {
    expect(container).toBeDefined();
    expect(container.isInitialized()).toBe(false);
  });

  it('should have database service', () => {
    expect(container.database).toBeDefined();
  });

  it('should have coinMarketCap service', () => {
    expect(container.coinMarketCap).toBeDefined();
  });

  it('should not be healthy when not initialized', async () => {
    const healthy = await container.isHealthy();
    expect(healthy).toBe(false);
  });

  it('should handle shutdown when not initialized', async () => {
    await expect(container.shutdown()).resolves.not.toThrow();
  });

  // Note: Full initialization tests would require database/Redis setup
});