import { logger } from '../config/logger';
import { CoinMarketCapService } from './coinmarketcap';
import { DatabaseService } from './database';
import { RedisService } from './redis';
import { BlockchainService } from './blockchain';
import { EventListenerService } from './event-listener';
import { JobSchedulerService } from './job-scheduler';
import { MarketProcessorService } from './market-processor';
import { RepositoryFactory } from '../repositories';
import { config } from '../config/config';

export class ServiceContainer {
  private initialized = false;
  
  // Core services
  public readonly database: DatabaseService;
  public readonly redis: RedisService;
  public readonly blockchain: BlockchainService;
  
  // Processing services
  public eventListener: EventListenerService;
  public jobScheduler: JobSchedulerService;
  public marketProcessor: MarketProcessorService;
  
  // Data source services
  public readonly coinMarketCap: CoinMarketCapService;
  
  // Repository factory
  public repositories: RepositoryFactory;

  constructor() {
    this.database = new DatabaseService();
    this.redis = new RedisService();
    this.blockchain = new BlockchainService();
    this.coinMarketCap = new CoinMarketCapService(
      config.COINMARKETCAP_API_KEY || 'dummy-key-for-testing'
    );
    
    // Initialize placeholders - will be set after core services are connected
    this.repositories = null as any;
    this.eventListener = null as any;
    this.jobScheduler = null as any;
    this.marketProcessor = null as any;
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
      
      logger.debug('Connecting to Redis...');
      await this.redis.connect();
      
      logger.debug('Connecting to blockchain...');
      await this.blockchain.connect();
      
      logger.debug('Initializing CoinMarketCap service...');
      // CoinMarketCapService doesn't need async initialization
      
      // Initialize repositories now that database is connected
      this.repositories = new RepositoryFactory(this.database.client);
      
      // Initialize processing services
      logger.debug('Initializing market processor...');
      this.marketProcessor = new MarketProcessorService(this.repositories);
      
      logger.debug('Initializing job scheduler...');
      this.jobScheduler = new JobSchedulerService(this.redis, this.repositories);
      await this.jobScheduler.start();
      
      logger.debug('Initializing event listener...');
      this.eventListener = new EventListenerService(this.blockchain);
      
      // Connect event listener to market processor
      this.eventListener.on('marketCreated', async (event) => {
        await this.marketProcessor.processMarketCreatedEvent({
          marketAddress: event.marketAddress,
          creator: event.creator,
          marketParams: event.marketParams,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      });
      
      await this.eventListener.start();
      
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
      if (this.eventListener) {
        logger.debug('Stopping event listener...');
        await this.eventListener.stop();
      }
      
      if (this.jobScheduler) {
        logger.debug('Stopping job scheduler...');
        await this.jobScheduler.stop();
      }
      
      logger.debug('Disconnecting from blockchain...');
      await this.blockchain.disconnect();
      
      logger.debug('Disconnecting from Redis...');
      await this.redis.disconnect();
      
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
      const redisHealthy = await this.redis.isHealthy();
      const blockchainHealthy = await this.blockchain.isHealthy();
      
      let eventListenerHealthy = true;
      let jobSchedulerHealthy = true;
      
      if (this.eventListener) {
        eventListenerHealthy = await this.eventListener.isHealthy();
      }
      
      if (this.jobScheduler) {
        jobSchedulerHealthy = await this.jobScheduler.isHealthy();
      }
      
      return dbHealthy && redisHealthy && blockchainHealthy && eventListenerHealthy && jobSchedulerHealthy;
    } catch (error) {
      logger.error('Health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }
}