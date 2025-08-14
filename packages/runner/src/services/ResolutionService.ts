import { ethers } from 'ethers';
import { ContractService } from './ContractService.js';
import { HyperliquidAPI } from './HyperliquidAPI.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { Market, ResolutionResult } from '../types/index.js';

export class ResolutionService {
  constructor(
    private contractService: ContractService,
    private hyperliquidAPI: HyperliquidAPI
  ) {}

  async resolveMarket(market: Market): Promise<ResolutionResult> {
    const marketLogger = logger.child({ marketId: market.id });

    try {
      // Check if already has pending resolution
      const isPending = await this.contractService.isPendingResolution(market.id);
      
      if (isPending) {
        // Check if we can finalize
        const canFinalize = await this.contractService.canFinalize(market.id);
        
        if (canFinalize) {
          marketLogger.info('Finalizing existing resolution');
          const tx = await this.contractService.finalizeResolution(market.id);
          await tx.wait();
          
          return {
            success: true,
            outcome: -1, // We don't know the outcome here
            transactionHash: tx.hash
          };
        } else {
          marketLogger.debug('Resolution pending, waiting for dispute window');
          return {
            success: false,
            reason: 'Waiting for dispute window'
          };
        }
      }

      // Fetch the actual value based on market type
      const actualValue = await this.fetchMarketValue(market);
      
      // Determine outcome based on predicate
      const outcome = this.evaluatePredicate(
        actualValue,
        BigInt(market.threshold),
        market.predicateOp
      );

      // Calculate data hash
      const dataHash = this.calculateDataHash(actualValue, market);

      // Commit the resolution
      marketLogger.info({
        actualValue: actualValue.toString(),
        threshold: market.threshold,
        outcome
      }, 'Committing resolution');

      const tx = await this.contractService.commitResolution(
        market.id,
        outcome,
        dataHash
      );

      await tx.wait();

      return {
        success: true,
        outcome,
        transactionHash: tx.hash
      };

    } catch (error) {
      marketLogger.error({ error }, 'Failed to resolve market');
      
      // Retry logic
      if (config.retryAttempts > 0) {
        return this.retryResolution(market, config.retryAttempts);
      }
      
      throw error;
    }
  }

  private async fetchMarketValue(market: Market): Promise<bigint> {
    switch (market.subjectKind) {
      case 'HL_METRIC':
        return this.fetchHLMetricValue(market);
      
      case 'TOKEN_PRICE':
        return this.fetchTokenPriceValue(market);
      
      case 'GENERIC':
        return this.hyperliquidAPI.getGenericValue(market.primarySourceId);
      
      default:
        throw new Error(`Unknown subject kind: ${market.subjectKind}`);
    }
  }

  private async fetchHLMetricValue(market: Market): Promise<bigint> {
    switch (market.windowKind) {
      case 'SNAPSHOT_AT':
        return this.hyperliquidAPI.getMetricValue(
          market.metricId,
          Number(market.windowEnd)
        );
      
      case 'TIME_AVERAGE':
        return this.hyperliquidAPI.getTimeAverageValue(
          market.metricId,
          Number(market.windowStart),
          Number(market.windowEnd),
          false
        );
      
      case 'EXTREMUM':
        // Determine if we're looking for max or min based on predicate
        const isMax = market.predicateOp === 'GT' || market.predicateOp === 'GTE';
        return this.hyperliquidAPI.getExtremumValue(
          market.metricId,
          Number(market.windowStart),
          Number(market.windowEnd),
          isMax,
          false
        );
      
      default:
        throw new Error(`Unknown window kind: ${market.windowKind}`);
    }
  }

  private async fetchTokenPriceValue(market: Market): Promise<bigint> {
    switch (market.windowKind) {
      case 'SNAPSHOT_AT':
        return this.hyperliquidAPI.getTokenPrice(
          market.token,
          Number(market.windowEnd)
        );
      
      case 'TIME_AVERAGE':
        return this.hyperliquidAPI.getTimeAverageValue(
          market.token,
          Number(market.windowStart),
          Number(market.windowEnd),
          true
        );
      
      case 'EXTREMUM':
        const isMax = market.predicateOp === 'GT' || market.predicateOp === 'GTE';
        return this.hyperliquidAPI.getExtremumValue(
          market.token,
          Number(market.windowStart),
          Number(market.windowEnd),
          isMax,
          true
        );
      
      default:
        throw new Error(`Unknown window kind: ${market.windowKind}`);
    }
  }

  private evaluatePredicate(
    value: bigint,
    threshold: bigint,
    op: string
  ): number {
    let result: boolean;
    
    switch (op) {
      case 'GT':
        result = value > threshold;
        break;
      case 'GTE':
        result = value >= threshold;
        break;
      case 'LT':
        result = value < threshold;
        break;
      case 'LTE':
        result = value <= threshold;
        break;
      case 'EQ':
        result = value === threshold;
        break;
      case 'NEQ':
        result = value !== threshold;
        break;
      default:
        throw new Error(`Unknown predicate operator: ${op}`);
    }
    
    return result ? 1 : 0; // 1 for YES, 0 for NO
  }

  private calculateDataHash(value: bigint, market: Market): string {
    // Create a deterministic hash of the resolution data
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'uint256'],
      [value, market.id, Date.now()]
    );
    
    return ethers.keccak256(data);
  }

  private async retryResolution(
    market: Market,
    attemptsLeft: number
  ): Promise<ResolutionResult> {
    if (attemptsLeft <= 0) {
      return {
        success: false,
        reason: 'Max retry attempts exceeded'
      };
    }

    logger.info({
      marketId: market.id,
      attemptsLeft
    }, 'Retrying market resolution');

    await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
    
    return this.resolveMarket(market);
  }
}