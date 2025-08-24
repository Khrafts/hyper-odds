import { config } from './config/config';
import { logger } from './config/logger';
import { ServiceContainer } from './services/container';
import { HealthCheckService } from './services/health-check';

export class Application {
  private container: ServiceContainer;
  private healthCheck: HealthCheckService;
  private isShuttingDown = false;

  constructor() {
    this.container = new ServiceContainer();
    this.healthCheck = new HealthCheckService(this.container);
  }

  async start(): Promise<void> {
    logger.info('Initializing Market Runner Application...');

    try {
      await this.container.initialize();
      
      await this.healthCheck.start();
      
      logger.info('Application started successfully', {
        port: config.PORT,
        healthCheckPort: config.HEALTH_CHECK_PORT,
        metricsPort: config.METRICS_PORT,
        nodeEnv: config.NODE_ENV,
        chainId: config.CHAIN_ID
      });

    } catch (error) {
      logger.error('Failed to start application:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down Market Runner Application...');

    try {
      await this.healthCheck.stop();
      
      await this.container.shutdown();
      
      logger.info('Application shutdown completed');
    } catch (error) {
      logger.error('Error during application shutdown:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  get services() {
    return this.container;
  }
}