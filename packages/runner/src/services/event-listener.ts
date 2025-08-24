import { BlockchainService } from './blockchain';
import { logger } from '../config/logger';
import { config } from '../config/config';
import { MARKET_FACTORY_ABI, MarketCreatedLog } from '../contracts/MarketFactory';
import { decodeEventLog, parseAbiItem } from 'viem';

export interface EventListenerOptions {
  fromBlock?: bigint;
  batchSize?: number;
  pollInterval?: number;
}

export class EventListenerService {
  private blockchain: BlockchainService;
  private isListening = false;
  private currentBlock = 0n;
  private pollTimer?: NodeJS.Timeout | undefined;
  private options: Required<EventListenerOptions>;

  constructor(blockchain: BlockchainService, options: EventListenerOptions = {}) {
    this.blockchain = blockchain;
    this.options = {
      fromBlock: options.fromBlock || 0n,
      batchSize: options.batchSize || 1000,
      pollInterval: options.pollInterval || 5000, // 5 seconds
    };
  }

  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Event listener already running');
      return;
    }

    try {
      if (!this.blockchain.isConnected()) {
        throw new Error('Blockchain service not connected');
      }

      // Initialize from last processed block or start from specified block
      const latestBlock = await this.blockchain.getBlockNumber();
      this.currentBlock = this.options.fromBlock > 0n ? this.options.fromBlock : latestBlock;
      
      logger.info('Starting event listener service', {
        factoryAddress: config.FACTORY_ADDRESS,
        fromBlock: this.currentBlock.toString(),
        batchSize: this.options.batchSize,
        pollInterval: this.options.pollInterval,
      });

      this.isListening = true;
      this.scheduleNextPoll();
      
      logger.info('Event listener service started successfully');
    } catch (error) {
      logger.error('Failed to start event listener service:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopping event listener service...');
    
    this.isListening = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    logger.info('Event listener service stopped');
  }

  private scheduleNextPoll(): void {
    if (!this.isListening) {
      return;
    }

    this.pollTimer = setTimeout(async () => {
      try {
        await this.pollForEvents();
      } catch (error) {
        logger.error('Error during event polling:', {
          error: error instanceof Error ? error.message : error
        });
      }
      
      // Schedule next poll if still listening
      if (this.isListening) {
        this.scheduleNextPoll();
      }
    }, this.options.pollInterval);
  }

  private async pollForEvents(): Promise<void> {
    try {
      const latestBlock = await this.blockchain.getBlockNumber();
      
      if (latestBlock <= this.currentBlock) {
        // No new blocks
        return;
      }

      const toBlock = latestBlock;
      const fromBlock = this.currentBlock + 1n;
      
      logger.debug('Polling for events', {
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        factoryAddress: config.FACTORY_ADDRESS
      });

      // Get MarketCreated events
      const logs = await this.blockchain.getLogs({
        address: config.FACTORY_ADDRESS as `0x${string}`,
        event: parseAbiItem('event MarketCreated(address indexed market, address indexed creator, uint8 indexed marketType, tuple params)'),
        fromBlock,
        toBlock,
      });

      if (logs.length > 0) {
        logger.info(`Found ${logs.length} MarketCreated events`, {
          fromBlock: fromBlock.toString(),
          toBlock: toBlock.toString()
        });

        // Process each event
        for (const log of logs) {
          await this.processMarketCreatedEvent(log as any);
        }
      }

      // Update current block
      this.currentBlock = toBlock;
      
    } catch (error) {
      logger.error('Failed to poll for events:', {
        error: error instanceof Error ? error.message : error,
        currentBlock: this.currentBlock.toString()
      });
      throw error;
    }
  }

  private async processMarketCreatedEvent(log: MarketCreatedLog): Promise<void> {
    try {
      logger.info('Processing MarketCreated event', {
        market: log.args.market,
        creator: log.args.creator,
        marketType: log.args.marketType,
        blockNumber: log.blockNumber.toString(),
        transactionHash: log.transactionHash,
      });

      // Emit event for processing pipeline
      this.emit('marketCreated', {
        marketAddress: log.args.market,
        creator: log.args.creator,
        marketType: log.args.marketType,
        marketParams: log.args.params,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      });

    } catch (error) {
      logger.error('Failed to process MarketCreated event:', {
        error: error instanceof Error ? error.message : error,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      });
      throw error;
    }
  }

  // Simple event emitter for marketplace events
  private eventHandlers = new Map<string, Array<(data: any) => Promise<void>>>();

  on(event: 'marketCreated', handler: (data: {
    marketAddress: string;
    creator: string;
    marketType: number;
    marketParams: any;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }) => Promise<void>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private async emit(event: string, data: any): Promise<void> {
    const handlers = this.eventHandlers.get(event);
    if (!handlers || handlers.length === 0) {
      logger.debug(`No handlers registered for event: ${event}`);
      return;
    }

    // Execute all handlers
    const promises = handlers.map(handler => 
      handler(data).catch(error => {
        logger.error(`Event handler failed for ${event}:`, {
          error: error instanceof Error ? error.message : error
        });
      })
    );

    await Promise.all(promises);
  }

  // Getters
  isRunning(): boolean {
    return this.isListening;
  }

  getCurrentBlock(): bigint {
    return this.currentBlock;
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isListening) {
        return false;
      }

      // Check if we can get the latest block
      await this.blockchain.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Event listener health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }
}