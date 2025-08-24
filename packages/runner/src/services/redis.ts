import { createClient, RedisClientType } from 'redis';
import { logger } from '../config/logger';
import { config } from '../config/config';

export class RedisService {
  private client: RedisClientType;
  private connected = false;

  constructor() {
    const clientOptions: any = {
      url: config.REDIS_URL,
      database: config.REDIS_DB,
    };
    
    if (config.REDIS_PASSWORD) {
      clientOptions.password = config.REDIS_PASSWORD;
    }
    
    this.client = createClient(clientOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      logger.error('Redis error:', { error: error.message });
    });

    this.client.on('connect', () => {
      logger.debug('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.connected = true;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Redis already connected');
      return;
    }

    try {
      logger.info('Connecting to Redis...');
      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      
      this.connected = true;
      logger.info('Redis connected successfully');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', {
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
      logger.info('Disconnecting from Redis...');
      await this.client.disconnect();
      this.connected = false;
      logger.info('Redis disconnected successfully');
      
    } catch (error) {
      logger.error('Error disconnecting from Redis:', {
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
      
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  get redisClient(): RedisClientType {
    if (!this.connected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Utility methods for common Redis operations
  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    try {
      if (options?.ex) {
        await this.client.setEx(key, options.ex, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET failed:', {
        key,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET failed:', {
        key,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL failed:', {
        key,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS failed:', {
        key,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async setObject<T>(key: string, value: T, options?: { ex?: number }): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, options);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse Redis object:', {
        key,
        value,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }
}