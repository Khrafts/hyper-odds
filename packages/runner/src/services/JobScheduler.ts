import * as cron from 'node-cron';
import { promises as fs } from 'fs';
import { join } from 'path';
import PQueue from 'p-queue';
import { logger, correlation, perfLogger, errorLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ResolutionService } from './ResolutionService.js';

// Job status enum
enum JobStatus {
  SCHEDULED = 'scheduled',
  EXECUTING = 'executing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Job type enum
enum JobType {
  TIME_BASED = 'time_based',
  IMMEDIATE = 'immediate',
  RETRY = 'retry'
}

// Persistent job interface
interface PersistentJob {
  id: string;
  marketId: string;
  title: string;
  resolveTime: number;
  status: JobStatus;
  type: JobType;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  correlationId?: string;
}

// Runtime job interface (includes non-serializable task)
interface RuntimeJob extends PersistentJob {
  task?: cron.ScheduledTask | NodeJS.Timeout;
}

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

// Job persistence interface
interface JobPersistence {
  saveJob(job: PersistentJob): Promise<void>;
  loadJobs(): Promise<PersistentJob[]>;
  updateJob(jobId: string, updates: Partial<PersistentJob>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  cleanup(): Promise<void>;
}

// File-based persistence implementation
class FileJobPersistence implements JobPersistence {
  private filePath: string;

  constructor(dataDir: string = './data') {
    this.filePath = join(dataDir, 'scheduled-jobs.json');
  }

  async saveJob(job: PersistentJob): Promise<void> {
    const jobs = await this.loadJobs();
    const existingIndex = jobs.findIndex(j => j.id === job.id);
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = job;
    } else {
      jobs.push(job);
    }
    
    await this.writeJobs(jobs);
  }

  async loadJobs(): Promise<PersistentJob[]> {
    try {
      await fs.mkdir(join(this.filePath, '..'), { recursive: true });
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async updateJob(jobId: string, updates: Partial<PersistentJob>): Promise<void> {
    const jobs = await this.loadJobs();
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    
    if (jobIndex >= 0) {
      jobs[jobIndex] = { ...jobs[jobIndex], ...updates, updatedAt: Date.now() };
      await this.writeJobs(jobs);
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    const jobs = await this.loadJobs();
    const filteredJobs = jobs.filter(j => j.id !== jobId);
    await this.writeJobs(filteredJobs);
  }

  async cleanup(): Promise<void> {
    const jobs = await this.loadJobs();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove completed/failed jobs older than a week
    const activeJobs = jobs.filter(job => 
      ![JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(job.status) ||
      job.updatedAt > oneWeekAgo
    );
    
    if (activeJobs.length !== jobs.length) {
      await this.writeJobs(activeJobs);
      logger.info({ 
        removed: jobs.length - activeJobs.length,
        remaining: activeJobs.length 
      }, 'Cleaned up old jobs');
    }
  }

  private async writeJobs(jobs: PersistentJob[]): Promise<void> {
    const data = JSON.stringify(jobs, null, 2);
    await fs.writeFile(this.filePath, data, 'utf8');
  }
}

export class JobScheduler {
  private jobs: Map<string, RuntimeJob> = new Map();
  private resolutionService: ResolutionService;
  private persistence: JobPersistence;
  private queue: PQueue;
  private retryConfig: RetryConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(resolutionService: ResolutionService, persistenceDir?: string) {
    this.resolutionService = resolutionService;
    this.persistence = new FileJobPersistence(persistenceDir);
    
    // Initialize job execution queue with concurrency control
    this.queue = new PQueue({
      concurrency: config.jobConcurrency,
      intervalCap: config.jobConcurrency * 2,
      interval: 1000 // Max X*2 jobs per second
    });

    // Configure retry logic
    this.retryConfig = {
      maxAttempts: config.retryMaxAttempts,
      baseDelay: config.retryDelayBase,
      maxDelay: config.retryDelayBase * 10, // Max 50 seconds
      backoffFactor: 2
    };

    // Start periodic cleanup
    this.startCleanupSchedule();
  }

  // Initialize and recover jobs on startup
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const endTimer = perfLogger.time('job-scheduler-initialization');
    
    try {
      logger.info('Initializing job scheduler with persistence recovery');
      
      // Load persisted jobs
      const persistedJobs = await this.persistence.loadJobs();
      
      logger.info({ 
        jobCount: persistedJobs.length 
      }, 'Loaded persisted jobs from storage');

      // Recover active jobs
      let recoveredCount = 0;
      for (const persistedJob of persistedJobs) {
        if (await this.recoverJob(persistedJob)) {
          recoveredCount++;
        }
      }

      // Cleanup old jobs
      await this.persistence.cleanup();

      this.isInitialized = true;
      
      logger.info({
        totalJobs: persistedJobs.length,
        recoveredJobs: recoveredCount,
        activeJobs: this.jobs.size
      }, 'Job scheduler initialized successfully');

      endTimer();
    } catch (error) {
      endTimer();
      errorLogger.logError(error as Error, { 
        component: 'job-scheduler',
        operation: 'initialize'
      });
      throw error;
    }
  }

  /**
   * Schedule a market for resolution at a specific time
   */
  async scheduleMarketResolution(
    marketId: string,
    title: string,
    resolveTime: number,
    correlationId?: string
  ): Promise<string> {
    const jobId = `${marketId}-${Date.now()}`;
    const jobLogger = correlationId ? 
      correlation.child(correlationId, { jobId, marketId }) : 
      logger.child({ jobId, marketId });

    // Check if job already exists for this market
    const existingJob = this.findJobByMarketId(marketId);
    if (existingJob && existingJob.status === JobStatus.SCHEDULED) {
      jobLogger.warn('Job already scheduled for market');
      return existingJob.id;
    }

    const now = Date.now() / 1000;
    const delaySeconds = resolveTime - now;

    // Create persistent job
    const job: PersistentJob = {
      id: jobId,
      marketId,
      title,
      resolveTime,
      status: JobStatus.SCHEDULED,
      type: delaySeconds <= 0 ? JobType.IMMEDIATE : JobType.TIME_BASED,
      retryCount: 0,
      maxRetries: this.retryConfig.maxAttempts,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      correlationId
    };

    try {
      // Persist the job
      await this.persistence.saveJob(job);

      // Schedule the job
      if (delaySeconds <= 0) {
        await this.scheduleImmediateJob(job, jobLogger);
      } else {
        await this.scheduleTimedJob(job, delaySeconds, jobLogger);
      }

      jobLogger.info({
        title,
        resolveTime: new Date(resolveTime * 1000).toISOString(),
        type: job.type,
        delaySeconds: Math.max(0, delaySeconds)
      }, 'Market resolution job scheduled');

      return jobId;

    } catch (error) {
      errorLogger.logError(error as Error, {
        jobId,
        marketId,
        operation: 'schedule-market-resolution'
      }, correlationId);
      throw error;
    }
  }

  // Job recovery for startup
  private async recoverJob(persistedJob: PersistentJob): Promise<boolean> {
    try {
      // Skip completed/cancelled/failed jobs unless they're retryable failures
      if (persistedJob.status === JobStatus.COMPLETED || 
          persistedJob.status === JobStatus.CANCELLED ||
          (persistedJob.status === JobStatus.FAILED && persistedJob.retryCount >= persistedJob.maxRetries)) {
        return false;
      }

      const now = Date.now() / 1000;
      const delaySeconds = persistedJob.resolveTime - now;

      const jobLogger = logger.child({ 
        jobId: persistedJob.id, 
        marketId: persistedJob.marketId 
      });

      // Handle failed jobs that can be retried
      if (persistedJob.status === JobStatus.FAILED && persistedJob.retryCount < persistedJob.maxRetries) {
        jobLogger.info({ 
          retryCount: persistedJob.retryCount,
          maxRetries: persistedJob.maxRetries
        }, 'Recovering failed job for retry');
        
        await this.scheduleRetryJob(persistedJob, jobLogger);
        return true;
      }

      // Handle jobs that should be executed immediately (past due)
      if (delaySeconds <= 0) {
        jobLogger.info('Recovering overdue job for immediate execution');
        await this.scheduleImmediateJob(persistedJob, jobLogger);
        return true;
      }

      // Handle future scheduled jobs
      jobLogger.info({ delaySeconds }, 'Recovering scheduled job');
      await this.scheduleTimedJob(persistedJob, delaySeconds, jobLogger);
      return true;

    } catch (error) {
      logger.error({ 
        error, 
        jobId: persistedJob.id,
        marketId: persistedJob.marketId 
      }, 'Failed to recover job');
      return false;
    }
  }

  // Schedule immediate execution
  private async scheduleImmediateJob(job: PersistentJob, jobLogger: any): Promise<void> {
    const runtimeJob: RuntimeJob = { ...job };
    this.jobs.set(job.id, runtimeJob);

    // Add to execution queue with small delay to avoid race conditions
    setTimeout(() => {
      this.queue.add(() => this.executeJob(job.id));
    }, 1000);

    jobLogger.debug('Scheduled job for immediate execution');
  }

  // Schedule timed execution
  private async scheduleTimedJob(job: PersistentJob, delaySeconds: number, jobLogger: any): Promise<void> {
    const delayMs = delaySeconds * 1000;
    
    let task: NodeJS.Timeout | cron.ScheduledTask;

    // Use cron for delays longer than 24 hours, setTimeout for shorter delays
    if (delayMs > 24 * 60 * 60 * 1000) {
      task = this.createCronTask(job, jobLogger);
    } else {
      task = this.createTimeoutTask(job, delayMs, jobLogger);
    }

    const runtimeJob: RuntimeJob = { ...job, task };
    this.jobs.set(job.id, runtimeJob);

    jobLogger.debug({ 
      delaySeconds,
      usesCron: delayMs > 24 * 60 * 60 * 1000
    }, 'Scheduled timed job');
  }

  // Create cron task for long delays
  private createCronTask(job: PersistentJob, jobLogger: any): cron.ScheduledTask {
    const resolveDate = new Date(job.resolveTime * 1000);
    const cronExpression = `${resolveDate.getMinutes()} ${resolveDate.getHours()} ${resolveDate.getDate()} ${resolveDate.getMonth() + 1} *`;

    const task = cron.schedule(cronExpression, () => {
      jobLogger.info('Executing cron-scheduled job');
      this.queue.add(() => this.executeJob(job.id));
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    return task;
  }

  // Create timeout task for short delays
  private createTimeoutTask(job: PersistentJob, delayMs: number, jobLogger: any): NodeJS.Timeout {
    return setTimeout(() => {
      jobLogger.info('Executing timeout-scheduled job');
      this.queue.add(() => this.executeJob(job.id));
    }, delayMs);
  }

  // Schedule retry job with exponential backoff
  private async scheduleRetryJob(job: PersistentJob, jobLogger: any): Promise<void> {
    const retryDelay = this.calculateRetryDelay(job.retryCount);
    
    jobLogger.info({ 
      retryDelay,
      retryCount: job.retryCount 
    }, 'Scheduling retry job');

    const retryJob: PersistentJob = {
      ...job,
      type: JobType.RETRY,
      status: JobStatus.SCHEDULED,
      updatedAt: Date.now()
    };

    const task = setTimeout(() => {
      this.queue.add(() => this.executeJob(job.id));
    }, retryDelay);

    const runtimeJob: RuntimeJob = { ...retryJob, task };
    this.jobs.set(job.id, runtimeJob);

    await this.persistence.updateJob(job.id, {
      status: JobStatus.SCHEDULED,
      type: JobType.RETRY,
      updatedAt: Date.now()
    });
  }

  // Execute a job with error handling and retry logic
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn({ jobId }, 'Job not found for execution');
      return;
    }

    const jobLogger = job.correlationId ?
      correlation.child(job.correlationId, { jobId, marketId: job.marketId }) :
      logger.child({ jobId, marketId: job.marketId });

    const endTimer = perfLogger.time('job-execution');

    try {
      // Update job status to executing
      await this.updateJobStatus(jobId, JobStatus.EXECUTING);

      jobLogger.info({
        marketId: job.marketId,
        title: job.title,
        retryCount: job.retryCount
      }, 'Executing market resolution job');

      // Execute the actual resolution
      await this.resolutionService.resolveMarket(job.marketId);

      // Mark job as completed
      await this.updateJobStatus(jobId, JobStatus.COMPLETED);
      this.jobs.delete(jobId);

      jobLogger.info('Market resolution job completed successfully');
      endTimer();

    } catch (error) {
      endTimer();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      jobLogger.error({ 
        error: errorMessage,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      }, 'Market resolution job failed');

      // Handle retry logic
      if (job.retryCount < job.maxRetries) {
        await this.handleJobRetry(jobId, errorMessage, jobLogger);
      } else {
        await this.handleJobFailure(jobId, errorMessage, jobLogger);
      }
    }
  }

  // Handle job retry
  private async handleJobRetry(jobId: string, errorMessage: string, jobLogger: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const newRetryCount = job.retryCount + 1;
    const retryDelay = this.calculateRetryDelay(newRetryCount);

    jobLogger.info({
      retryCount: newRetryCount,
      maxRetries: job.maxRetries,
      retryDelay
    }, 'Scheduling job retry');

    // Update job for retry
    await this.persistence.updateJob(jobId, {
      status: JobStatus.SCHEDULED,
      type: JobType.RETRY,
      retryCount: newRetryCount,
      lastError: errorMessage,
      updatedAt: Date.now()
    });

    // Schedule retry
    const retryTask = setTimeout(() => {
      this.queue.add(() => this.executeJob(jobId));
    }, retryDelay);

    // Update runtime job
    const updatedJob = { ...job, retryCount: newRetryCount, task: retryTask };
    this.jobs.set(jobId, updatedJob);
  }

  // Handle final job failure
  private async handleJobFailure(jobId: string, errorMessage: string, jobLogger: any): Promise<void> {
    jobLogger.error({
      retryCount: this.jobs.get(jobId)?.retryCount,
      maxRetries: this.retryConfig.maxAttempts
    }, 'Job failed permanently after max retries');

    await this.updateJobStatus(jobId, JobStatus.FAILED, errorMessage);
    this.jobs.delete(jobId);
  }

  // Calculate retry delay with exponential backoff
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1),
      this.retryConfig.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  // Update job status with persistence
  private async updateJobStatus(jobId: string, status: JobStatus, error?: string): Promise<void> {
    const updates: Partial<PersistentJob> = {
      status,
      updatedAt: Date.now()
    };

    if (error) {
      updates.lastError = error;
    }

    await this.persistence.updateJob(jobId, updates);
    
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  // Helper methods
  private findJobByMarketId(marketId: string): RuntimeJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.marketId === marketId) {
        return job;
      }
    }
    return undefined;
  }

  private startCleanupSchedule(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.persistence.cleanup();
      } catch (error) {
        logger.error({ error }, 'Failed to run scheduled cleanup');
      }
    }, 60 * 60 * 1000);
  }

  // Public API methods

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string, correlationId?: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    const jobLogger = correlationId ?
      correlation.child(correlationId, { jobId }) :
      logger.child({ jobId });

    try {
      // Stop the scheduled task
      if (job.task) {
        if ('stop' in job.task) {
          job.task.stop();
        } else {
          clearTimeout(job.task);
        }
      }

      // Update persistence
      await this.updateJobStatus(jobId, JobStatus.CANCELLED);
      this.jobs.delete(jobId);

      jobLogger.info({
        marketId: job.marketId,
        title: job.title
      }, 'Job cancelled successfully');

      return true;

    } catch (error) {
      errorLogger.logError(error as Error, {
        jobId,
        operation: 'cancel-job'
      }, correlationId);
      return false;
    }
  }

  /**
   * Get all scheduled jobs with status information
   */
  getScheduledJobs(): Array<{
    id: string;
    marketId: string;
    title: string;
    resolveTime: number;
    resolveDate: string;
    status: string;
    type: string;
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    updatedAt: string;
    lastError?: string;
  }> {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      marketId: job.marketId,
      title: job.title,
      resolveTime: job.resolveTime,
      resolveDate: new Date(job.resolveTime * 1000).toISOString(),
      status: job.status,
      type: job.type,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt).toISOString(),
      lastError: job.lastError
    }));
  }

  /**
   * Get job statistics
   */
  getJobStats(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    queueSize: number;
    queuePending: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    const byStatus = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = jobs.reduce((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: jobs.length,
      byStatus,
      byType,
      queueSize: this.queue.size,
      queuePending: this.queue.pending
    };
  }

  /**
   * Clean up all jobs and shutdown
   */
  async destroy(): Promise<void> {
    logger.info('Shutting down job scheduler');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Stop all scheduled jobs
    for (const job of this.jobs.values()) {
      if (job.task) {
        if ('stop' in job.task) {
          job.task.stop();
        } else {
          clearTimeout(job.task);
        }
      }
    }

    // Clear the queue (but don't interrupt running jobs)
    this.queue.clear();

    // Wait for running jobs to complete (with timeout)
    if (this.queue.pending > 0) {
      logger.info({ pendingJobs: this.queue.pending }, 'Waiting for running jobs to complete');
      await Promise.race([
        this.queue.onIdle(),
        new Promise(resolve => setTimeout(resolve, 30000)) // 30s timeout
      ]);
    }

    this.jobs.clear();
    logger.info('Job scheduler shutdown complete');
  }
}