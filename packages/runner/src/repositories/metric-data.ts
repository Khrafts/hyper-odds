import { MetricData } from '@prisma/client';
import { BaseRepository } from './base';
import { logger } from '../config/logger';

export interface CreateMetricDataData {
  source: string;
  identifier: string;
  metricType: string;
  value: string;
  timestamp: Date;
  decimals?: number;
  metadata?: Record<string, any>;
}

export interface UpdateMetricDataData {
  value?: string;
  timestamp?: Date;
  decimals?: number;
  metadata?: Record<string, any>;
}

export class MetricDataRepository extends BaseRepository {
  constructor(prismaClient: any) {
    super(prismaClient);
  }

  async create(data: CreateMetricDataData): Promise<MetricData> {
    try {
      logger.debug('Creating metric data record', { 
        source: data.source,
        identifier: data.identifier,
        metricType: data.metricType,
        value: data.value,
      });

      const metricData = await this.prisma.metricData.create({
        data: {
          source: data.source,
          identifier: data.identifier,
          metricType: data.metricType,
          value: data.value,
          timestamp: data.timestamp,
          decimals: data.decimals ?? null,
          metadata: data.metadata ?? {},
        },
      });

      logger.info('Metric data record created successfully', {
        id: metricData.id,
        source: metricData.source,
        identifier: metricData.identifier,
        metricType: metricData.metricType,
        value: metricData.value,
      });

      return metricData;

    } catch (error) {
      logger.error('Failed to create metric data record:', {
        error: error instanceof Error ? error.message : error,
        source: data.source,
        identifier: data.identifier,
        metricType: data.metricType,
      });
      throw error;
    }
  }

  async findBySourceAndIdentifier(
    source: string, 
    identifier: string, 
    limit = 10
  ): Promise<MetricData[]> {
    try {
      const metricData = await this.prisma.metricData.findMany({
        where: { 
          source,
          identifier,
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return metricData;

    } catch (error) {
      logger.error('Failed to find metric data by source and identifier:', {
        error: error instanceof Error ? error.message : error,
        source,
        identifier,
        limit,
      });
      throw error;
    }
  }

  async findLatestBySourceAndIdentifier(
    source: string, 
    identifier: string
  ): Promise<MetricData | null> {
    try {
      const metricData = await this.prisma.metricData.findFirst({
        where: { 
          source,
          identifier,
        },
        orderBy: { timestamp: 'desc' },
      });

      return metricData;

    } catch (error) {
      logger.error('Failed to find latest metric data by source and identifier:', {
        error: error instanceof Error ? error.message : error,
        source,
        identifier,
      });
      throw error;
    }
  }

  async findBySourceAndType(
    source: string, 
    metricType: string, 
    limit = 100
  ): Promise<MetricData[]> {
    try {
      const metricData = await this.prisma.metricData.findMany({
        where: { 
          source,
          metricType,
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return metricData;

    } catch (error) {
      logger.error('Failed to find metric data by source and type:', {
        error: error instanceof Error ? error.message : error,
        source,
        metricType,
        limit,
      });
      throw error;
    }
  }

  async findRecentBySource(source: string, hours = 24, limit = 100): Promise<MetricData[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const metricData = await this.prisma.metricData.findMany({
        where: {
          source,
          timestamp: {
            gte: since,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return metricData;

    } catch (error) {
      logger.error('Failed to find recent metric data by source:', {
        error: error instanceof Error ? error.message : error,
        source,
        hours,
        limit,
      });
      throw error;
    }
  }

  async deleteOldData(olderThanDays = 30): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      logger.info('Cleaning up old metric data', {
        cutoff: cutoff.toISOString(),
        olderThanDays,
      });

      const result = await this.prisma.metricData.deleteMany({
        where: {
          timestamp: {
            lt: cutoff,
          },
        },
      });

      logger.info('Old metric data cleaned up successfully', {
        deletedCount: result.count,
        cutoff: cutoff.toISOString(),
      });

      return result.count;

    } catch (error) {
      logger.error('Failed to clean up old metric data:', {
        error: error instanceof Error ? error.message : error,
        olderThanDays,
      });
      throw error;
    }
  }

  async getSourceStats(): Promise<{
    [source: string]: {
      count: number;
      latest: Date | null;
      oldest: Date | null;
    };
  }> {
    try {
      const sources = await this.prisma.metricData.groupBy({
        by: ['source'],
        _count: {
          source: true,
        },
        _min: {
          timestamp: true,
        },
        _max: {
          timestamp: true,
        },
      });

      const stats: { [source: string]: { count: number; latest: Date | null; oldest: Date | null } } = {};

      for (const source of sources) {
        stats[source.source] = {
          count: source._count.source,
          latest: source._max.timestamp,
          oldest: source._min.timestamp,
        };
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get source stats:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getMetricStats(): Promise<{
    totalRecords: number;
    uniqueSources: number;
    uniqueIdentifiers: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    try {
      const [
        totalRecords,
        uniqueSources,
        uniqueIdentifiers,
        dateStats,
      ] = await Promise.all([
        this.prisma.metricData.count(),
        this.prisma.metricData.findMany({
          select: { source: true },
          distinct: ['source'],
        }).then(results => results.length),
        this.prisma.metricData.findMany({
          select: { identifier: true },
          distinct: ['identifier'],
        }).then(results => results.length),
        this.prisma.metricData.aggregate({
          _min: { timestamp: true },
          _max: { timestamp: true },
        }),
      ]);

      return {
        totalRecords,
        uniqueSources,
        uniqueIdentifiers,
        oldestRecord: dateStats._min.timestamp,
        newestRecord: dateStats._max.timestamp,
      };

    } catch (error) {
      logger.error('Failed to get metric stats:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}