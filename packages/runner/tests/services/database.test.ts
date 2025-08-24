import { DatabaseService } from '../../src/services/database';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
  });

  afterEach(async () => {
    if (databaseService.isConnected()) {
      await databaseService.disconnect();
    }
  });

  it('should create instance successfully', () => {
    expect(databaseService).toBeDefined();
    expect(databaseService.isConnected()).toBe(false);
  });

  it('should not be connected initially', () => {
    expect(databaseService.isConnected()).toBe(false);
  });

  it('should throw error when accessing client without connection', () => {
    expect(() => databaseService.client).toThrow('Database not connected');
  });

  it('should handle health check when not connected', async () => {
    const healthy = await databaseService.isHealthy();
    expect(healthy).toBe(false);
  });

  // Note: Actual database connection tests would require a test database
  // These are placeholder tests for the service structure
});