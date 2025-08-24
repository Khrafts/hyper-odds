import { logger } from '../config/logger';
import { CoinMarketCapService } from './coinmarketcap';
import { DatabaseService } from './database';
import { config } from '../config/config';

export class ServiceContainer {
  private initialized = false;
  
  // Core services
  public readonly database: DatabaseService;
  
  // Data source services
  public readonly coinMarketCap: CoinMarketCapService;

  constructor() {
    this.database = new DatabaseService();
    this.coinMarketCap = new CoinMarketCapService(
      config.COINMARKETCAP_API_KEY || 'dummy-key-for-testing'
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ServiceContainer already initialized');
      return;
    }

    logger.info('Initializing service container...');

    try {
      // Initialize services in dependency order
      logger.debug('Connecting to database...');
      await this.database.connect();
      
      logger.debug('Running database migrations...');
      await this.database.runMigrations();
      
      logger.debug('Initializing CoinMarketCap service...');
      // CoinMarketCapService doesn't need async initialization yet
      
      this.initialized = true;
      logger.info('Service container initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize service container:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info('Shutting down service container...');

    try {
      // Shutdown services in reverse dependency order
      logger.debug('Disconnecting from database...');
      await this.database.disconnect();
      
      this.initialized = false;
      logger.info('Service container shutdown completed');
      
    } catch (error) {
      logger.error('Error during service container shutdown:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const dbHealthy = await this.database.isHealthy();
      return dbHealthy;
    } catch (error) {
      logger.error('Health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }
}