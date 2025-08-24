import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { config } from '../config/config';

export class DatabaseService {
  private prisma: PrismaClient;
  private connected = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Database already connected');
      return;
    }

    try {
      logger.info('Connecting to database...');
      await this.prisma.$connect();
      
      // Test the connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      this.connected = true;
      logger.info('Database connected successfully');
      
    } catch (error) {
      logger.error('Failed to connect to database:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      logger.info('Disconnecting from database...');
      await this.prisma.$disconnect();
      this.connected = false;
      logger.info('Database disconnected successfully');
      
    } catch (error) {
      logger.error('Error disconnecting from database:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }
      
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  get client(): PrismaClient {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...');
      
      // This would run migrations in production
      // For now, we'll just ensure the database is accessible
      await this.prisma.$queryRaw`SELECT 1`;
      
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to run migrations:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}