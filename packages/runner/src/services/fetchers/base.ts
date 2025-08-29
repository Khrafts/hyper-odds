import { z } from 'zod';
import { logger } from '../../config/logger';

// Metric subject types from the contract
export enum SubjectKind {
  HL_METRIC = 0,
  TOKEN_PRICE = 1
}

// Metric validation schemas
export const MetricValueSchema = z.object({
  value: z.string(),
  timestamp: z.date(),
  decimals: z.number().min(0).max(18),
  source: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SubjectSchema = z.object({
  kind: z.nativeEnum(SubjectKind),
  metricId: z.string().optional(),
  tokenIdentifier: z.string().optional(),
  valueDecimals: z.number().min(0).max(18),
});

export type MetricValue = z.infer<typeof MetricValueSchema>;
export type Subject = z.infer<typeof SubjectSchema>;

// Fetcher configuration
export interface FetcherConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitDelay?: number;
  enableCaching?: boolean;
  cacheTtl?: number;
}

export const DEFAULT_FETCHER_CONFIG: Required<FetcherConfig> = {
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  rateLimitDelay: 100, // 100ms between requests
  enableCaching: true,
  cacheTtl: 60000, // 1 minute
};

// Base metric fetcher interface
export interface IMetricFetcher {
  readonly name: string;
  readonly supportedSubjects: SubjectKind[];
  
  /**
   * Check if this fetcher can handle the given subject
   */
  canFetch(subject: Subject): boolean;
  
  /**
   * Fetch metric value for the given subject at the specified time
   */
  fetchMetric(subject: Subject, timestamp: Date): Promise<MetricValue>;
  
  /**
   * Validate that the fetcher is properly configured and accessible
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get fetcher-specific information for monitoring
   */
  getInfo(): Promise<{
    name: string;
    version: string;
    supportedSubjects: SubjectKind[];
    lastFetch?: Date;
    totalFetches: number;
    errorCount: number;
    avgResponseTime: number;
  }>;
}

// Base implementation with common functionality
export abstract class BaseMetricFetcher implements IMetricFetcher {
  public readonly name: string;
  public readonly supportedSubjects: SubjectKind[];
  protected readonly config: Required<FetcherConfig>;
  
  // Statistics tracking
  protected totalFetches = 0;
  protected errorCount = 0;
  protected lastFetch?: Date;
  protected responseTimeSum = 0;
  private fetchCache = new Map<string, { value: MetricValue; expires: number }>();

  constructor(
    name: string,
    supportedSubjects: SubjectKind[],
    config: FetcherConfig = {}
  ) {
    this.name = name;
    this.supportedSubjects = supportedSubjects;
    this.config = { ...DEFAULT_FETCHER_CONFIG, ...config };
  }

  abstract canFetch(subject: Subject): boolean;
  protected abstract fetchMetricInternal(subject: Subject, timestamp: Date): Promise<MetricValue>;
  abstract isHealthy(): Promise<boolean>;

  async fetchMetric(subject: Subject, timestamp: Date): Promise<MetricValue> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(subject, timestamp);

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.fetchCache.get(cacheKey);
        if (cached && Date.now() < cached.expires) {
          logger.debug('Returning cached metric value', {
            fetcher: this.name,
            subject: subject,
            cacheKey,
          });
          return cached.value;
        }
      }

      // Validate subject
      const validatedSubject = SubjectSchema.parse(subject);
      
      if (!this.canFetch(validatedSubject)) {
        throw new Error(`Fetcher ${this.name} cannot handle subject: ${JSON.stringify(validatedSubject)}`);
      }

      logger.debug('Fetching metric value', {
        fetcher: this.name,
        subject: validatedSubject,
        timestamp: timestamp.toISOString(),
      });

      // Rate limiting
      await this.applyRateLimit();

      // Fetch with retry logic
      const metricValue = await this.fetchWithRetry(validatedSubject, timestamp);

      // Validate result
      const validatedValue = MetricValueSchema.parse(metricValue);

      // Cache the result
      if (this.config.enableCaching) {
        this.fetchCache.set(cacheKey, {
          value: validatedValue,
          expires: Date.now() + this.config.cacheTtl,
        });
      }

      // Update statistics
      this.totalFetches++;
      this.lastFetch = new Date();
      this.responseTimeSum += Date.now() - startTime;

      logger.info('Successfully fetched metric value', {
        fetcher: this.name,
        subject: validatedSubject,
        value: validatedValue.value,
        source: validatedValue.source,
        responseTime: Date.now() - startTime,
      });

      return validatedValue;

    } catch (error) {
      this.errorCount++;
      
      logger.error('Failed to fetch metric value', {
        fetcher: this.name,
        subject,
        error: error instanceof Error ? error.message : error,
        responseTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  async getInfo(): Promise<{
    name: string;
    version: string;
    supportedSubjects: SubjectKind[];
    lastFetch?: Date;
    totalFetches: number;
    errorCount: number;
    avgResponseTime: number;
  }> {
    const result: {
      name: string;
      version: string;
      supportedSubjects: SubjectKind[];
      lastFetch?: Date;
      totalFetches: number;
      errorCount: number;
      avgResponseTime: number;
    } = {
      name: this.name,
      version: '1.0.0',
      supportedSubjects: this.supportedSubjects,
      totalFetches: this.totalFetches,
      errorCount: this.errorCount,
      avgResponseTime: this.totalFetches > 0 ? this.responseTimeSum / this.totalFetches : 0,
    };

    if (this.lastFetch) {
      result.lastFetch = this.lastFetch;
    }

    return result;
  }

  private getCacheKey(subject: Subject, timestamp: Date): string {
    return `${this.name}:${JSON.stringify(subject)}:${timestamp.toISOString()}`;
  }

  private async applyRateLimit(): Promise<void> {
    if (this.config.rateLimitDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
    }
  }

  private async fetchWithRetry(subject: Subject, timestamp: Date): Promise<MetricValue> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await Promise.race([
          this.fetchMetricInternal(subject, timestamp),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), this.config.timeout)
          ),
        ]);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          
          logger.warn('Fetch attempt failed, retrying', {
            fetcher: this.name,
            attempt,
            maxAttempts: this.config.retryAttempts,
            retryDelay: delay,
            error: error instanceof Error ? error.message : error,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Utility method for cleaning up old cache entries
  protected cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.fetchCache.entries()) {
      if (now >= entry.expires) {
        this.fetchCache.delete(key);
      }
    }
  }
}