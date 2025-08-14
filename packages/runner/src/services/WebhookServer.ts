import express, { Express, Request, Response } from 'express';
import crypto from 'crypto';
import PQueue from 'p-queue';
import { ResolutionService } from './ResolutionService.js';
import { ContractService } from './ContractService.js';
import { HyperliquidAPI } from './HyperliquidAPI.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ethers } from 'ethers';
import type { GoldskyWebhookPayload, Market } from '../types/index.js';

export class WebhookServer {
  private app: Express;
  private server: any;
  private queue: PQueue;
  private resolutionService: ResolutionService;
  private contractService: ContractService;
  private hyperliquidAPI: HyperliquidAPI;

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

    // Initialize queue for processing
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

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queueSize: this.queue.size,
        queuePending: this.queue.pending
      });
    });

    // Webhook endpoint for Goldsky
    this.app.post('/webhook/market', async (req: Request, res: Response): Promise<void> => {
      try {
        // Verify webhook signature if configured
        if (config.webhookSecret) {
          const signature = req.headers['x-goldsky-signature'] as string;
          if (!this.verifySignature(req.body, signature)) {
            logger.warn('Invalid webhook signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
          }
        }

        const payload: GoldskyWebhookPayload = req.body;
        
        // Process the webhook
        await this.processWebhook(payload);
        
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
        
        // Queue the resolution
        await this.queue.add(() => this.resolveMarket(marketId));
        
        res.json({ success: true, message: 'Resolution queued' });
      } catch (error) {
        logger.error({ error }, 'Error triggering manual resolution');
        res.status(500).json({ error: 'Failed to queue resolution' });
      }
    });
  }

  private verifySignature(payload: any, signature: string | undefined): boolean {
    if (!signature || !config.webhookSecret) {
      return false;
    }
    const hmac = crypto.createHmac('sha256', config.webhookSecret);
    const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
    return signature === expectedSignature;
  }

  private async processWebhook(payload: GoldskyWebhookPayload): Promise<void> {
    const webhookLogger = logger.child({
      webhookId: payload.webhook_id,
      webhookName: payload.webhook_name,
      operation: payload.op,
      entity: payload.entity
    });

    webhookLogger.debug('Processing webhook');

    // We're interested in Market entity updates
    if (payload.entity !== 'Market') {
      webhookLogger.debug('Ignoring non-Market entity');
      return;
    }

    // Check if this is a market that needs resolution
    if (payload.op === 'UPDATE' || payload.op === 'INSERT') {
      const market = payload.data.new as Market;
      
      // Check if market is ready for resolution
      if (this.shouldResolveMarket(market)) {
        webhookLogger.info({
          marketId: market.id,
          title: market.title,
          resolveTime: market.resolveTime
        }, 'Market ready for resolution');
        
        // Queue the resolution
        await this.queue.add(() => this.resolveMarket(market.id));
      }
    }
  }

  private shouldResolveMarket(market: Market): boolean {
    // Market should be resolved if:
    // 1. Not already resolved
    // 2. Not cancelled
    // 3. Current time is past resolve time
    // 4. Has participants (non-zero pools)
    
    if (market.resolved || market.cancelled) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const resolveTime = parseInt(market.resolveTime);
    
    if (currentTime < resolveTime) {
      return false;
    }

    // Check if market has activity
    const hasActivity = 
      parseFloat(market.poolYes) > 0 || 
      parseFloat(market.poolNo) > 0;
    
    return hasActivity;
  }

  private async resolveMarket(marketId: string): Promise<void> {
    const marketLogger = logger.child({ marketId });
    
    try {
      marketLogger.info('Starting market resolution');
      
      // Fetch full market data if needed
      // For now, we'll use the simplified market structure
      const market: Market = {
        id: marketId,
        title: '',
        subjectKind: 'HL_METRIC',
        metricId: '',
        token: '',
        predicateOp: 'GT',
        threshold: '0',
        windowKind: 'SNAPSHOT_AT',
        windowStart: '0',
        windowEnd: '0',
        primarySourceId: '',
        fallbackSourceId: '',
        roundingDecimals: 2,
        resolveTime: '0',
        poolYes: '0',
        poolNo: '0',
        resolved: false,
        cancelled: false
      };
      
      // Resolve the market
      const result = await this.resolutionService.resolveMarket(market);
      
      if (result.success) {
        marketLogger.info({
          outcome: result.outcome,
          txHash: result.transactionHash
        }, 'Market resolved successfully');
      } else {
        marketLogger.warn({
          reason: result.reason
        }, 'Market resolution skipped');
      }
      
    } catch (error) {
      marketLogger.error({ error }, 'Failed to resolve market');
      throw error;
    }
  }

  async start(): Promise<void> {
    const port = config.webhookPort || 3000;
    
    this.server = this.app.listen(port, () => {
      logger.info(`Webhook server listening on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`Webhook endpoint: http://localhost:${port}/webhook/market`);
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }
    
    await this.queue.onIdle();
    logger.info('Webhook server stopped');
  }
}