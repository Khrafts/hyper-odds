import { IMetricFetcher, Subject, MetricValue, SubjectKind } from './base';
import { logger } from '../../config/logger';

export interface FetcherRegistryOptions {
  enableFallbacks?: boolean;
  maxConcurrentFetches?: number;
  healthCheckInterval?: number;
}

export interface FetchResult {
  value: MetricValue;
  fetcher: string;
  fetchTime: number;
  fromFallback: boolean;
}

export class MetricFetcherRegistry {
  private fetchers = new Map<string, IMetricFetcher>();
  private healthStatus = new Map<string, { healthy: boolean; lastCheck: Date; error?: string }>();
  private options: Required<FetcherRegistryOptions>;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(options: FetcherRegistryOptions = {}) {
    this.options = {
      enableFallbacks: options.enableFallbacks ?? true,
      maxConcurrentFetches: options.maxConcurrentFetches ?? 5,
      healthCheckInterval: options.healthCheckInterval ?? 60000, // 1 minute
    };
  }

  /**
   * Register a metric fetcher
   */
  register(fetcher: IMetricFetcher): void {
    if (this.fetchers.has(fetcher.name)) {
      throw new Error(`Fetcher with name '${fetcher.name}' is already registered`);
    }

    this.fetchers.set(fetcher.name, fetcher);
    this.healthStatus.set(fetcher.name, {
      healthy: true,
      lastCheck: new Date(),
    });

    logger.info('Registered metric fetcher', {
      name: fetcher.name,
      supportedSubjects: fetcher.supportedSubjects,
    });
  }

  /**
   * Unregister a metric fetcher
   */
  unregister(name: string): boolean {
    const removed = this.fetchers.delete(name);
    this.healthStatus.delete(name);
    
    if (removed) {
      logger.info('Unregistered metric fetcher', { name });
    }
    
    return removed;
  }

  /**
   * Get all registered fetchers
   */
  getFetchers(): IMetricFetcher[] {
    return Array.from(this.fetchers.values());
  }

  /**
   * Get registered fetcher names
   */
  getRegisteredFetchers(): string[] {
    return Array.from(this.fetchers.keys());
  }

  /**
   * Get fetcher by name
   */
  getFetcher(name: string): IMetricFetcher | undefined {
    return this.fetchers.get(name);
  }

  /**
   * Get fetchers that can handle a specific subject
   */
  getFetchersForSubject(subject: Subject): IMetricFetcher[] {
    return this.getFetchers().filter(fetcher => 
      fetcher.canFetch(subject) && this.isFetcherHealthy(fetcher.name)
    );
  }

  /**
   * Get the best fetcher for a subject (primary choice)
   */
  getBestFetcher(subject: Subject): IMetricFetcher | null {
    const candidates = this.getFetchersForSubject(subject);
    
    if (candidates.length === 0) {
      return null;
    }

    // For now, return the first healthy fetcher
    // In the future, could implement priority/performance-based selection
    return candidates[0] || null;
  }

  /**
   * Fetch metric value with automatic fallback support
   */
  async fetchMetric(subject: Subject, timestamp: Date): Promise<FetchResult> {
    const startTime = Date.now();
    const candidates = this.getFetchersForSubject(subject);

    if (candidates.length === 0) {
      throw new Error(`No healthy fetchers available for subject: ${JSON.stringify(subject)}`);
    }

    logger.debug('Attempting to fetch metric', {
      subject,
      timestamp: timestamp.toISOString(),
      availableFetchers: candidates.map(f => f.name),
    });

    // Try primary fetcher first
    const primaryFetcher = candidates[0];
    if (!primaryFetcher) {
      throw new Error('No primary fetcher available');
    }
    
    try {
      const value = await primaryFetcher.fetchMetric(subject, timestamp);
      
      return {
        value,
        fetcher: primaryFetcher.name,
        fetchTime: Date.now() - startTime,
        fromFallback: false,
      };
    } catch (primaryError) {
      logger.warn('Primary fetcher failed', {
        fetcher: primaryFetcher.name,
        error: primaryError instanceof Error ? primaryError.message : primaryError,
      });

      // Mark fetcher as potentially unhealthy
      this.markFetcherUnhealthy(primaryFetcher.name, primaryError);

      // Try fallback fetchers if enabled
      if (this.options.enableFallbacks && candidates.length > 1) {
        return await this.tryFallbackFetchers(subject, timestamp, candidates.slice(1), startTime);
      }

      throw primaryError;
    }
  }

  /**
   * Fetch metric from multiple sources and return aggregated result
   */
  async fetchMetricMultiSource(
    subject: Subject,
    timestamp: Date,
    maxSources = 3
  ): Promise<FetchResult[]> {
    const candidates = this.getFetchersForSubject(subject);
    const sourcesToUse = candidates.slice(0, maxSources);

    if (sourcesToUse.length === 0) {
      throw new Error(`No healthy fetchers available for subject: ${JSON.stringify(subject)}`);
    }

    logger.debug('Fetching metric from multiple sources', {
      subject,
      timestamp: timestamp.toISOString(),
      sources: sourcesToUse.map(f => f.name),
    });

    const fetchPromises = sourcesToUse.map(async (fetcher) => {
      const startTime = Date.now();
      try {
        const value = await fetcher.fetchMetric(subject, timestamp);
        return {
          value,
          fetcher: fetcher.name,
          fetchTime: Date.now() - startTime,
          fromFallback: false,
        };
      } catch (error) {
        logger.warn('Multi-source fetch failed', {
          fetcher: fetcher.name,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const successful = results
      .filter((result): result is PromiseFulfilledResult<FetchResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successful.length === 0) {
      throw new Error('All fetchers failed to retrieve metric data');
    }

    return successful;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      return; // Already started
    }

    this.healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this.options.healthCheckInterval
    );

    logger.info('Started periodic health checks for metric fetchers', {
      interval: this.options.healthCheckInterval,
    });
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info('Stopped periodic health checks for metric fetchers');
    }
  }

  /**
   * Get health status of all fetchers
   */
  getHealthStatus(): { [fetcherName: string]: { healthy: boolean; lastCheck: Date; error?: string } } {
    const status: { [fetcherName: string]: { healthy: boolean; lastCheck: Date; error?: string } } = {};
    
    for (const [name, health] of this.healthStatus.entries()) {
      status[name] = { ...health };
    }
    
    return status;
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<{
    totalFetchers: number;
    healthyFetchers: number;
    fetcherStats: Array<{
      name: string;
      healthy: boolean;
      supportedSubjects: SubjectKind[];
      totalFetches: number;
      errorCount: number;
      avgResponseTime: number;
      lastFetch?: Date;
    }>;
  }> {
    const fetcherStats = await Promise.all(
      this.getFetchers().map(async (fetcher) => {
        const info = await fetcher.getInfo();
        const health = this.healthStatus.get(fetcher.name);
        
        return {
          name: fetcher.name,
          healthy: health?.healthy ?? false,
          supportedSubjects: info.supportedSubjects,
          totalFetches: info.totalFetches,
          errorCount: info.errorCount,
          avgResponseTime: info.avgResponseTime,
          ...(info.lastFetch ? { lastFetch: info.lastFetch } : {}),
        };
      })
    );

    return {
      totalFetchers: this.fetchers.size,
      healthyFetchers: fetcherStats.filter(s => s.healthy).length,
      fetcherStats,
    };
  }

  private async tryFallbackFetchers(
    subject: Subject,
    timestamp: Date,
    fallbacks: IMetricFetcher[],
    startTime: number
  ): Promise<FetchResult> {
    for (const fetcher of fallbacks) {
      try {
        logger.info('Trying fallback fetcher', { fetcher: fetcher.name });
        
        const value = await fetcher.fetchMetric(subject, timestamp);
        
        return {
          value,
          fetcher: fetcher.name,
          fetchTime: Date.now() - startTime,
          fromFallback: true,
        };
      } catch (fallbackError) {
        logger.warn('Fallback fetcher failed', {
          fetcher: fetcher.name,
          error: fallbackError instanceof Error ? fallbackError.message : fallbackError,
        });

        this.markFetcherUnhealthy(fetcher.name, fallbackError);
      }
    }

    throw new Error('All fetchers (including fallbacks) failed');
  }

  private isFetcherHealthy(name: string): boolean {
    const health = this.healthStatus.get(name);
    return health?.healthy ?? false;
  }

  private markFetcherUnhealthy(name: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.healthStatus.set(name, {
      healthy: false,
      lastCheck: new Date(),
      error: errorMessage,
    });

    logger.warn('Marked fetcher as unhealthy', {
      fetcher: name,
      error: errorMessage,
    });
  }

  private async performHealthChecks(): Promise<void> {
    logger.debug('Performing health checks on metric fetchers');

    for (const [name, fetcher] of this.fetchers.entries()) {
      try {
        const healthy = await fetcher.isHealthy();
        
        this.healthStatus.set(name, {
          healthy,
          lastCheck: new Date(),
          ...(healthy ? {} : { error: 'Health check failed' }),
        });

        if (!healthy) {
          logger.warn('Fetcher health check failed', { fetcher: name });
        }
      } catch (error) {
        this.markFetcherUnhealthy(name, error);
      }
    }
  }
}