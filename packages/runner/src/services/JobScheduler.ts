import * as cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { ResolutionService } from './ResolutionService.js';

interface ScheduledJob {
  marketId: string;
  title: string;
  resolveTime: number;
  task: cron.ScheduledTask;
}

export class JobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private resolutionService: ResolutionService;

  constructor(resolutionService: ResolutionService) {
    this.resolutionService = resolutionService;
  }

  /**
   * Schedule a market for resolution at a specific time
   */
  scheduleMarketResolution(
    marketId: string,
    title: string,
    resolveTime: number
  ): void {
    // Check if job already exists
    if (this.jobs.has(marketId)) {
      logger.warn({ marketId }, 'Job already scheduled for market');
      return;
    }

    const now = Date.now() / 1000; // Current time in seconds
    const delaySeconds = resolveTime - now;

    if (delaySeconds <= 0) {
      // Market should be resolved immediately
      logger.info({ marketId, title }, 'Market resolution time has passed, resolving immediately');
      this.resolveMarketImmediately(marketId);
      return;
    }

    // Convert to milliseconds for setTimeout
    const delayMs = delaySeconds * 1000;

    // If delay is more than 24 hours, use cron job
    if (delayMs > 24 * 60 * 60 * 1000) {
      this.scheduleWithCron(marketId, title, resolveTime);
    } else {
      // Use setTimeout for shorter delays
      this.scheduleWithTimeout(marketId, title, resolveTime, delayMs);
    }
  }

  /**
   * Schedule with setTimeout for delays less than 24 hours
   */
  private scheduleWithTimeout(
    marketId: string,
    title: string,
    resolveTime: number,
    delayMs: number
  ): void {
    const timeoutId = setTimeout(async () => {
      logger.info({ marketId, title }, 'Executing scheduled market resolution');
      await this.resolveMarket(marketId);
      this.jobs.delete(marketId);
    }, delayMs);

    // Store the job
    const job: ScheduledJob = {
      marketId,
      title,
      resolveTime,
      task: {
        stop: () => clearTimeout(timeoutId),
        start: () => {},
        destroy: () => clearTimeout(timeoutId),
        getStatus: () => 'scheduled'
      } as any
    };

    this.jobs.set(marketId, job);

    const resolveDate = new Date(resolveTime * 1000);
    logger.info({
      marketId,
      title,
      resolveTime: resolveDate.toISOString(),
      delaySeconds: delayMs / 1000
    }, 'Market resolution scheduled');
  }

  /**
   * Schedule with cron for longer delays
   */
  private scheduleWithCron(
    marketId: string,
    title: string,
    resolveTime: number
  ): void {
    const resolveDate = new Date(resolveTime * 1000);
    
    // Create cron expression for the specific date/time
    const minute = resolveDate.getMinutes();
    const hour = resolveDate.getHours();
    const dayOfMonth = resolveDate.getDate();
    const month = resolveDate.getMonth() + 1; // Cron months are 1-indexed
    
    const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} *`;

    const task = cron.schedule(cronExpression, async () => {
      logger.info({ marketId, title }, 'Executing scheduled market resolution');
      await this.resolveMarket(marketId);
      this.jobs.delete(marketId);
      task.destroy();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    const job: ScheduledJob = {
      marketId,
      title,
      resolveTime,
      task
    };

    this.jobs.set(marketId, job);

    logger.info({
      marketId,
      title,
      resolveTime: resolveDate.toISOString(),
      cronExpression
    }, 'Market resolution scheduled with cron');
  }

  /**
   * Resolve a market immediately
   */
  private async resolveMarketImmediately(marketId: string): Promise<void> {
    // Add a small delay to avoid race conditions
    setTimeout(async () => {
      await this.resolveMarket(marketId);
    }, 5000); // 5 second delay
  }

  /**
   * Execute market resolution
   */
  private async resolveMarket(marketId: string): Promise<void> {
    try {
      logger.info({ marketId }, 'Starting market resolution');
      await this.resolutionService.resolveMarket(marketId);
      logger.info({ marketId }, 'Market resolution completed');
    } catch (error) {
      logger.error({ error, marketId }, 'Failed to resolve market');
      // Could implement retry logic here
    }
  }

  /**
   * Cancel a scheduled job
   */
  cancelJob(marketId: string): boolean {
    const job = this.jobs.get(marketId);
    if (!job) {
      return false;
    }

    job.task.stop();
    job.task.destroy();
    this.jobs.delete(marketId);

    logger.info({ marketId, title: job.title }, 'Cancelled scheduled resolution');
    return true;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): Array<{
    marketId: string;
    title: string;
    resolveTime: number;
    resolveDate: string;
  }> {
    return Array.from(this.jobs.values()).map(job => ({
      marketId: job.marketId,
      title: job.title,
      resolveTime: job.resolveTime,
      resolveDate: new Date(job.resolveTime * 1000).toISOString()
    }));
  }

  /**
   * Clean up all jobs
   */
  destroy(): void {
    for (const job of this.jobs.values()) {
      job.task.stop();
      job.task.destroy();
    }
    this.jobs.clear();
    logger.info('All scheduled jobs cleared');
  }
}