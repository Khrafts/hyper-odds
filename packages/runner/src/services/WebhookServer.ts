import express, { Express, Request, Response } from 'express';
import PQueue from 'p-queue';
import { ResolutionService } from './ResolutionService.js';
import { ContractService } from './ContractService.js';
import { HyperliquidAPI } from './HyperliquidAPI.js';
import { JobScheduler } from './JobScheduler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ethers } from 'ethers';
import type { GoldskyWebhookPayload, MarketCreated } from '../types/index.js';

export class WebhookServer {
  private app: Express;
  private server: any;
  private queue: PQueue;
  private resolutionService: ResolutionService;
  private contractService: ContractService;
  private hyperliquidAPI: HyperliquidAPI;
  private jobScheduler: JobScheduler;

  constructor(app: Express) {
    this.app = app;
    
    // Initialize services
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    
    this.hyperliquidAPI = new HyperliquidAPI(config.hyperliquidApiUrl);
    this.contractService = new ContractService(
      wallet,
      config.oracleAddress
    );
    this.resolutionService = new ResolutionService(
      this.contractService,
      this.hyperliquidAPI
    );
    
    // Initialize job scheduler
    this.jobScheduler = new JobScheduler(this.resolutionService);

    // Initialize queue for immediate processing
    this.queue = new PQueue({
      concurrency: config.batchSize,
      interval: 1000,
      intervalCap: config.batchSize
    });

    // Setup routes
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Parse JSON body
    this.app.use(express.json());
    
    // Log ALL incoming requests
    this.app.use((req, _res, next) => {
      logger.info({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      }, 'Incoming request');
      next();
    });

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      const scheduledJobs = this.jobScheduler.getScheduledJobs();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queueSize: this.queue.size,
        queuePending: this.queue.pending,
        scheduledJobs: scheduledJobs.length,
        jobs: scheduledJobs
      });
    });

    // Webhook endpoint for MarketCreated events
    this.app.post('/webhook/market-created', async (req: Request, res: Response): Promise<void> => {
      logger.info({ 
        headers: req.headers,
        body: req.body 
      }, 'Received webhook request');
      
      try {
        // Verify webhook signature
        if (config.webhookSecret) {
          const signature = req.headers['goldsky-webhook-secret'] as string;
          logger.debug({ signature, expectedSecret: config.webhookSecret }, 'Verifying webhook signature');
          if (!this.verifyGoldskySignature(req.body, signature)) {
            logger.warn('Invalid webhook signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
          }
        }

        const payload: GoldskyWebhookPayload = req.body;
        
        // Process the MarketCreated event
        await this.processMarketCreatedWebhook(payload);
        
        res.status(200).json({ success: true });
      } catch (error) {
        logger.error({ error }, 'Error processing webhook');
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual trigger endpoint (for testing)
    this.app.post('/resolve/:marketId', async (req: Request, res: Response) => {
      try {
        const marketId = req.params.marketId;
        logger.info({ marketId }, 'Manual resolution triggered');
        
        // Queue the resolution immediately
        await this.queue.add(() => this.resolutionService.resolveMarket(marketId));
        
        res.json({ success: true, message: 'Resolution queued' });
      } catch (error) {
        logger.error({ error }, 'Error triggering manual resolution');
        res.status(500).json({ error: 'Failed to queue resolution' });
      }
    });

    // Cancel scheduled job endpoint
    this.app.delete('/job/:marketId', (req: Request, res: Response) => {
      const marketId = req.params.marketId;
      const cancelled = this.jobScheduler.cancelJob(marketId);
      
      if (cancelled) {
        res.json({ success: true, message: 'Job cancelled' });
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    });

    // Get all scheduled jobs
    this.app.get('/jobs', (_req: Request, res: Response) => {
      const jobs = this.jobScheduler.getScheduledJobs();
      res.json({ jobs });
    });
  }

  private verifyGoldskySignature(_payload: any, signature: string | undefined): boolean {
    if (!signature || !config.webhookSecret) {
      return false;
    }
    // Goldsky sends the secret directly in the header
    return signature === config.webhookSecret;
  }

  private async processMarketCreatedWebhook(payload: GoldskyWebhookPayload): Promise<void> {
    const webhookLogger = logger.child({
      webhookId: payload.webhook_id,
      webhookName: payload.webhook_name,
      operation: payload.op,
      entity: payload.entity
    });

    webhookLogger.debug('Processing MarketCreated webhook');

    // We're interested in market_created entity
    if (payload.entity !== 'market_created') {
      webhookLogger.debug('Ignoring non-MarketCreated entity');
      return;
    }

    // Process INSERT operations (new markets)
    if (payload.op === 'INSERT') {
      const marketCreatedEvent = payload.data.new as MarketCreated;
      
      webhookLogger.info({
        marketAddress: marketCreatedEvent.market,
        creator: marketCreatedEvent.creator,
        isProtocolMarket: marketCreatedEvent.isProtocolMarket,
        blockNumber: marketCreatedEvent.blockNumber,
        timestamp: marketCreatedEvent.timestamp
      }, 'New market created');

      // Fetch the full market details from the subgraph
      await this.fetchAndScheduleMarket(marketCreatedEvent.market);
    }
  }

  private async fetchAndScheduleMarket(marketAddress: string): Promise<void> {
    try {
      // Query the subgraph for full market details
      const query = `
        query GetMarket($id: ID!) {
          market(id: $id) {
            id
            title
            description
            creator
            cutoffTime
            resolveTime
            resolved
            paused
            cancelled
            poolYes
            poolNo
            totalDeposits
            createdAt
            subjectHash
            predicateHash
            windowHash
          }
        }
      `;

      const response = await fetch(
        'https://api.goldsky.com/api/public/project_cm4ty719hcpgs01wg2r5z2pa8/subgraphs/hyper-odds-testnet/1.0.0/gn',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { id: marketAddress.toLowerCase() }
          })
        }
      );

      const data = await response.json() as any;
      
      if (!data.data?.market) {
        logger.error({ marketAddress }, 'Market not found in subgraph');
        return;
      }

      const market = data.data.market;
      
      logger.info({
        marketId: market.id,
        title: market.title,
        resolveTime: market.resolveTime,
        resolveDate: new Date(parseInt(market.resolveTime) * 1000).toISOString()
      }, 'Scheduling market for resolution');

      // Schedule the market for resolution
      this.jobScheduler.scheduleMarketResolution(
        market.id,
        market.title,
        parseInt(market.resolveTime)
      );

    } catch (error) {
      logger.error({ error, marketAddress }, 'Failed to fetch and schedule market');
    }
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info({ port }, 'Webhook server started');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Clear all scheduled jobs
    this.jobScheduler.destroy();
    
    // Clear the queue
    this.queue.clear();
    await this.queue.onEmpty();
    
    // Stop the server
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('Webhook server stopped');
          resolve();
        });
      });
    }
  }
}