import { Application } from '../src/app';

describe('Application', () => {
  let app: Application;

  beforeEach(() => {
    app = new Application();
  });

  afterEach(async () => {
    try {
      await app.shutdown();
    } catch {
      // Ignore shutdown errors in tests
    }
  });

  it('should create instance successfully', () => {
    expect(app).toBeDefined();
  });

  it('should have services container', () => {
    expect(app.services).toBeDefined();
  });

  it('should handle shutdown when not started', async () => {
    await expect(app.shutdown()).resolves.not.toThrow();
  });

  // Note: Full startup tests would require database/Redis infrastructure
});