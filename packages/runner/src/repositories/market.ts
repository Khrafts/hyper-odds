import { Market, MarketStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './base';
import { MarketCreatedEvent } from '../types';

export class MarketRepository extends BaseRepository {
  
  async createFromEvent(event: MarketCreatedEvent): Promise<Market> {
    try {
      this.logOperation('createFromEvent', { marketAddress: event.marketAddress });

      const marketData: Prisma.MarketCreateInput = {
        id: event.marketAddress,
        factoryAddress: event.marketParams.creator, // Assuming factory deployed this
        implementationType: this.getImplementationType(event.marketParams),
        title: event.marketParams.title,
        description: event.marketParams.description,
        
        // Subject parameters
        subjectKind: this.mapSubjectKind(event.marketParams.subject.kind),
        metricId: event.marketParams.subject.kind === 0 ? event.marketParams.subject.metricId : null,
        tokenIdentifier: event.marketParams.subject.kind === 1 ? event.marketParams.subject.tokenIdentifier : null,
        valueDecimals: event.marketParams.subject.valueDecimals,
        
        // Predicate parameters
        predicateOp: this.mapPredicateOp(event.marketParams.predicate.op),
        threshold: event.marketParams.predicate.threshold.toString(),
        
        // Window parameters
        windowKind: this.mapWindowKind(event.marketParams.window.kind),
        tStart: new Date(Number(event.marketParams.window.tStart) * 1000),
        tEnd: new Date(Number(event.marketParams.window.tEnd) * 1000),
        
        // Oracle configuration
        primarySourceId: event.marketParams.oracle.primarySourceId,
        fallbackSourceId: event.marketParams.oracle.fallbackSourceId || null,
        roundingDecimals: event.marketParams.oracle.roundingDecimals,
        
        // Timing
        cutoffTime: new Date(Number(event.marketParams.cutoffTime) * 1000),
        
        // Economic parameters
        feeBps: event.marketParams.econ.feeBps,
        creatorFeeShareBps: event.marketParams.econ.creatorFeeShareBps,
        maxTotalPool: event.marketParams.econ.maxTotalPool.toString(),
        timeDecayBps: event.marketParams.econ.timeDecayBps || null,
        
        // Market metadata
        creator: event.marketParams.creator,
        isProtocolMarket: event.marketParams.isProtocolMarket,
        status: MarketStatus.ACTIVE,
        
        // Blockchain metadata
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
      };

      return await this.prisma.market.create({
        data: marketData
      });
    } catch (error) {
      this.handleError('createFromEvent', error);
    }
  }

  async findById(id: string): Promise<Market | null> {
    try {
      this.logOperation('findById', { id });
      return await this.prisma.market.findUnique({
        where: { id }
      });
    } catch (error) {
      this.handleError('findById', error);
    }
  }

  async findByStatus(status: MarketStatus): Promise<Market[]> {
    try {
      this.logOperation('findByStatus', { status });
      return await this.prisma.market.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError('findByStatus', error);
    }
  }

  async findReadyForResolution(currentTime: Date): Promise<Market[]> {
    try {
      this.logOperation('findReadyForResolution', { currentTime });
      return await this.prisma.market.findMany({
        where: {
          status: MarketStatus.ACTIVE,
          tEnd: { lte: currentTime },
          resolvedAt: null
        },
        orderBy: { tEnd: 'asc' }
      });
    } catch (error) {
      this.handleError('findReadyForResolution', error);
    }
  }

  async updateStatus(id: string, status: MarketStatus): Promise<Market> {
    try {
      this.logOperation('updateStatus', { id, status });
      return await this.prisma.market.update({
        where: { id },
        data: { 
          status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('updateStatus', error);
    }
  }

  async markResolved(id: string, resolvedValue: string, resolutionTxHash: string): Promise<Market> {
    try {
      this.logOperation('markResolved', { id, resolvedValue, resolutionTxHash });
      return await this.prisma.market.update({
        where: { id },
        data: {
          status: MarketStatus.RESOLVED,
          resolvedValue,
          resolvedAt: new Date(),
          resolutionTxHash,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('markResolved', error);
    }
  }

  async count(): Promise<number> {
    try {
      this.logOperation('count');
      return await this.prisma.market.count();
    } catch (error) {
      this.handleError('count', error);
      return 0;
    }
  }

  async countByStatus(status: MarketStatus): Promise<number> {
    try {
      this.logOperation('countByStatus', { status });
      return await this.prisma.market.count({
        where: { status }
      });
    } catch (error) {
      this.handleError('countByStatus', error);
      return 0;
    }
  }

  /**
   * Get market statistics
   */
  async getStats(): Promise<{
    totalMarkets: number;
    activeMarkets: number;
    resolvedMarkets: number;
    cancelledMarkets: number;
    disputedMarkets: number;
  }> {
    try {
      const [
        totalMarkets,
        activeMarkets,
        resolvedMarkets,
        cancelledMarkets,
        disputedMarkets,
      ] = await Promise.all([
        this.prisma.market.count(),
        this.prisma.market.count({ where: { status: 'ACTIVE' } }),
        this.prisma.market.count({ where: { status: 'RESOLVED' } }),
        this.prisma.market.count({ where: { status: 'CANCELLED' } }),
        this.prisma.market.count({ where: { status: 'DISPUTE' } }),
      ]);

      return {
        totalMarkets,
        activeMarkets,
        resolvedMarkets,
        cancelledMarkets,
        disputedMarkets,
      };
    } catch (error) {
      this.handleError('getStats', error);
      return {
        totalMarkets: 0,
        activeMarkets: 0,
        resolvedMarkets: 0,
        cancelledMarkets: 0,
        disputedMarkets: 0,
      };
    }
  }

  // Helper methods for mapping contract types to Prisma enums
  private mapSubjectKind(kind: 0 | 1): 'HL_METRIC' | 'TOKEN_PRICE' {
    return kind === 0 ? 'HL_METRIC' : 'TOKEN_PRICE';
  }

  private mapPredicateOp(op: 0 | 1 | 2 | 3): 'GT' | 'GTE' | 'LT' | 'LTE' {
    const mapping = { 0: 'GT', 1: 'GTE', 2: 'LT', 3: 'LTE' } as const;
    return mapping[op];
  }

  private mapWindowKind(kind: 0 | 1 | 2): 'SNAPSHOT_AT' | 'WINDOW_SUM' | 'WINDOW_COUNT' {
    const mapping = { 0: 'SNAPSHOT_AT', 1: 'WINDOW_SUM', 2: 'WINDOW_COUNT' } as const;
    return mapping[kind];
  }

  private getImplementationType(marketParams: any): string {
    // This would need to be determined based on how markets are created
    // For now, assume based on some parameter or use a default
    return marketParams.timeDecayBps !== undefined ? 'CPMM' : 'PARIMUTUEL';
  }
}