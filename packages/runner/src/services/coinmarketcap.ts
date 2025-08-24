import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// CoinMarketCap API Response Schemas
const CMCStatusSchema = z.object({
  timestamp: z.string(),
  error_code: z.number(),
  error_message: z.string().nullable(),
  elapsed: z.number(),
  credit_count: z.number(),
});

const CMCQuoteUSDSchema = z.object({
  price: z.number(),
  volume_24h: z.number().optional(),
  percent_change_1h: z.number().optional(),
  percent_change_24h: z.number().optional(),
  percent_change_7d: z.number().optional(),
  market_cap: z.number().optional(),
  last_updated: z.string(),
});

const CMCQuoteDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  quote: z.object({
    USD: CMCQuoteUSDSchema,
  }),
});

const CMCQuoteResponseSchema = z.object({
  status: CMCStatusSchema,
  data: z.record(z.string(), CMCQuoteDataSchema),
});

const CMCMapTokenSchema = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  is_active: z.number().optional(),
});

const CMCMapResponseSchema = z.object({
  status: CMCStatusSchema,
  data: z.array(CMCMapTokenSchema),
});

// Export types
export type CMCQuoteResponse = z.infer<typeof CMCQuoteResponseSchema>;
export type CMCQuoteData = z.infer<typeof CMCQuoteDataSchema>;
export type CMCMapResponse = z.infer<typeof CMCMapResponseSchema>;
export type CMCMapToken = z.infer<typeof CMCMapTokenSchema>;

export interface TokenPriceData {
  cmcId: number;
  symbol: string;
  name: string;
  price: number;
  timestamp: string;
  marketCap?: number;
  volume24h?: number;
}

export class CoinMarketCapService {
  private client: AxiosInstance;
  private apiKey: string;
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheTimeMs = 2 * 60 * 1000; // 2 minutes cache
  
  // Token symbol to CMC ID mapping cache
  private symbolToIdMap = new Map<string, number>();
  private mapCacheExpiry = 0;
  private mapCacheTimeMs = 60 * 60 * 1000; // 1 hour cache for symbol mapping

  constructor(apiKey: string, baseURL = 'https://pro-api.coinmarketcap.com/v1') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000, // 10 second timeout
    });
  }

  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${paramString}`;
  }

  private isValidCache(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    return cached !== undefined && cached.expiry > Date.now();
  }

  private setCache(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + this.cacheTimeMs,
    });
  }

  /**
   * Get current price quotes for tokens by CMC ID
   */
  async getQuotesByIds(cmcIds: number[]): Promise<Record<number, TokenPriceData>> {
    const cacheKey = this.getCacheKey('/cryptocurrency/quotes/latest', {
      id: cmcIds.sort().join(','),
    });

    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const response = await this.client.get('/cryptocurrency/quotes/latest', {
        params: {
          id: cmcIds.join(','),
          convert: 'USD',
        },
      });

      const parsed = CMCQuoteResponseSchema.parse(response.data);
      
      if (parsed.status.error_code !== 0) {
        throw new Error(`CMC API Error: ${parsed.status.error_message}`);
      }

      // Convert to our format
      const result: Record<number, TokenPriceData> = {};
      Object.entries(parsed.data).forEach(([_, tokenData]) => {
        result[tokenData.id] = {
          cmcId: tokenData.id,
          symbol: tokenData.symbol,
          name: tokenData.name,
          price: tokenData.quote.USD.price,
          timestamp: tokenData.quote.USD.last_updated,
          marketCap: tokenData.quote.USD.market_cap || 0,
          volume24h: tokenData.quote.USD.volume_24h || 0,
        };
      });

      // Cache result
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CMC API request failed: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get current price quote for a single token by CMC ID
   */
  async getQuoteById(cmcId: number): Promise<TokenPriceData | null> {
    const quotes = await this.getQuotesByIds([cmcId]);
    return quotes[cmcId] || null;
  }

  /**
   * Get current price quote for a token by symbol
   */
  async getQuoteBySymbol(symbol: string): Promise<TokenPriceData | null> {
    const cmcId = await this.getCmcIdBySymbol(symbol);
    if (!cmcId) {
return null;
}
    
    return this.getQuoteById(cmcId);
  }

  /**
   * Get CMC ID for a token symbol
   */
  async getCmcIdBySymbol(symbol: string): Promise<number | null> {
    // Check if we need to refresh the symbol mapping
    if (Date.now() > this.mapCacheExpiry) {
      await this.refreshSymbolMapping();
    }

    return this.symbolToIdMap.get(symbol.toUpperCase()) || null;
  }

  /**
   * Refresh the symbol to CMC ID mapping
   */
  private async refreshSymbolMapping(): Promise<void> {
    try {
      const response = await this.client.get('/cryptocurrency/map', {
        params: {
          listing_status: 'active',
          limit: 5000,
        },
      });

      const parsed = CMCMapResponseSchema.parse(response.data);
      
      if (parsed.status.error_code !== 0) {
        throw new Error(`CMC API Error: ${parsed.status.error_message}`);
      }

      // Update symbol mapping
      this.symbolToIdMap.clear();
      parsed.data.forEach(token => {
        this.symbolToIdMap.set(token.symbol.toUpperCase(), token.id);
      });

      // Update cache expiry
      this.mapCacheExpiry = Date.now() + this.mapCacheTimeMs;

    } catch (error) {
      // Use proper error handling instead of console.error
      throw new Error(`Failed to refresh CMC symbol mapping: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Convert token identifier to CMC ID
   * Supports both CMC ID (as string) and symbol
   */
  async resolveTokenIdentifier(identifier: string): Promise<number | null> {
    // Try to parse as CMC ID first
    const numericId = parseInt(identifier);
    if (!isNaN(numericId) && numericId > 0) {
      return numericId;
    }

    // Otherwise treat as symbol
    return this.getCmcIdBySymbol(identifier);
  }

  /**
   * Get price for a token identifier from the smart contract
   * @param tokenIdentifier bytes32 value from smart contract (CMC ID or symbol)
   * @returns Token price data or null if not found
   */
  async getPriceByTokenIdentifier(tokenIdentifier: string): Promise<TokenPriceData | null> {
    // Convert bytes32 hex to string
    const identifier = this.bytes32ToString(tokenIdentifier);
    if (!identifier) {
return null;
}

    const cmcId = await this.resolveTokenIdentifier(identifier);
    if (!cmcId) {
return null;
}

    return this.getQuoteById(cmcId);
  }

  /**
   * Convert bytes32 hex string to readable string
   */
  private bytes32ToString(bytes32Hex: string): string {
    // Remove 0x prefix if present
    const hex = bytes32Hex.startsWith('0x') ? bytes32Hex.slice(2) : bytes32Hex;
    
    // Convert hex to buffer and then to string, removing null bytes
    const buffer = Buffer.from(hex, 'hex');
    return buffer.toString('utf8').replace(/\0/g, '');
  }

  /**
   * Convert string to bytes32 hex (for testing/debugging)
   */
  static stringToBytes32(str: string): string {
    const buffer = Buffer.alloc(32);
    buffer.write(str, 'utf8');
    return `0x${  buffer.toString('hex')}`;
  }

  /**
   * Get health status of the service
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Try to get Bitcoin price as a health check
      const btcQuote = await this.getQuoteById(1); // Bitcoin CMC ID is 1
      return btcQuote 
        ? { status: 'healthy' as const }
        : { status: 'unhealthy' as const, error: 'Failed to fetch Bitcoin price' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Utility functions
export function formatTokenPrice(price: number, decimals = 8): string {
  // Convert to fixed decimal string for smart contract submission
  return (price * Math.pow(10, decimals)).toFixed(0);
}

export function parseTokenPrice(priceString: string, decimals = 8): number {
  return parseInt(priceString) / Math.pow(10, decimals);
}