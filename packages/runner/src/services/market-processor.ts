import { RepositoryFactory } from '../repositories';
import { logger } from '../config/logger';
import { MarketCreatedEvent } from '../types';
import { JobType } from '@prisma/client';

export class MarketProcessorService {
  private repositories: RepositoryFactory;

  constructor(repositories: RepositoryFactory) {
    this.repositories = repositories;
  }

  async processMarketCreatedEvent(event: MarketCreatedEvent): Promise<void> {
    try {
      logger.info('Processing MarketCreated event', {
        marketAddress: event.marketAddress,
        creator: event.creator,
        title: event.marketParams.title,
        blockNumber: event.blockNumber.toString(),
      });

      // Check for duplicate processing
      const existingMarket = await this.repositories.markets.findById(event.marketAddress);
      if (existingMarket) {
        logger.warn('Market already exists, skipping processing', {
          marketAddress: event.marketAddress,
          transactionHash: event.transactionHash,
        });
        return;
      }

      // Create market record in database
      const market = await this.repositories.markets.createFromEvent(event);
      
      logger.info('Market created successfully', {
        marketId: market.id,
        title: market.title,
        resolutionTime: market.tEnd.toISOString(),
        cutoffTime: market.cutoffTime.toISOString(),
      });

      // Schedule resolution job for when the market window ends
      await this.scheduleMarketResolution(market.id, market.tEnd);

      logger.info('Market processing completed', {
        marketId: market.id,
        jobsScheduled: 1,
      });

    } catch (error) {
      logger.error('Failed to process MarketCreated event:', {
        error: error instanceof Error ? error.message : error,
        marketAddress: event.marketAddress,
        transactionHash: event.transactionHash,
      });
      throw error;
    }
  }

  private async scheduleMarketResolution(marketId: string, resolutionTime: Date): Promise<void> {
    try {
      logger.debug('Scheduling market resolution job', {
        marketId,
        resolutionTime: resolutionTime.toISOString(),
      });

      // Schedule the resolution job for the market end time
      const job = await this.repositories.jobs.create({
        type: JobType.RESOLVE_MARKET,
        marketId,
        scheduledFor: resolutionTime,
        data: {
          marketId,
          action: 'resolve',
          timestamp: resolutionTime.getTime(),
        },
        maxAttempts: 3,
      });

      logger.info('Market resolution job scheduled', {
        jobId: job.id,
        marketId,
        scheduledFor: resolutionTime.toISOString(),
      });

    } catch (error) {
      logger.error('Failed to schedule market resolution job:', {
        error: error instanceof Error ? error.message : error,
        marketId,
        resolutionTime: resolutionTime.toISOString(),
      });
      throw error;
    }
  }

  async processMarketResolution(marketId: string): Promise<void> {
    try {
      logger.info('Processing market resolution', { marketId });

      // Get market details
      const market = await this.repositories.markets.findById(marketId);
      if (!market) {
        throw new Error(`Market not found: ${marketId}`);
      }

      // Check if already resolved
      if (market.resolvedAt) {
        logger.warn('Market already resolved', {
          marketId,
          resolvedAt: market.resolvedAt.toISOString(),
        });
        return;
      }

      // Check if resolution time has passed
      const now = new Date();
      if (now < market.tEnd) {
        logger.warn('Market resolution time has not arrived yet', {
          marketId,
          resolutionTime: market.tEnd.toISOString(),
          currentTime: now.toISOString(),
        });
        return;
      }

      logger.info('Market ready for resolution', {
        marketId,
        title: market.title,
        subject: {
          kind: market.subjectKind,
          tokenIdentifier: market.tokenIdentifier,
          metricId: market.metricId,
        },
        predicate: {
          op: market.predicateOp,
          threshold: market.threshold,
        },
      });

      // TODO: Implement actual resolution logic
      // This would involve:
      // 1. Fetching the metric value based on market.subject
      // 2. Comparing it against market.predicate
      // 3. Submitting the result to the oracle contract
      // 4. Updating the market status in the database
      
      logger.info('Market resolution logic not yet implemented', { marketId });
      
    } catch (error) {
      logger.error('Failed to process market resolution:', {
        error: error instanceof Error ? error.message : error,
        marketId,
      });
      throw error;
    }
  }

  // Utility method to get market statistics
  async getMarketStats(): Promise<{
    totalMarkets: number;
    activeMarkets: number;
    resolvedMarkets: number;
    pendingResolution: number;
  }> {
    try {
      const totalMarkets = await this.repositories.markets.count();
      const activeMarkets = await this.repositories.markets.countByStatus('ACTIVE');
      const resolvedMarkets = await this.repositories.markets.countByStatus('RESOLVED');
      
      // Find markets ready for resolution
      const readyForResolution = await this.repositories.markets.findReadyForResolution(new Date());
      const pendingResolution = readyForResolution.length;

      return {
        totalMarkets,
        activeMarkets,
        resolvedMarkets,
        pendingResolution,
      };
    } catch (error) {
      logger.error('Failed to get market stats:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}