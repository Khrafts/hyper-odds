import axios, { AxiosInstance } from 'axios';
import { BaseMetricFetcher, Subject, MetricValue, SubjectKind } from './base';
import { logger } from '../../config/logger';
import { config } from '../../config/config';
import { z } from 'zod';

// Hyperliquid API response schemas
const HyperliquidMetaResponseSchema = z.object({
  universe: z.array(z.object({
    name: z.string(),
    szDecimals: z.number(),
  })),
});

const HyperliquidUserStateSchema = z.object({
  assetPositions: z.array(z.object({
    position: z.object({
      coin: z.string(),
      szi: z.string(), // Size as string to handle big numbers
      entryPx: z.string().nullable(),
      positionValue: z.string(),
    }),
  })),
  marginSummary: z.object({
    accountValue: z.string(),
    totalNtlPos: z.string(),
    totalRawUsd: z.string(),
  }),
});

const HyperliquidFundingRateSchema = z.object({
  coin: z.string(),
  fundingRate: z.string(),
  premium: z.string(),
});

const HyperliquidOrderBookSchema = z.object({
  coin: z.string(),
  levels: z.array(z.array(z.object({
    px: z.string(),
    sz: z.string(),
  }))),
  time: z.number(),
});

const HyperliquidCandlestickSchema = z.object({
  coin: z.string(),
  s: z.string(), // Start time
  e: z.string(), // End time  
  i: z.string(), // Interval
  o: z.string(), // Open
  h: z.string(), // High
  l: z.string(), // Low
  c: z.string(), // Close
  v: z.string(), // Volume
  n: z.number(), // Number of trades
});

// Metric type mapping
const HYPERLIQUID_METRICS = {
  // Position metrics
  'account_value': 'Account Value (USD)',
  'total_ntl_pos': 'Total Notional Position',
  'total_raw_usd': 'Total Raw USD',
  
  // Token-specific metrics
  'position_size': 'Position Size',
  'position_value': 'Position Value (USD)',
  'entry_price': 'Entry Price',
  
  // Market data
  'funding_rate': 'Funding Rate',
  'premium': 'Premium',
  'mid_price': 'Mid Price',
  'bid_price': 'Best Bid Price',
  'ask_price': 'Best Ask Price',
  'spread': 'Bid-Ask Spread',
  
  // Volume and activity
  'volume_24h': '24h Volume',
  'trades_24h': '24h Trade Count',
  'open_interest': 'Open Interest',
} as const;

type HyperliquidMetricType = keyof typeof HYPERLIQUID_METRICS;

export class HyperliquidService extends BaseMetricFetcher {
  private apiClient: AxiosInstance;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100; // 100ms between requests

  constructor() {
    super('hyperliquid', [SubjectKind.HL_METRIC], {
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimitDelay: 100,
      enableCaching: true,
      cacheTtl: 30000, // 30 seconds
    });

    this.apiClient = axios.create({
      baseURL: config.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz',
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupAxiosInterceptors();
  }

  canFetch(subject: Subject): boolean {
    if (subject.kind !== SubjectKind.HL_METRIC) {
      return false;
    }

    if (!subject.metricId) {
      return false;
    }

    // Parse metric ID format: "metric_type" or "metric_type:token" or "metric_type:address"
    const [metricType] = subject.metricId.split(':');
    return Boolean(metricType && metricType in HYPERLIQUID_METRICS);
  }

  protected async fetchMetricInternal(subject: Subject, timestamp: Date): Promise<MetricValue> {
    if (!subject.metricId) {
      throw new Error('Metric ID is required for Hyperliquid metrics');
    }

    const [metricType, target] = subject.metricId.split(':') as [HyperliquidMetricType, string?];
    
    logger.debug('Fetching Hyperliquid metric', {
      metricType,
      target,
      timestamp: timestamp.toISOString(),
    });

    // Apply rate limiting
    await this.enforceRateLimit();

    let value: string;
    let decimals = subject.valueDecimals;
    const metadata: Record<string, unknown> = {
      metricType,
      target,
      timestamp: timestamp.toISOString(),
    };

    try {
      switch (metricType) {
        case 'account_value':
        case 'total_ntl_pos':
        case 'total_raw_usd':
          value = await this.fetchAccountMetric(metricType, target, metadata);
          break;
          
        case 'position_size':
        case 'position_value':
        case 'entry_price':
          value = await this.fetchPositionMetric(metricType, target, metadata);
          break;
          
        case 'funding_rate':
        case 'premium':
          value = await this.fetchFundingMetric(metricType, target, metadata);
          break;
          
        case 'mid_price':
        case 'bid_price':
        case 'ask_price':
        case 'spread':
          value = await this.fetchPriceMetric(metricType, target, metadata);
          break;
          
        case 'volume_24h':
        case 'trades_24h':
          value = await this.fetchVolumeMetric(metricType, target, metadata);
          break;
          
        case 'open_interest':
          value = await this.fetchOpenInterestMetric(target, metadata);
          break;
          
        default:
          throw new Error(`Unsupported Hyperliquid metric type: ${metricType}`);
      }

      return {
        value,
        timestamp: new Date(),
        decimals,
        source: this.name,
        confidence: 0.9, // High confidence for direct API data
        metadata,
      };

    } catch (error) {
      logger.error('Failed to fetch Hyperliquid metric', {
        metricType,
        target,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test connection with meta info request
      const response = await this.apiClient.post('/info', {
        type: 'meta',
      });

      const parsed = HyperliquidMetaResponseSchema.safeParse(response.data);
      return parsed.success && parsed.data.universe.length > 0;

    } catch (error) {
      logger.warn('Hyperliquid health check failed', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  private setupAxiosInterceptors(): void {
    // Request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('Hyperliquid API request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          logger.error('Hyperliquid API error response', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          });
        } else if (error.request) {
          logger.error('Hyperliquid API network error', {
            message: error.message,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async fetchAccountMetric(metricType: string, address?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const response = await this.apiClient.post('/info', {
      type: 'clearinghouseState',
      user: address || '0x0000000000000000000000000000000000000000', // Use zero address for global metrics
    });

    const parsed = HyperliquidUserStateSchema.parse(response.data);
    
    switch (metricType) {
      case 'account_value':
        return parsed.marginSummary.accountValue;
      case 'total_ntl_pos':
        return parsed.marginSummary.totalNtlPos;
      case 'total_raw_usd':
        return parsed.marginSummary.totalRawUsd;
      default:
        throw new Error(`Unknown account metric: ${metricType}`);
    }
  }

  private async fetchPositionMetric(metricType: string, tokenOrAddress?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    if (!tokenOrAddress) {
      throw new Error(`${metricType} requires a token symbol or address`);
    }

    // If it looks like an address, use it as user address, otherwise as token
    const isAddress = tokenOrAddress.startsWith('0x') && tokenOrAddress.length === 42;
    const address = isAddress ? tokenOrAddress : undefined;
    const token = isAddress ? undefined : tokenOrAddress;

    const response = await this.apiClient.post('/info', {
      type: 'clearinghouseState', 
      user: address || '0x0000000000000000000000000000000000000000',
    });

    const parsed = HyperliquidUserStateSchema.parse(response.data);
    
    // Find position for specific token if specified
    let targetPosition = parsed.assetPositions[0]?.position;
    if (token) {
      const position = parsed.assetPositions.find(p => p.position.coin === token);
      if (!position) {
        throw new Error(`No position found for token: ${token}`);
      }
      targetPosition = position.position;
    }

    if (!targetPosition) {
      throw new Error('No position data available');
    }

    switch (metricType) {
      case 'position_size':
        return targetPosition.szi;
      case 'position_value':
        return targetPosition.positionValue;
      case 'entry_price':
        return targetPosition.entryPx || '0';
      default:
        throw new Error(`Unknown position metric: ${metricType}`);
    }
  }

  private async fetchFundingMetric(metricType: string, token?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const response = await this.apiClient.post('/info', {
      type: 'meta',
    });

    const metaData = HyperliquidMetaResponseSchema.parse(response.data);
    
    // Get funding rates for all tokens or specific token
    const fundingResponse = await this.apiClient.post('/info', {
      type: 'fundingRates',
    });

    const fundingRates = z.array(HyperliquidFundingRateSchema).parse(fundingResponse.data);
    
    let targetRate = fundingRates[0];
    if (token) {
      const rate = fundingRates.find(r => r.coin === token);
      if (!rate) {
        throw new Error(`No funding rate found for token: ${token}`);
      }
      targetRate = rate;
    }

    if (!targetRate) {
      throw new Error(`No funding rate data found for token: ${token || 'default'}`);
    }

    switch (metricType) {
      case 'funding_rate':
        return targetRate.fundingRate;
      case 'premium':
        return targetRate.premium;
      default:
        throw new Error(`Unknown funding metric: ${metricType}`);
    }
  }

  private async fetchPriceMetric(metricType: string, token?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    if (!token) {
      throw new Error(`${metricType} requires a token symbol`);
    }

    const response = await this.apiClient.post('/info', {
      type: 'l2Book',
      coin: token,
    });

    const orderBook = HyperliquidOrderBookSchema.parse(response.data);
    
    const bids = orderBook.levels[0] || [];
    const asks = orderBook.levels[1] || [];
    
    if (bids.length === 0 || asks.length === 0) {
      throw new Error(`Insufficient liquidity for ${token}`);
    }

    const bestBid = parseFloat(bids[0]?.px || '0');
    const bestAsk = parseFloat(asks[0]?.px || '0');
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;

    switch (metricType) {
      case 'mid_price':
        return midPrice.toString();
      case 'bid_price':
        return bestBid.toString();
      case 'ask_price':
        return bestAsk.toString();
      case 'spread':
        return spread.toString();
      default:
        throw new Error(`Unknown price metric: ${metricType}`);
    }
  }

  private async fetchVolumeMetric(metricType: string, token?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    if (!token) {
      throw new Error(`${metricType} requires a token symbol`);
    }

    // Get 24h candlestick data
    const endTime = Date.now();
    const startTime = endTime - 24 * 60 * 60 * 1000; // 24 hours ago

    const response = await this.apiClient.post('/info', {
      type: 'candleSnapshot',
      req: {
        coin: token,
        interval: '1h',
        startTime,
        endTime,
      },
    });

    const candles = z.array(HyperliquidCandlestickSchema).parse(response.data);
    
    let totalVolume = 0;
    let totalTrades = 0;

    for (const candle of candles) {
      totalVolume += parseFloat(candle.v);
      totalTrades += candle.n;
    }

    switch (metricType) {
      case 'volume_24h':
        return totalVolume.toString();
      case 'trades_24h':
        return totalTrades.toString();
      default:
        throw new Error(`Unknown volume metric: ${metricType}`);
    }
  }

  private async fetchOpenInterestMetric(token?: string, metadata: Record<string, unknown> = {}): Promise<string> {
    if (!token) {
      throw new Error('open_interest requires a token symbol');
    }

    const response = await this.apiClient.post('/info', {
      type: 'openInterest',
      coin: token,
    });

    // Open interest response is typically a simple object with the value
    const data = z.object({
      coin: z.string(),
      oi: z.string(),
    }).parse(response.data);

    return data.oi;
  }
}