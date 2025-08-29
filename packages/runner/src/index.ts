import { config } from './config/config';
import { logger } from './config/logger';
import { Application } from './app';

async function main(): Promise<void> {
  try {
    logger.info('Starting Market Runner Service...', {
      nodeEnv: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    });

    const app = new Application();
    await app.start();

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await app.shutdown();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.message : reason
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    logger.info('Market Runner Service started successfully');

  } catch (error) {
    logger.error('Failed to start Market Runner Service:', {
      error: error instanceof Error ? error.message : error
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});