import 'dotenv/config';
import express from 'express';
import { EventListener } from './services/EventListener.js';
import { JobScheduler } from './services/JobScheduler.js';
import { ResolutionService } from './services/ResolutionService.js';
import { ContractService } from './services/ContractService.js';
import { HyperliquidAPI } from './services/HyperliquidAPI.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { ethers } from 'ethers';

async function main() {
  logger.info('Starting Hyper-Odds Oracle Runner Service (Event Listener Mode)');

  try {
    // Initialize services
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    
    const hyperliquidAPI = new HyperliquidAPI(config.hyperliquidApiUrl);
    const contractService = new ContractService(wallet, config.oracleAddress);
    const resolutionService = new ResolutionService(contractService, hyperliquidAPI);
    
    // Initialize job scheduler
    const jobScheduler = new JobScheduler(resolutionService);
    
    // Initialize event listener
    const eventListener = new EventListener(jobScheduler);
    
    // Start the event listener
    await eventListener.start();
    
    // Start a simple HTTP server for health checks and manual triggers
    const app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (_req, res) => {
      const scheduledJobs = jobScheduler.getScheduledJobs();
      res.json({
        status: 'healthy',
        mode: 'event-listener',
        timestamp: new Date().toISOString(),
        scheduledJobs: scheduledJobs.length,
        jobs: scheduledJobs
      });
    });
    
    // Manual resolution endpoint
    app.post('/resolve/:marketId', async (req, res) => {
      try {
        const marketId = req.params.marketId;
        logger.info({ marketId }, 'Manual resolution triggered');
        
        await resolutionService.resolveMarket(marketId);
        res.json({ success: true, message: 'Market resolved' });
      } catch (error) {
        logger.error({ error }, 'Error in manual resolution');
        res.status(500).json({ error: 'Failed to resolve market' });
      }
    });
    
    // Cancel scheduled job endpoint
    app.delete('/job/:marketId', (req, res) => {
      const marketId = req.params.marketId;
      const cancelled = jobScheduler.cancelJob(marketId);
      
      if (cancelled) {
        res.json({ success: true, message: 'Job cancelled' });
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    });
    
    // Get all scheduled jobs
    app.get('/jobs', (_req, res) => {
      const jobs = jobScheduler.getScheduledJobs();
      res.json({ jobs });
    });
    
    const port = parseInt(process.env.WEBHOOK_PORT || '3001');
    app.listen(port, () => {
      logger.info({ port }, 'HTTP server started for health checks and manual operations');
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      await eventListener.stop();
      jobScheduler.destroy();
      
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    logger.info('Oracle Runner started successfully in event listener mode');

  } catch (error) {
    logger.error({ error }, 'Failed to start Oracle Runner');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Unhandled error in main');
  process.exit(1);
});