import { config } from '../../src/config/config';

describe('Config', () => {
  it('should load configuration successfully', () => {
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
    expect(config.LOG_LEVEL).toBeDefined();
  });

  it('should have required blockchain configuration', () => {
    expect(config.RPC_URL).toBeDefined();
    expect(config.PRIVATE_KEY).toBeDefined();
    expect(config.CHAIN_ID).toBeDefined();
  });

  it('should have required contract addresses', () => {
    expect(config.FACTORY_ADDRESS).toBeDefined();
    expect(config.ORACLE_ADDRESS).toBeDefined();
    expect(config.MARKET_IMPLEMENTATION).toBeDefined();
    expect(config.CPMM_IMPLEMENTATION).toBeDefined();
  });

  it('should have database configuration', () => {
    expect(config.DATABASE_URL).toBeDefined();
  });

  it('should have Redis configuration', () => {
    expect(config.REDIS_URL).toBeDefined();
  });

  it('should validate address format', () => {
    expect(config.FACTORY_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.ORACLE_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.MARKET_IMPLEMENTATION).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.CPMM_IMPLEMENTATION).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should validate private key format', () => {
    expect(config.PRIVATE_KEY).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});