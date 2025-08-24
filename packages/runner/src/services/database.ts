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
      
      // In production, this would use the migrate deploy command
      // For development, we ensure the database schema matches by pushing the schema
      if (config.NODE_ENV === 'production') {
        logger.warn('Production migration requires running: npx prisma migrate deploy');
        // Verify database is accessible and schema exists
        await this.verifyDatabaseSchema();
      } else {
        // Development: push schema changes
        logger.info('Development mode: ensuring database schema is up to date');
        await this.pushDatabaseSchema();
      }
      
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to run migrations:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async verifyDatabaseSchema(): Promise<void> {
    try {
      // Check if core tables exist by querying system tables
      const result = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('Market', 'Job', 'Resolution', 'MetricData')
      `;
      
      const tableNames = result.map(row => row.table_name);
      const expectedTables = ['Market', 'Job', 'Resolution', 'MetricData'];
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing database tables: ${missingTables.join(', ')}. Run migrations first.`);
      }
      
      logger.info('Database schema verification passed');
    } catch (error) {
      logger.error('Database schema verification failed:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async pushDatabaseSchema(): Promise<void> {
    try {
      // In development, we can use db push to sync schema
      // This is equivalent to running: npx prisma db push
      logger.info('Pushing database schema changes...');
      
      // For now, just verify the connection works
      // In a full implementation, this would use Prisma's programmatic API
      await this.prisma.$queryRaw`SELECT 1`;
      
      logger.warn('Note: Run "npx prisma db push" manually to sync schema changes in development');
    } catch (error) {
      logger.error('Failed to push database schema:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}