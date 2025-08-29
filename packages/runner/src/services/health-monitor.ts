import { logger } from '../config/logger';
import { config } from '../config/config';
import { RepositoryFactory } from '../repositories';
import { OracleService } from './oracle';
import { TransactionMonitorService } from './transaction-monitor';
import { MetricFetcherRegistry } from './fetchers';
import { AlertManagerService } from './alert-manager';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: Record<string, ComponentHealth>;
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
}

export class HealthMonitorService {
  private repositories: RepositoryFactory;
  private oracle: OracleService;
  private transactionMonitor: TransactionMonitorService;
  private metricFetchers: MetricFetcherRegistry;
  private alertManager: AlertManagerService | undefined;

  constructor(
    repositories: RepositoryFactory,
    oracle: OracleService,
    transactionMonitor: TransactionMonitorService,
    metricFetchers: MetricFetcherRegistry,
    alertManager?: AlertManagerService
  ) {
    this.repositories = repositories;
    this.oracle = oracle;
    this.transactionMonitor = transactionMonitor;
    this.metricFetchers = metricFetchers;
    this.alertManager = alertManager;
  }

  /**
   * Perform comprehensive health check of all services
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: Record<string, ComponentHealth> = {};

    logger.debug('Starting comprehensive health check...');

    // Run all health checks in parallel for faster response
    const [
      databaseHealth,
      oracleHealth,
      transactionMonitorHealth,
      metricFetchersHealth,
      jobQueueHealth,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkOracle(),
      this.checkTransactionMonitor(),
      this.checkMetricFetchers(),
      this.checkJobQueue(),
    ]);

    // Process results
    checks.database = this.processHealthResult(databaseHealth);
    checks.oracle = this.processHealthResult(oracleHealth);
    checks.transactionMonitor = this.processHealthResult(transactionMonitorHealth);
    checks.metricFetchers = this.processHealthResult(metricFetchersHealth);
    checks.jobQueue = this.processHealthResult(jobQueueHealth);

    // Calculate summary
    const summary = this.calculateSummary(checks);

    // Determine overall status
    const overallStatus = this.determineOverallStatus(summary);

    const totalTime = Date.now() - startTime;

    logger.info('Health check completed', {
      status: overallStatus,
      duration: `${totalTime}ms`,
      summary,
    });

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      summary,
    };

    // Process alerts if alert manager is available
    if (this.alertManager) {
      try {
        await this.alertManager.processHealthCheck(result);
      } catch (error) {
        logger.error('Failed to process health check alerts:', {
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return result;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await this.repositories.jobs.count();

      // Test market queries (basic read operation)
      const marketCount = await this.repositories.markets.count();

      // Test job queries
      const jobCount = await this.repositories.jobs.count();

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: responseTime < 1000 ? 'Database responsive' : 'Database slow response',
        responseTime,
        details: {
          marketCount,
          jobCount,
          responseTimeThreshold: '1000ms',
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check Oracle service health
   */
  private async checkOracle(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.oracle.isHealthy();
      const serviceInfo = await this.oracle.getServiceInfo();
      
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        message: isHealthy ? 'Oracle service operational' : 'Oracle service issues detected',
        responseTime,
        details: {
          walletAddress: serviceInfo.walletAddress,
          contractAddress: serviceInfo.oracleAddress,
          disputeWindow: serviceInfo.disputeWindow,
          balance: serviceInfo.balance,
          minBalance: serviceInfo.minimumBalance,
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: 'Oracle service check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check transaction monitoring service
   */
  private async checkTransactionMonitor(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.transactionMonitor.isHealthy();
      const stats = this.transactionMonitor.getStatistics();
      
      const responseTime = Date.now() - startTime;

      // Consider degraded if there are many old pending transactions
      const hasOldTransactions = stats.oldestTransaction && 
        (Date.now() - stats.oldestTransaction.getTime()) > (config.TRANSACTION_TIMEOUT * 2);

      const status = !isHealthy ? 'unhealthy' : 
        (hasOldTransactions || stats.totalPending > 50) ? 'degraded' : 'healthy';

      return {
        status,
        message: isHealthy ? 'Transaction monitor operational' : 'Transaction monitor issues',
        responseTime,
        details: {
          totalPending: stats.totalPending,
          byType: stats.byType,
          averageAge: `${Math.round(stats.averageAge / 1000)}s`,
          oldestTransaction: stats.oldestTransaction?.toISOString(),
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: 'Transaction monitor check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check metric fetchers connectivity
   */
  private async checkMetricFetchers(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test a simple health check on all registered fetchers
      const fetcherNames = this.metricFetchers.getRegisteredFetchers();
      const healthChecks = await Promise.allSettled(
        fetcherNames.map(async (name: string) => {
          const fetcher = this.metricFetchers.getFetcher(name);
          return {
            name,
            healthy: fetcher ? await fetcher.isHealthy() : false,
          };
        })
      );

      const responseTime = Date.now() - startTime;
      
      const results = healthChecks.map((result: PromiseSettledResult<{name: string, healthy: boolean}>, i: number) => ({
        name: fetcherNames[i] || 'unknown',
        healthy: result.status === 'fulfilled' ? result.value.healthy : false,
        error: result.status === 'rejected' ? String(result.reason) : undefined,
      }));

      const healthyCount = results.filter(r => r.healthy).length;
      const totalCount = results.length;

      const status = healthyCount === totalCount ? 'healthy' :
        healthyCount > 0 ? 'degraded' : 'unhealthy';

      return {
        status,
        message: `${healthyCount}/${totalCount} metric fetchers operational`,
        responseTime,
        details: {
          fetchers: results,
          healthyCount,
          totalCount,
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: 'Metric fetchers check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check job queue health
   */
  private async checkJobQueue(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Get job statistics
      const stats = await this.repositories.jobs.getJobStats();
      const stuckJobs = await this.repositories.jobs.getStuckJobs();
      
      const responseTime = Date.now() - startTime;

      // Consider degraded if there are many failed jobs or stuck jobs
      const failedRatio = stats.totalJobs > 0 ? stats.failedJobs / stats.totalJobs : 0;
      const hasStuckJobs = stuckJobs.length > 0;

      const status = hasStuckJobs || failedRatio > 0.1 ? 'degraded' : 'healthy';

      return {
        status,
        message: status === 'healthy' ? 'Job queue operational' : 'Job queue has issues',
        responseTime,
        details: {
          totalJobs: stats.totalJobs,
          pendingJobs: stats.pendingJobs,
          processingJobs: stats.processingJobs,
          completedJobs: stats.completedJobs,
          failedJobs: stats.failedJobs,
          stuckJobs: stuckJobs.length,
          failedRatio: Math.round(failedRatio * 100),
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: 'Job queue check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get system metrics and statistics
   */
  async getSystemMetrics(): Promise<{
    uptime: number;
    memory: NodeJS.MemoryUsage;
    nodeVersion: string;
    environment: string;
    timestamp: Date;
  }> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: config.NODE_ENV,
      timestamp: new Date(),
    };
  }

  /**
   * Get detailed service statistics
   */
  async getServiceStatistics(): Promise<{
    database: any;
    oracle: any;
    transactions: any;
    jobs: any;
  }> {
    try {
      const [dbStats, oracleInfo, txStats, jobStats] = await Promise.allSettled([
        this.repositories.markets.getStats(),
        this.oracle.getServiceInfo(),
        this.transactionMonitor.getStatistics(),
        this.repositories.jobs.getJobStats(),
      ]);

      return {
        database: dbStats.status === 'fulfilled' ? dbStats.value : { error: String(dbStats.reason) },
        oracle: oracleInfo.status === 'fulfilled' ? oracleInfo.value : { error: String(oracleInfo.reason) },
        transactions: txStats.status === 'fulfilled' ? txStats.value : { error: String(txStats.reason) },
        jobs: jobStats.status === 'fulfilled' ? jobStats.value : { error: String(jobStats.reason) },
      };

    } catch (error) {
      logger.error('Failed to get service statistics:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Process health check promise result
   */
  private processHealthResult(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        error: String(result.reason),
      };
    }
  }

  /**
   * Calculate health check summary
   */
  private calculateSummary(checks: Record<string, ComponentHealth>) {
    const statuses = Object.values(checks).map(check => check.status);
    
    return {
      healthy: statuses.filter(s => s === 'healthy').length,
      degraded: statuses.filter(s => s === 'degraded').length,
      unhealthy: statuses.filter(s => s === 'unhealthy').length,
      total: statuses.length,
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(summary: { healthy: number; degraded: number; unhealthy: number; total: number }): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.unhealthy > 0) {
      return 'unhealthy';
    } else if (summary.degraded > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}