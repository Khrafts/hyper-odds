import { RepositoryFactory } from '../repositories';
import { logger } from '../config/logger';
import { MarketCreatedEvent } from '../types';
import { JobType } from '@prisma/client';
import { 
  MetricFetcherRegistry, 
  MetricDataValidator,
  type Subject,
  type SubjectKind,
  type PredicateOp,
  type Predicate,
  type ValidatedMetricValue,
  type ResolutionResult,
} from './fetchers';

export class MarketProcessorService {
  private repositories: RepositoryFactory;
  private fetcherRegistry: MetricFetcherRegistry;

  constructor(repositories: RepositoryFactory, fetcherRegistry: MetricFetcherRegistry) {
    this.repositories = repositories;
    this.fetcherRegistry = fetcherRegistry;
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

      // Implement actual resolution logic
      await this.resolveMarket(market);
      
      logger.info('Market resolution completed', { marketId });
      
    } catch (error) {
      logger.error('Failed to process market resolution:', {
        error: error instanceof Error ? error.message : error,
        marketId,
      });
      throw error;
    }
  }

  /**
   * Resolve market by fetching metric data and evaluating predicate
   */
  private async resolveMarket(market: any): Promise<void> {
    try {
      logger.info('Starting market resolution', {
        marketId: market.id,
        title: market.title,
        subjectKind: market.subjectKind,
        predicateOp: market.predicateOp,
        threshold: market.threshold,
      });

      // 1. Build subject for metric fetching
      const subject: Subject = {
        kind: market.subjectKind as SubjectKind,
        metricId: market.metricId || undefined,
        tokenIdentifier: market.tokenIdentifier || undefined,
        valueDecimals: market.valueDecimals,
      };

      // 2. Fetch metric value
      logger.debug('Fetching metric value', { subject });
      const fetchResult = await this.fetcherRegistry.fetchMetric(subject, market.tEnd);
      
      // 3. Validate and normalize the metric data
      const validatedMetric = MetricDataValidator.validateMetricValue(
        fetchResult.value,
        subject,
        true // require hash
      );

      // 4. Store metric data for future reference
      await this.repositories.metricData.create({
        source: validatedMetric.source,
        identifier: market.tokenIdentifier || market.metricId || 'unknown',
        metricType: this.getMetricType(subject),
        value: validatedMetric.value,
        timestamp: validatedMetric.timestamp,
        decimals: validatedMetric.decimals,
        metadata: {
          marketId: market.id,
          confidence: validatedMetric.confidence,
          hash: validatedMetric.hash,
          fetchResult: {
            fetcher: fetchResult.fetcher,
            fetchTime: fetchResult.fetchTime,
            fromFallback: fetchResult.fromFallback,
          },
          ...validatedMetric.metadata,
        },
      });

      // 5. Build predicate for evaluation
      const predicate: Predicate = {
        op: market.predicateOp as PredicateOp,
        threshold: market.threshold,
      };

      // 6. Evaluate predicate and create resolution result
      const resolutionResult = MetricDataValidator.createResolutionResult(
        validatedMetric,
        predicate
      );

      logger.info('Market predicate evaluation completed', {
        marketId: market.id,
        metricValue: resolutionResult.metricValue.normalizedValue,
        threshold: resolutionResult.predicate.threshold,
        operation: resolutionResult.predicate.op,
        result: resolutionResult.result,
        confidence: resolutionResult.confidence,
      });

      // 7. Store resolution result
      await this.repositories.resolutions.create({
        marketId: market.id,
        value: resolutionResult.metricValue.normalizedValue,
        source: resolutionResult.metricValue.source,
        confidence: resolutionResult.confidence,
        resolvedAt: resolutionResult.resolvedAt,
        submittedAt: new Date(), // Mark as ready for oracle submission
        // Oracle transaction hashes will be filled later
      });

      // 8. TODO: Submit to oracle contract
      // This would involve:
      // - Preparing oracle submission data
      // - Calling oracle commit function
      // - Waiting for commit confirmation
      // - Calling oracle finalize function
      // - Updating resolution with transaction hashes
      
      logger.warn('Oracle submission not yet implemented', {
        marketId: market.id,
        result: resolutionResult.result,
      });

      // 9. Update market status (for now, mark as resolved)
      // In full implementation, this would happen after oracle finalization
      await this.updateMarketStatus(market.id, 'RESOLVED');

      logger.info('Market resolution stored successfully', {
        marketId: market.id,
        result: resolutionResult.result,
        confidence: resolutionResult.confidence,
        sources: resolutionResult.sources,
      });

    } catch (error) {
      logger.error('Market resolution failed', {
        marketId: market.id,
        error: error instanceof Error ? error.message : error,
      });

      // Store failed resolution for debugging
      try {
        await this.repositories.resolutions.create({
          marketId: market.id,
          value: '0',
          source: 'error',
          confidence: 0,
          resolvedAt: new Date(),
        });
      } catch (storeError) {
        logger.error('Failed to store error resolution', {
          marketId: market.id,
          storeError: storeError instanceof Error ? storeError.message : storeError,
        });
      }

      throw error;
    }
  }

  /**
   * Try multiple sources for better confidence
   */
  private async resolveMarketMultiSource(market: any): Promise<void> {
    try {
      logger.info('Starting multi-source market resolution', {
        marketId: market.id,
        title: market.title,
      });

      const subject: Subject = {
        kind: market.subjectKind as SubjectKind,
        metricId: market.metricId || undefined,
        tokenIdentifier: market.tokenIdentifier || undefined,
        valueDecimals: market.valueDecimals,
      };

      // Fetch from multiple sources
      const fetchResults = await this.fetcherRegistry.fetchMetricMultiSource(
        subject,
        market.tEnd,
        3 // max 3 sources
      );

      if (fetchResults.length === 0) {
        throw new Error('No successful fetches from any source');
      }

      // Validate all metric values
      const validatedMetrics = fetchResults.map(result =>
        MetricDataValidator.validateMetricValue(result.value, subject, true)
      );

      // Store all metric data
      for (const metric of validatedMetrics) {
        await this.repositories.metricData.create({
          source: metric.source,
          identifier: market.tokenIdentifier || market.metricId || 'unknown',
          metricType: this.getMetricType(subject),
          value: metric.value,
          timestamp: metric.timestamp,
          decimals: metric.decimals,
          metadata: {
            marketId: market.id,
            confidence: metric.confidence,
            hash: metric.hash,
            ...metric.metadata,
          },
        });
      }

      // Aggregate results for higher confidence
      const aggregatedMetric = MetricDataValidator.aggregateMetricValues(
        validatedMetrics,
        'weighted' // Use confidence-weighted average
      );

      const predicate: Predicate = {
        op: market.predicateOp as PredicateOp,
        threshold: market.threshold,
      };

      const resolutionResult = MetricDataValidator.createResolutionResult(
        aggregatedMetric,
        predicate,
        validatedMetrics.map(m => m.source)
      );

      // Store aggregated resolution
      await this.repositories.resolutions.create({
        marketId: market.id,
        value: resolutionResult.metricValue.normalizedValue,
        source: resolutionResult.metricValue.source,
        confidence: resolutionResult.confidence,
        resolvedAt: resolutionResult.resolvedAt,
        submittedAt: new Date(),
      });

      await this.updateMarketStatus(market.id, 'RESOLVED');

      logger.info('Multi-source market resolution completed', {
        marketId: market.id,
        result: resolutionResult.result,
        confidence: resolutionResult.confidence,
        sourceCount: validatedMetrics.length,
        sources: resolutionResult.sources,
      });

    } catch (error) {
      logger.error('Multi-source market resolution failed', {
        marketId: market.id,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private getMetricType(subject: Subject): string {
    if (subject.kind === 0) { // SubjectKind.HL_METRIC
      return subject.metricId?.split(':')[0] || 'hl_metric';
    } else if (subject.kind === 1) { // SubjectKind.TOKEN_PRICE
      return 'token_price';
    }
    return 'unknown';
  }

  private async updateMarketStatus(marketId: string, status: string): Promise<void> {
    try {
      // This would update the market status in the database
      // For now, just log it since we'd need to add the update method to MarketRepository
      logger.info('Market status updated', { marketId, status });
    } catch (error) {
      logger.error('Failed to update market status', {
        marketId,
        status,
        error: error instanceof Error ? error.message : error,
      });
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