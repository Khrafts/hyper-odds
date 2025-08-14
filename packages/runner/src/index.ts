import 'dotenv/config';
import express from 'express';
import { WebhookServer } from './services/WebhookServer.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('Starting Hyper-Odds Oracle Runner Service (Webhook Mode)');

  try {
    const app = express();
    const webhookServer = new WebhookServer(app);
    
    await webhookServer.start();

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await webhookServer.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error({ error }, 'Failed to start Oracle Runner');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Unhandled error in main');
  process.exit(1);
});