import { Queue, Worker, Job as BullJob, QueueOptions, WorkerOptions } from 'bullmq';
import { RedisService } from './redis';
import { logger } from '../config/logger';
import { config } from '../config/config';
import { JobType, JobStatus } from '@prisma/client';
import { RepositoryFactory } from '../repositories';

export interface JobData {
  jobId?: string; // Database job ID
  marketId?: string;
  action: string;
  timestamp?: number;
  retryCount?: number;
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

// Forward declaration to avoid circular dependency
interface IMarketProcessor {
  processMarketResolution(marketId: string): Promise<void>;
  processMarketFinalization(marketId: string): Promise<void>;
}

export class JobSchedulerService {
  private redis: RedisService;
  private repositories: RepositoryFactory;
  private marketProcessor?: IMarketProcessor;
  private queue: Queue<JobData>;
  private worker: Worker<JobData, JobResult>;
  private isRunning = false;

  constructor(redis: RedisService, repositories: RepositoryFactory) {
    this.redis = redis;
    this.repositories = repositories;

    // Initialize placeholders - will be set up during start()
    this.queue = null as any;
    this.worker = null as any;
  }

  /**
   * Set market processor (called after initialization to avoid circular dependency)
   */
  setMarketProcessor(marketProcessor: IMarketProcessor): void {
    this.marketProcessor = marketProcessor;
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info('Job completed successfully', {
        jobId: job.id,
        name: job.name,
        data: job.data,
        result,
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Job failed', {
        jobId: job?.id,
        name: job?.name,
        data: job?.data,
        error: err.message,
        attempts: job?.attemptsMade,
        maxAttempts: job?.opts?.attempts,
      });
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { jobId });
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error:', { error: error.message });
    });

    this.queue.on('error', (error) => {
      logger.error('Queue error:', { error: error.message });
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Job scheduler already running');
      return;
    }

    try {
      if (!this.redis.isConnected()) {
        throw new Error('Redis service not connected');
      }

      logger.info('Starting job scheduler service...');

      // Set up queue and worker now that Redis is connected
      const queueOptions: QueueOptions = {
        connection: this.redis.redisClient as any,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: config.JOB_RETRY_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: config.JOB_RETRY_DELAY,
          },
        },
      };

      this.queue = new Queue('market-jobs', queueOptions);

      const workerOptions: WorkerOptions = {
        connection: this.redis.redisClient as any,
        concurrency: config.MAX_CONCURRENT_JOBS,
        maxStalledCount: 3,
        stalledInterval: 30000,
      };

      this.worker = new Worker('market-jobs', this.processJob.bind(this), workerOptions);
      this.setupEventHandlers();

      // Clean up old jobs on startup
      await this.queue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Clean completed jobs older than 24 hours
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');  // Clean failed jobs older than 7 days

      // Process any pending jobs from database
      await this.processPendingJobs();

      this.isRunning = true;
      logger.info('Job scheduler service started successfully');

    } catch (error) {
      logger.error('Failed to start job scheduler service:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping job scheduler service...');

    try {
      await this.worker.close();
      await this.queue.close();
      
      this.isRunning = false;
      logger.info('Job scheduler service stopped');

    } catch (error) {
      logger.error('Error stopping job scheduler service:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async processJob(job: BullJob<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing job', {
        jobId: job.id,
        name: job.name,
        data: job.data,
        attemptsMade: job.attemptsMade,
      });

      // Update database job status to processing
      if (job.data.jobId) {
        await this.repositories.jobs.updateStatus(job.data.jobId, JobStatus.PROCESSING);
      }

      // Process based on job type/action
      let result: any;
      switch (job.data.action) {
        case 'resolve':
          result = await this.processMarketResolution(job.data);
          break;
        case 'finalize':
          result = await this.processMarketFinalization(job.data);
          break;
        case 'fetch-metric':
          result = await this.processFetchMetric(job.data);
          break;
        case 'health-check':
          result = await this.processHealthCheck(job.data);
          break;
        default:
          throw new Error(`Unknown job action: ${job.data.action}`);
      }

      // Update database job status to completed
      if (job.data.jobId) {
        await this.repositories.jobs.updateStatus(
          job.data.jobId, 
          JobStatus.COMPLETED, 
          undefined, 
          result
        );
      }

      const duration = Date.now() - startTime;
      logger.info('Job processed successfully', {
        jobId: job.id,
        duration: `${duration}ms`,
        result,
      });

      return {
        success: true,
        result,
        timestamp: Date.now(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update database job status
      if (job.data.jobId) {
        if (job.attemptsMade >= (job.opts?.attempts || 3) - 1) {
          // Final attempt failed
          await this.repositories.jobs.markFailed(job.data.jobId, errorMessage);
        } else {
          // Will retry
          await this.repositories.jobs.incrementAttempts(job.data.jobId);
        }
      }

      logger.error('Job processing failed', {
        jobId: job.id,
        error: errorMessage,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts?.attempts,
      });

      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  private async processMarketResolution(data: JobData): Promise<any> {
    if (!data.marketId) {
      throw new Error('Market ID required for resolution job');
    }

    if (!this.marketProcessor) {
      throw new Error('MarketProcessor not set - cannot process resolution jobs');
    }

    logger.info('Processing market resolution', {
      marketId: data.marketId,
      timestamp: data.timestamp,
    });

    await this.marketProcessor.processMarketResolution(data.marketId);

    return { action: 'resolve', marketId: data.marketId, status: 'completed' };
  }

  private async processMarketFinalization(data: JobData): Promise<any> {
    if (!data.marketId) {
      throw new Error('Market ID required for finalization job');
    }

    if (!this.marketProcessor) {
      throw new Error('MarketProcessor not set - cannot process finalization jobs');
    }

    logger.info('Processing market finalization', {
      marketId: data.marketId,
      timestamp: data.timestamp,
    });

    await this.marketProcessor.processMarketFinalization(data.marketId);

    return { action: 'finalize', marketId: data.marketId, status: 'completed' };
  }

  private async processFetchMetric(data: JobData): Promise<any> {
    logger.info('Processing fetch metric job', { data });
    
    // TODO: Integrate with metric fetching services
    return { action: 'fetch-metric', status: 'completed' };
  }

  private async processHealthCheck(data: JobData): Promise<any> {
    logger.info('Processing health check job', { data });
    
    // Basic health check
    return { 
      action: 'health-check', 
      status: 'healthy',
      timestamp: Date.now(),
    };
  }

  // Schedule a job immediately
  async scheduleJob(jobType: JobType, data: JobData, delay = 0): Promise<string> {
    try {
      const bullJob = await this.queue.add(
        jobType,
        data,
        { 
          delay,
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      logger.info('Job scheduled in queue', {
        bullJobId: bullJob.id,
        jobType,
        delay,
        data,
      });

      return bullJob.id!;
    } catch (error) {
      logger.error('Failed to schedule job in queue:', {
        error: error instanceof Error ? error.message : error,
        jobType,
        data,
      });
      throw error;
    }
  }

  // Schedule a job at a specific time
  async scheduleJobAt(jobType: JobType, data: JobData, scheduledFor: Date): Promise<string> {
    const delay = Math.max(0, scheduledFor.getTime() - Date.now());
    return this.scheduleJob(jobType, data, delay);
  }

  // Process any pending jobs from database on startup
  private async processPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await this.repositories.jobs.findPendingJobs(100);
      
      if (pendingJobs.length === 0) {
        return;
      }

      logger.info(`Found ${pendingJobs.length} pending jobs, adding to queue`);

      for (const dbJob of pendingJobs) {
        const delay = Math.max(0, dbJob.scheduledFor.getTime() - Date.now());
        
        await this.queue.add(
          dbJob.type,
          {
            jobId: dbJob.id,
            ...dbJob.data as JobData,
          },
          { 
            delay,
            jobId: `db-${dbJob.id}`, // Ensure uniqueness
          }
        );
      }

      logger.info(`Added ${pendingJobs.length} pending jobs to queue`);
    } catch (error) {
      logger.error('Failed to process pending jobs:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Get queue statistics
  async getStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isRunning) {
        return false;
      }

      // Check if worker is running and queue is accessible
      await this.queue.getWaiting();
      return true;
    } catch (error) {
      logger.error('Job scheduler health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  getRunningStatus(): boolean {
    return this.isRunning;
  }
}