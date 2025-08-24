import { Job, JobStatus, JobType, Prisma } from '@prisma/client';
import { BaseRepository } from './base';
import { JobData } from '../types';

export class JobRepository extends BaseRepository {
  
  async create(data: {
    type: JobType;
    marketId?: string;
    scheduledFor: Date;
    data?: JobData;
    maxAttempts?: number;
  }): Promise<Job> {
    try {
      this.logOperation('create', { 
        type: data.type, 
        marketId: data.marketId,
        scheduledFor: data.scheduledFor 
      });

      const jobData: Prisma.JobCreateInput = {
        type: data.type,
        scheduledFor: data.scheduledFor,
        data: data.data || {},
        maxAttempts: data.maxAttempts || 3,
        ...(data.marketId && { market: { connect: { id: data.marketId } } })
      };

      return await this.prisma.job.create({
        data: jobData
      });
    } catch (error) {
      this.handleError('create', error);
    }
  }

  async findById(id: string): Promise<Job | null> {
    try {
      this.logOperation('findById', { id });
      return await this.prisma.job.findUnique({
        where: { id },
        include: {
          market: true
        }
      });
    } catch (error) {
      this.handleError('findById', error);
    }
  }

  async findPendingJobs(limit?: number): Promise<Job[]> {
    try {
      this.logOperation('findPendingJobs', { limit });
      const query: any = {
        where: {
          status: JobStatus.PENDING,
          scheduledFor: { lte: new Date() }
        },
        include: {
          market: true
        },
        orderBy: { scheduledFor: 'asc' }
      };
      
      if (limit !== undefined) {
        query.take = limit;
      }
      
      return await this.prisma.job.findMany(query);
    } catch (error) {
      this.handleError('findPendingJobs', error);
    }
  }

  async findJobsForMarket(marketId: string): Promise<Job[]> {
    try {
      this.logOperation('findJobsForMarket', { marketId });
      return await this.prisma.job.findMany({
        where: { marketId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError('findJobsForMarket', error);
    }
  }

  async findJobsByType(type: JobType, status?: JobStatus): Promise<Job[]> {
    try {
      this.logOperation('findJobsByType', { type, status });
      return await this.prisma.job.findMany({
        where: {
          type,
          ...(status && { status })
        },
        include: {
          market: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError('findJobsByType', error);
    }
  }

  async updateStatus(
    id: string, 
    status: JobStatus, 
    error?: string,
    result?: any
  ): Promise<Job> {
    try {
      this.logOperation('updateStatus', { id, status });

      const updateData: Prisma.JobUpdateInput = {
        status,
        updatedAt: new Date(),
        ...(error && { error }),
        ...(result && { result }),
        ...(status === JobStatus.PROCESSING && { startedAt: new Date() }),
        ...(status === JobStatus.COMPLETED && { completedAt: new Date() }),
      };

      return await this.prisma.job.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      this.handleError('updateStatus', error);
    }
  }

  async incrementAttempts(id: string): Promise<Job> {
    try {
      this.logOperation('incrementAttempts', { id });
      return await this.prisma.job.update({
        where: { id },
        data: {
          attempts: { increment: 1 },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('incrementAttempts', error);
    }
  }

  async markForRetry(id: string, nextAttemptTime: Date): Promise<Job> {
    try {
      this.logOperation('markForRetry', { id, nextAttemptTime });
      return await this.prisma.job.update({
        where: { id },
        data: {
          status: JobStatus.RETRYING,
          scheduledFor: nextAttemptTime,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('markForRetry', error);
    }
  }

  async markFailed(id: string, error: string): Promise<Job> {
    try {
      this.logOperation('markFailed', { id });
      return await this.prisma.job.update({
        where: { id },
        data: {
          status: JobStatus.FAILED,
          error,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('markFailed', error);
    }
  }

  async deleteCompleted(olderThan: Date): Promise<number> {
    try {
      this.logOperation('deleteCompleted', { olderThan });
      const result = await this.prisma.job.deleteMany({
        where: {
          status: JobStatus.COMPLETED,
          completedAt: { lt: olderThan }
        }
      });
      return result.count;
    } catch (error) {
      this.handleError('deleteCompleted', error);
    }
  }

  async count(): Promise<number> {
    try {
      this.logOperation('count');
      return await this.prisma.job.count();
    } catch (error) {
      this.handleError('count', error);
    }
  }

  async countByStatus(status: JobStatus): Promise<number> {
    try {
      this.logOperation('countByStatus', { status });
      return await this.prisma.job.count({
        where: { status }
      });
    } catch (error) {
      this.handleError('countByStatus', error);
    }
  }

  async getFailedJobs(limit?: number): Promise<Job[]> {
    try {
      this.logOperation('getFailedJobs', { limit });
      const query: any = {
        where: { status: JobStatus.FAILED },
        include: {
          market: true
        },
        orderBy: { updatedAt: 'desc' }
      };
      
      if (limit !== undefined) {
        query.take = limit;
      }
      
      return await this.prisma.job.findMany(query);
    } catch (error) {
      this.handleError('getFailedJobs', error);
    }
  }
}