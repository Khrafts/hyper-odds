import { ethers } from 'ethers';
import { z } from 'zod';
import express from 'express';
import { Server } from 'http';
import { logger, correlation, perfLogger, errorLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { JobScheduler } from './JobScheduler.js';

// MarketFactory ABI - just the MarketCreated event
const MARKET_FACTORY_ABI = [
  "event MarketCreated(address indexed market, address indexed creator, bool isProtocolMarket)"
];

// Goldsky webhook event validation schema
const GoldskyEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  blockNumber: z.number(),
  blockHash: z.string(),
  transactionHash: z.string(),
  transactionIndex: z.number(),
  logIndex: z.number(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  eventName: z.literal('MarketCreated'),
  args: z.object({
    market: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    isProtocolMarket: z.boolean()
  })
});

// Direct blockchain event schema
const BlockchainEventSchema = z.object({
  address: z.string(),
  blockNumber: z.number(),
  blockHash: z.string(),
  transactionHash: z.string(),
  args: z.tuple([
    z.string(), // market address
    z.string(), // creator address
    z.boolean() // isProtocolMarket
  ])
});

type GoldskyEvent = z.infer<typeof GoldskyEventSchema>;

export class EventListener {
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private jobScheduler: JobScheduler;
  private isListening: boolean = false;
  
  // Webhook server for Goldsky integration
  private app: express.Application;
  private server: Server | null = null;
  
  // Event deduplication
  private processedEvents = new Set<string>();
  private maxProcessedEvents = 10000;
  
  // Connection health
  private lastHealthCheck = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private blockchainFallbackActive = false;

  constructor(jobScheduler: JobScheduler) {
    this.jobScheduler = jobScheduler;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.factoryContract = new ethers.Contract(
      config.factoryAddress,
      MARKET_FACTORY_ABI,
      this.provider
    );
    
    // Initialize webhook server
    this.app = express();
    this.setupWebhookServer();
  }

  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Event listener already started');
      return;
    }

    const endTimer = perfLogger.time('event-listener-startup');

    try {
      logger.info({ 
        factoryAddress: config.factoryAddress,
        rpcUrl: config.rpcUrl,
        webhookPort: config.webhookPort
      }, 'Starting enhanced event listener for MarketCreated events');

      // Start webhook server for Goldsky integration
      await this.startWebhookServer();

      // Set up blockchain fallback listener
      await this.setupBlockchainFallback();

      // Catch up on recent events
      await this.catchUpOnRecentEvents();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isListening = true;
      logger.info('Enhanced event listener started successfully');
      endTimer();

    } catch (error) {
      endTimer();
      errorLogger.logError(error as Error, { 
        component: 'event-listener',
        operation: 'start'
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopping enhanced event listener');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop blockchain event listener
    this.factoryContract.removeAllListeners('MarketCreated');

    // Stop webhook server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info('Webhook server stopped');
          resolve();
        });
      });
      this.server = null;
    }

    this.isListening = false;
    logger.info('Enhanced event listener stopped gracefully');
  }

  // Webhook server setup for Goldsky integration
  private setupWebhookServer(): void {
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(correlation.middleware());

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        isListening: this.isListening,
        blockchainFallbackActive: this.blockchainFallbackActive,
        lastHealthCheck: this.lastHealthCheck,
        processedEventsCount: this.processedEvents.size
      });
    });

    // Goldsky webhook endpoint
    this.app.post('/goldsky/webhook', async (req, res) => {
      const correlationId = (req as any).correlationId;
      const requestLogger = correlation.child(correlationId, { endpoint: 'goldsky-webhook' });
      
      try {
        await this.handleGoldskyWebhook(req.body, requestLogger);
        res.status(200).json({ success: true });
      } catch (error) {
        errorLogger.logError(error as Error, {
          endpoint: 'goldsky-webhook',
          body: req.body
        }, correlationId);
        res.status(500).json({ error: 'Failed to process webhook' });
      }
    });
  }

  private async startWebhookServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.webhookPort, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          logger.info({ port: config.webhookPort }, 'Webhook server started for Goldsky integration');
          resolve();
        }
      });
    });
  }

  // Handle Goldsky webhook events
  private async handleGoldskyWebhook(payload: any, requestLogger: any): Promise<void> {
    const endTimer = perfLogger.time('goldsky-webhook-processing');
    
    try {
      // Validate payload structure
      const validatedEvents = this.validateGoldskyPayload(payload);
      
      requestLogger.info({ eventCount: validatedEvents.length }, 'Processing Goldsky webhook events');

      for (const event of validatedEvents) {
        await this.processGoldskyEvent(event, requestLogger);
      }

      endTimer();
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  private validateGoldskyPayload(payload: any): GoldskyEvent[] {
    // Handle both single event and batch of events
    const events = Array.isArray(payload) ? payload : [payload];
    
    const validatedEvents: GoldskyEvent[] = [];
    
    for (const event of events) {
      try {
        const validatedEvent = GoldskyEventSchema.parse(event);
        
        // Only process MarketCreated events from our factory
        if (validatedEvent.contractAddress.toLowerCase() === config.factoryAddress.toLowerCase() &&
            validatedEvent.eventName === 'MarketCreated') {
          validatedEvents.push(validatedEvent);
        }
      } catch (error) {
        logger.warn({ event, error }, 'Invalid Goldsky event format, skipping');
      }
    }
    
    return validatedEvents;
  }

  private async processGoldskyEvent(event: GoldskyEvent, requestLogger: any): Promise<void> {
    const eventId = `${event.transactionHash}-${event.logIndex}`;
    
    // Check for duplicate events
    if (this.isEventProcessed(eventId)) {
      requestLogger.debug({ eventId }, 'Event already processed, skipping');
      return;
    }

    const eventLogger = requestLogger.child({
      eventId,
      marketAddress: event.args.market,
      creator: event.args.creator,
      isProtocolMarket: event.args.isProtocolMarket,
      blockNumber: event.blockNumber,
      txHash: event.transactionHash
    });

    eventLogger.info('Processing Goldsky MarketCreated event');

    try {
      await this.handleMarketCreated(
        event.args.market,
        event.args.creator,
        event.args.isProtocolMarket,
        eventLogger
      );
      
      // Mark event as processed
      this.markEventProcessed(eventId);
      
    } catch (error) {
      eventLogger.error({ error }, 'Failed to handle Goldsky MarketCreated event');
      throw error;
    }
  }

  // Blockchain fallback listener
  private async setupBlockchainFallback(): Promise<void> {
    logger.info('Setting up blockchain fallback event listener');

    this.factoryContract.on('MarketCreated', async (marketAddress: string, creator: string, isProtocolMarket: boolean, event) => {
      // Only use fallback if webhook integration fails
      if (!this.blockchainFallbackActive) {
        return;
      }

      const eventId = `${event.transactionHash}-${event.logIndex}`;
      
      if (this.isEventProcessed(eventId)) {
        return;
      }

      const eventLogger = logger.child({
        eventId,
        marketAddress,
        creator,
        isProtocolMarket,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        source: 'blockchain-fallback'
      });

      eventLogger.info('Processing blockchain fallback MarketCreated event');

      try {
        await this.handleMarketCreated(marketAddress, creator, isProtocolMarket, eventLogger);
        this.markEventProcessed(eventId);
      } catch (error) {
        eventLogger.error({ error }, 'Failed to handle blockchain fallback MarketCreated event');
      }
    });
  }

  // Event deduplication methods
  private isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  private markEventProcessed(eventId: string): void {
    // Prevent memory leaks by limiting processed events cache
    if (this.processedEvents.size >= this.maxProcessedEvents) {
      const oldestEvents = Array.from(this.processedEvents).slice(0, this.maxProcessedEvents / 2);
      oldestEvents.forEach(id => this.processedEvents.delete(id));
    }
    
    this.processedEvents.add(eventId);
  }

  // Health monitoring
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, config.healthCheckInterval);

    logger.info({ 
      interval: config.healthCheckInterval 
    }, 'Started health monitoring for event listener');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check blockchain connection
      const blockNumber = await this.provider.getBlockNumber();
      
      this.lastHealthCheck = Date.now();
      
      // Log health status periodically
      if (Date.now() % (5 * 60 * 1000) < config.healthCheckInterval) {
        logger.info({
          currentBlock: blockNumber,
          processedEventsCount: this.processedEvents.size,
          blockchainFallbackActive: this.blockchainFallbackActive
        }, 'Event listener health check');
      }

      // Activate blockchain fallback if webhook hasn't received events recently
      // This is a simple heuristic - in production you might want more sophisticated logic
      this.blockchainFallbackActive = false; // For now, keep webhook as primary
      
    } catch (error) {
      logger.error({ error }, 'Health check failed - activating blockchain fallback');
      this.blockchainFallbackActive = true;
    }
  }

  // Catch up on recent events during startup
  private async catchUpOnRecentEvents(): Promise<void> {
    const endTimer = perfLogger.time('catchup-recent-events');
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);

      logger.info({ fromBlock, currentBlock }, 'Catching up on recent MarketCreated events');

      const filter = this.factoryContract.filters.MarketCreated();
      const events = await this.factoryContract.queryFilter(filter, fromBlock, currentBlock);

      logger.info({ eventCount: events.length }, 'Found recent MarketCreated events');

      for (const event of events) {
        const blockchainEvent = {
          address: event.address,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          transactionHash: event.transactionHash,
          args: (event as any).args
        };

        try {
          const validatedEvent = BlockchainEventSchema.parse(blockchainEvent);
          const eventId = `${validatedEvent.transactionHash}-${(event as any).logIndex || 0}`;
          
          if (!this.isEventProcessed(eventId)) {
            const [marketAddress, creator, isProtocolMarket] = validatedEvent.args;
            
            const eventLogger = logger.child({
              eventId,
              marketAddress,
              creator,
              isProtocolMarket,
              blockNumber: validatedEvent.blockNumber,
              txHash: validatedEvent.transactionHash,
              source: 'catchup'
            });

            eventLogger.info('Processing historical MarketCreated event');
            
            await this.handleMarketCreated(marketAddress, creator, isProtocolMarket, eventLogger);
            this.markEventProcessed(eventId);
          }
        } catch (error) {
          logger.error({ error, event }, 'Failed to process historical event');
        }
      }

      endTimer();
    } catch (error) {
      endTimer();
      errorLogger.logError(error as Error, { operation: 'catchup-recent-events' });
    }
  }

  // Enhanced market created handler
  private async handleMarketCreated(
    marketAddress: string, 
    _creator: string,
    _isProtocolMarket: boolean,
    eventLogger: any
  ): Promise<void> {
    const endTimer = perfLogger.time('handle-market-created');
    
    try {
      // Get market details directly from the contract
      const marketDetails = await this.getMarketDetails(marketAddress);
      
      if (!marketDetails) {
        eventLogger.error('Failed to fetch market details');
        return;
      }

      eventLogger.info({
        title: marketDetails.title,
        resolveTime: marketDetails.resolveTime,
        resolveDate: new Date(marketDetails.resolveTime * 1000).toISOString()
      }, 'Scheduling market for resolution');

      // Schedule the market for resolution
      this.jobScheduler.scheduleMarketResolution(
        marketAddress,
        marketDetails.title,
        marketDetails.resolveTime
      );

      endTimer();
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  // Get market details from contract
  private async getMarketDetails(marketAddress: string): Promise<{ title: string; resolveTime: number } | null> {
    const endTimer = perfLogger.time('fetch-market-details');
    
    try {
      // Market contract ABI for getting basic details
      const marketABI = [
        "function title() view returns (string)",
        "function resolveTime() view returns (uint64)",
        "function resolved() view returns (bool)"
      ];

      const marketContract = new ethers.Contract(marketAddress, marketABI, this.provider);
      
      const [title, resolveTime, resolved] = await Promise.all([
        marketContract.title(),
        marketContract.resolveTime(),
        marketContract.resolved()
      ]);

      // Skip if already resolved
      if (resolved) {
        logger.debug({ marketAddress }, 'Market already resolved, skipping');
        return null;
      }

      endTimer();
      return {
        title,
        resolveTime: Number(resolveTime)
      };
    } catch (error) {
      endTimer();
      logger.error({ error, marketAddress }, 'Failed to fetch market details from contract');
      return null;
    }
  }

  // Public methods for monitoring
  public getHealthStatus() {
    return {
      isListening: this.isListening,
      blockchainFallbackActive: this.blockchainFallbackActive,
      processedEventsCount: this.processedEvents.size,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}