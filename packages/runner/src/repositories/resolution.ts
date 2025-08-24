import { Resolution, Prisma } from '@prisma/client';
import { BaseRepository } from './base';
import { logger } from '../config/logger';

export interface CreateResolutionData {
  marketId: string;
  value: string;
  source: string;
  confidence?: number;
  commitTxHash?: string;
  finalizeTxHash?: string;
  blockNumber?: bigint;
  resolvedAt: Date;
  submittedAt?: Date;
  finalizedAt?: Date;
}

export interface UpdateResolutionData {
  value?: string;
  source?: string;
  confidence?: number;
  commitTxHash?: string;
  finalizeTxHash?: string;
  blockNumber?: bigint;
  resolvedAt?: Date;
  submittedAt?: Date;
  finalizedAt?: Date;
}

export class ResolutionRepository extends BaseRepository {
  constructor(prismaClient: any) {
    super(prismaClient);
  }

  async create(data: CreateResolutionData): Promise<Resolution> {
    try {
      logger.debug('Creating resolution record', { 
        marketId: data.marketId,
        value: data.value,
        source: data.source
      });

      const resolution = await this.prisma.resolution.create({
        data: {
          marketId: data.marketId,
          value: data.value,
          source: data.source,
          confidence: data.confidence ?? null,
          commitTxHash: data.commitTxHash ?? null,
          finalizeTxHash: data.finalizeTxHash ?? null,
          blockNumber: data.blockNumber ?? null,
          resolvedAt: data.resolvedAt,
          submittedAt: data.submittedAt ?? null,
          finalizedAt: data.finalizedAt ?? null,
        },
      });

      logger.info('Resolution record created successfully', {
        id: resolution.id,
        marketId: resolution.marketId,
        value: resolution.value,
      });

      return resolution;

    } catch (error) {
      logger.error('Failed to create resolution record:', {
        error: error instanceof Error ? error.message : error,
        marketId: data.marketId,
      });
      throw error;
    }
  }

  async findByMarketId(marketId: string): Promise<Resolution | null> {
    try {
      const resolution = await this.prisma.resolution.findFirst({
        where: { marketId },
      });

      return resolution;

    } catch (error) {
      logger.error('Failed to find resolution by market ID:', {
        error: error instanceof Error ? error.message : error,
        marketId,
      });
      throw error;
    }
  }

  async findByCommitTxHash(commitTxHash: string): Promise<Resolution | null> {
    try {
      const resolution = await this.prisma.resolution.findFirst({
        where: { commitTxHash },
      });

      return resolution;

    } catch (error) {
      logger.error('Failed to find resolution by commit transaction hash:', {
        error: error instanceof Error ? error.message : error,
        commitTxHash,
      });
      throw error;
    }
  }

  async updateFinalization(
    id: string, 
    finalizedAt: Date, 
    finalizeTxHash: string,
    blockNumber?: bigint
  ): Promise<Resolution> {
    try {
      logger.debug('Updating resolution finalization', {
        id,
        finalizedAt: finalizedAt.toISOString(),
        finalizeTxHash,
      });

      const resolution = await this.prisma.resolution.update({
        where: { id },
        data: {
          finalizedAt,
          finalizeTxHash,
          blockNumber: blockNumber ?? null,
          updatedAt: new Date(),
        },
      });

      logger.info('Resolution finalization updated successfully', {
        id: resolution.id,
        marketId: resolution.marketId,
        finalizeTxHash: resolution.finalizeTxHash,
      });

      return resolution;

    } catch (error) {
      logger.error('Failed to update resolution finalization:', {
        error: error instanceof Error ? error.message : error,
        id,
        finalizeTxHash,
      });
      throw error;
    }
  }

  async findPendingResolutions(limit = 100): Promise<Resolution[]> {
    try {
      const resolutions = await this.prisma.resolution.findMany({
        where: {
          finalizedAt: null,
          submittedAt: {
            not: null,
          },
        },
        orderBy: {
          submittedAt: 'asc',
        },
        take: limit,
      });

      return resolutions;

    } catch (error) {
      logger.error('Failed to find pending resolutions:', {
        error: error instanceof Error ? error.message : error,
        limit,
      });
      throw error;
    }
  }

  async findRecentResolutions(hours = 24, limit = 100): Promise<Resolution[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const resolutions = await this.prisma.resolution.findMany({
        where: {
          createdAt: {
            gte: since,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          market: {
            select: {
              title: true,
              status: true,
            },
          },
        },
      });

      return resolutions;

    } catch (error) {
      logger.error('Failed to find recent resolutions:', {
        error: error instanceof Error ? error.message : error,
        hours,
        limit,
      });
      throw error;
    }
  }

  async getResolutionStats(): Promise<{
    totalResolutions: number;
    finalizedResolutions: number;
    pendingResolutions: number;
  }> {
    try {
      const [
        totalResolutions,
        finalizedResolutions,
        pendingResolutions,
      ] = await Promise.all([
        this.prisma.resolution.count(),
        this.prisma.resolution.count({
          where: { finalizedAt: { not: null } },
        }),
        this.prisma.resolution.count({
          where: { finalizedAt: null },
        }),
      ]);

      return {
        totalResolutions,
        finalizedResolutions,
        pendingResolutions,
      };

    } catch (error) {
      logger.error('Failed to get resolution stats:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}