import { BaseMetricFetcher, Subject, MetricValue, SubjectKind } from './base';
import { CoinMarketCapService as CMCService, TokenPriceData } from '../coinmarketcap';
import { logger } from '../../config/logger';
import { config } from '../../config/config';

export class CoinMarketCapFetcher extends BaseMetricFetcher {
  private cmcService: CMCService;

  constructor(apiKey?: string) {
    super('coinmarketcap', [SubjectKind.TOKEN_PRICE], {
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimitDelay: 200, // CMC has rate limits
      enableCaching: true,
      cacheTtl: 60000, // 1 minute cache
    });

    this.cmcService = new CMCService(
      apiKey || config.COINMARKETCAP_API_KEY || 'dummy-key-for-testing'
    );
  }

  canFetch(subject: Subject): boolean {
    if (subject.kind !== SubjectKind.TOKEN_PRICE) {
      return false;
    }

    // Must have a token identifier
    return !!subject.tokenIdentifier;
  }

  protected async fetchMetricInternal(subject: Subject, timestamp: Date): Promise<MetricValue> {
    if (!subject.tokenIdentifier) {
      throw new Error('Token identifier is required for CoinMarketCap price fetching');
    }

    logger.debug('Fetching CoinMarketCap token price', {
      tokenIdentifier: subject.tokenIdentifier,
      timestamp: timestamp.toISOString(),
    });

    try {
      let priceData: TokenPriceData | null = null;

      // Try different methods to resolve the token
      if (subject.tokenIdentifier.startsWith('0x')) {
        // Handle bytes32 token identifier from contract
        priceData = await this.cmcService.getPriceByTokenIdentifier(subject.tokenIdentifier);
      } else if (this.isNumeric(subject.tokenIdentifier)) {
        // Direct CMC ID
        const cmcId = parseInt(subject.tokenIdentifier);
        priceData = await this.cmcService.getQuoteById(cmcId);
      } else {
        // Token symbol
        priceData = await this.cmcService.getQuoteBySymbol(subject.tokenIdentifier);
      }

      if (!priceData) {
        throw new Error(`Token not found: ${subject.tokenIdentifier}`);
      }

      // Convert price to string with appropriate precision
      const value = this.formatPrice(priceData.price, subject.valueDecimals);
      
      return {
        value,
        timestamp: new Date(),
        decimals: subject.valueDecimals,
        source: this.name,
        confidence: 0.95, // High confidence for CMC data
        metadata: {
          cmcId: priceData.cmcId,
          symbol: priceData.symbol,
          name: priceData.name,
          marketCap: priceData.marketCap,
          volume24h: priceData.volume24h,
          originalPrice: priceData.price,
          lastUpdated: priceData.timestamp,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch CoinMarketCap token price', {
        tokenIdentifier: subject.tokenIdentifier,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthStatus = await this.cmcService.getHealthStatus();
      return healthStatus.status === 'healthy';
    } catch (error) {
      logger.warn('CoinMarketCap health check failed', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get additional token information
   */
  async getTokenInfo(tokenIdentifier: string): Promise<{
    cmcId: number;
    symbol: string;
    name: string;
  } | null> {
    try {
      let cmcId: number | null = null;

      if (tokenIdentifier.startsWith('0x')) {
        // Handle bytes32 from contract
        const identifier = this.bytes32ToString(tokenIdentifier);
        cmcId = await this.cmcService.resolveTokenIdentifier(identifier);
      } else if (this.isNumeric(tokenIdentifier)) {
        cmcId = parseInt(tokenIdentifier);
      } else {
        cmcId = await this.cmcService.getCmcIdBySymbol(tokenIdentifier);
      }

      if (!cmcId) {
        return null;
      }

      const priceData = await this.cmcService.getQuoteById(cmcId);
      if (!priceData) {
        return null;
      }

      return {
        cmcId: priceData.cmcId,
        symbol: priceData.symbol,
        name: priceData.name,
      };

    } catch (error) {
      logger.error('Failed to get token info', {
        tokenIdentifier,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Search for tokens by partial name or symbol
   */
  async searchTokens(query: string): Promise<Array<{
    cmcId: number;
    symbol: string;
    name: string;
  }>> {
    // This would require implementing search in the base CMCService
    // For now, we'll try exact symbol match
    try {
      const cmcId = await this.cmcService.getCmcIdBySymbol(query);
      if (!cmcId) {
        return [];
      }

      const priceData = await this.cmcService.getQuoteById(cmcId);
      if (!priceData) {
        return [];
      }

      return [{
        cmcId: priceData.cmcId,
        symbol: priceData.symbol,
        name: priceData.name,
      }];

    } catch (error) {
      logger.error('Token search failed', {
        query,
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  /**
   * Get multiple token prices efficiently
   */
  async getMultiplePrices(tokenIdentifiers: string[], valueDecimals = 8): Promise<MetricValue[]> {
    try {
      // Resolve all identifiers to CMC IDs
      const cmcIds: number[] = [];
      const identifierMap = new Map<number, string>();

      for (const identifier of tokenIdentifiers) {
        let cmcId: number | null = null;

        if (identifier.startsWith('0x')) {
          const decoded = this.bytes32ToString(identifier);
          cmcId = await this.cmcService.resolveTokenIdentifier(decoded);
        } else if (this.isNumeric(identifier)) {
          cmcId = parseInt(identifier);
        } else {
          cmcId = await this.cmcService.getCmcIdBySymbol(identifier);
        }

        if (cmcId) {
          cmcIds.push(cmcId);
          identifierMap.set(cmcId, identifier);
        }
      }

      if (cmcIds.length === 0) {
        return [];
      }

      // Batch fetch prices
      const priceData = await this.cmcService.getQuotesByIds(cmcIds);
      const results: MetricValue[] = [];

      for (const [cmcId, data] of Object.entries(priceData)) {
        const originalIdentifier = identifierMap.get(parseInt(cmcId));
        if (!originalIdentifier) continue;

        const value = this.formatPrice(data.price, valueDecimals);
        
        results.push({
          value,
          timestamp: new Date(),
          decimals: valueDecimals,
          source: this.name,
          confidence: 0.95,
          metadata: {
            tokenIdentifier: originalIdentifier,
            cmcId: data.cmcId,
            symbol: data.symbol,
            name: data.name,
            marketCap: data.marketCap,
            volume24h: data.volume24h,
            originalPrice: data.price,
            lastUpdated: data.timestamp,
          },
        });
      }

      return results;

    } catch (error) {
      logger.error('Failed to fetch multiple token prices', {
        tokenIdentifiers,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private isNumeric(str: string): boolean {
    return /^\d+$/.test(str);
  }

  private formatPrice(price: number, decimals: number): string {
    // Convert price to fixed-point string representation
    const multiplied = price * Math.pow(10, decimals);
    return Math.round(multiplied).toString();
  }

  private bytes32ToString(bytes32Hex: string): string {
    // Remove 0x prefix if present
    const hex = bytes32Hex.startsWith('0x') ? bytes32Hex.slice(2) : bytes32Hex;
    
    // Convert hex to buffer and then to string, removing null bytes
    const buffer = Buffer.from(hex, 'hex');
    return buffer.toString('utf8').replace(/\0/g, '');
  }

  /**
   * Get detailed market data for a token
   */
  async getMarketData(tokenIdentifier: string): Promise<{
    price: number;
    marketCap: number;
    volume24h: number;
    percentChange24h?: number;
    percentChange7d?: number;
  } | null> {
    try {
      let priceData: TokenPriceData | null = null;

      if (tokenIdentifier.startsWith('0x')) {
        priceData = await this.cmcService.getPriceByTokenIdentifier(tokenIdentifier);
      } else if (this.isNumeric(tokenIdentifier)) {
        const cmcId = parseInt(tokenIdentifier);
        priceData = await this.cmcService.getQuoteById(cmcId);
      } else {
        priceData = await this.cmcService.getQuoteBySymbol(tokenIdentifier);
      }

      if (!priceData) {
        return null;
      }

      return {
        price: priceData.price,
        marketCap: priceData.marketCap || 0,
        volume24h: priceData.volume24h || 0,
      };

    } catch (error) {
      logger.error('Failed to get market data', {
        tokenIdentifier,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }
}