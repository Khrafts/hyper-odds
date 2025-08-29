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
      
      if (config.NODE_ENV === 'production') {
        // Production: use prisma migrate deploy for safe migrations
        logger.info('Production mode: deploying pending migrations');
        await this.deployMigrations();
      } else {
        // Development: verify migrations are applied
        logger.info('Development mode: checking migration status');
        await this.verifyMigrations();
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

  private async deployMigrations(): Promise<void> {
    try {
      // Production: deploy pending migrations safely
      logger.info('Deploying pending migrations...');
      
      // Check migration status first
      const { execSync } = require('child_process');
      const result = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      logger.info('Migration status:', { status: result.trim() });
      
      // Deploy migrations
      execSync('npx prisma migrate deploy', { 
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      logger.info('Migrations deployed successfully');
    } catch (error) {
      logger.error('Failed to deploy migrations:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async verifyMigrations(): Promise<void> {
    try {
      // Development: check if migrations are applied
      logger.info('Verifying migration status...');
      
      // Verify core tables exist
      await this.verifyDatabaseSchema();
      
      logger.info('Migration verification passed');
    } catch (error) {
      logger.error('Migration verification failed:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}