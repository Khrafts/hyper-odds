import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute a function within a database transaction
   */
  protected async transaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(fn);
    } catch (error) {
      logger.error('Transaction failed:', {
        error: error instanceof Error ? error.message : error,
        repository: this.constructor.name
      });
      throw error;
    }
  }

  /**
   * Handle repository errors with consistent logging
   */
  protected handleError(operation: string, error: unknown): never {
    logger.error('Repository operation failed:', {
      operation,
      repository: this.constructor.name,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }

  /**
   * Log repository operations for debugging
   */
  protected logOperation(operation: string, details?: Record<string, unknown>): void {
    logger.debug('Repository operation:', {
      operation,
      repository: this.constructor.name,
      ...details
    });
  }
}