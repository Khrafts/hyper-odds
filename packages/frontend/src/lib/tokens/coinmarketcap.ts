import { z } from 'zod';

// CoinMarketCap API Response Types
const CMCTokenSchema = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(), 
  slug: z.string(),
  is_active: z.number().optional(),
  first_historical_data: z.string().optional(),
  last_historical_data: z.string().optional(),
  platform: z.object({
    id: z.number(),
    name: z.string(),
    symbol: z.string(),
    slug: z.string(),
    token_address: z.string()
  }).nullable().optional(),
});

const CMCMapResponseSchema = z.object({
  status: z.object({
    timestamp: z.string(),
    error_code: z.number(),
    error_message: z.string().nullable(),
    elapsed: z.number(),
    credit_count: z.number(),
  }),
  data: z.array(CMCTokenSchema),
});

const CMCQuoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  quote: z.object({
    USD: z.object({
      price: z.number(),
      volume_24h: z.number().optional(),
      percent_change_1h: z.number().optional(),
      percent_change_24h: z.number().optional(),
      percent_change_7d: z.number().optional(),
      market_cap: z.number().optional(),
      last_updated: z.string(),
    })
  }),
});

const CMCQuoteResponseSchema = z.object({
  status: z.object({
    timestamp: z.string(),
    error_code: z.number(),
    error_message: z.string().nullable(),
  }),
  data: z.record(CMCQuoteSchema),
});

// Export types
export type CMCToken = z.infer<typeof CMCTokenSchema>;
export type CMCMapResponse = z.infer<typeof CMCMapResponseSchema>;
export type CMCQuote = z.infer<typeof CMCQuoteSchema>;
export type CMCQuoteResponse = z.infer<typeof CMCQuoteResponseSchema>;

// Token for market creation
export interface TokenForMarket {
  cmcId: number;
  symbol: string;
  name: string;
  slug: string;
  logo?: string;
  currentPrice?: number;
  marketCap?: number;
  isActive: boolean;
}

class CoinMarketCapService {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private apiKey: string | null = null;
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheTimeMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // API key should be set via environment variable
    this.apiKey = process.env.NEXT_PUBLIC_CMC_API_KEY || null;
  }

  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const paramString = new URLSearchParams(params).toString();
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

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('CoinMarketCap API key not configured');
    }

    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });

      const response = await fetch(url.toString(), {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      });

      if (!response.ok) {
        throw new Error(`CMC API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status?.error_code !== 0) {
        throw new Error(`CMC API Error: ${data.status?.error_message || 'Unknown error'}`);
      }

      // Cache successful response
      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('CoinMarketCap API request failed:', error);
      throw error;
    }
  }

  /**
   * Get all cryptocurrencies from CMC map
   */
  async getAllCryptocurrencies(limit = 5000): Promise<CMCToken[]> {
    try {
      const response = await this.makeRequest('/cryptocurrency/map', {
        listing_status: 'active',
        limit,
      });

      const parsed = CMCMapResponseSchema.parse(response);
      return parsed.data;
    } catch (error) {
      console.error('Failed to fetch cryptocurrency map:', error);
      return [];
    }
  }

  /**
   * Search cryptocurrencies by symbol or name
   */
  async searchCryptocurrencies(query: string, limit = 50): Promise<TokenForMarket[]> {
    try {
      const allTokens = await this.getAllCryptocurrencies();
      
      const filteredTokens = allTokens
        .filter(token => 
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.slug.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);

      // Convert to TokenForMarket format
      return filteredTokens.map(token => ({
        cmcId: token.id,
        symbol: token.symbol,
        name: token.name,
        slug: token.slug,
        isActive: token.is_active === 1,
      }));

    } catch (error) {
      console.error('Failed to search cryptocurrencies:', error);
      return [];
    }
  }

  /**
   * Get popular/top cryptocurrencies for quick selection
   */
  async getTopCryptocurrencies(limit = 100): Promise<TokenForMarket[]> {
    try {
      const response = await this.makeRequest('/cryptocurrency/listings/latest', {
        start: 1,
        limit,
        convert: 'USD',
      });

      // Parse and convert to our format
      const tokens: TokenForMarket[] = response.data.map((token: any) => ({
        cmcId: token.id,
        symbol: token.symbol,
        name: token.name,
        slug: token.slug,
        currentPrice: token.quote?.USD?.price,
        marketCap: token.quote?.USD?.market_cap,
        isActive: true,
      }));

      return tokens;

    } catch (error) {
      console.error('Failed to fetch top cryptocurrencies:', error);
      return [];
    }
  }

  /**
   * Get current price for specific tokens
   */
  async getTokenPrices(cmcIds: number[]): Promise<Record<number, CMCQuote>> {
    try {
      const response = await this.makeRequest('/cryptocurrency/quotes/latest', {
        id: cmcIds.join(','),
        convert: 'USD',
      });

      const parsed = CMCQuoteResponseSchema.parse(response);
      
      // Convert string keys to numbers
      const result: Record<number, CMCQuote> = {};
      Object.entries(parsed.data).forEach(([key, value]) => {
        result[parseInt(key)] = value;
      });

      return result;

    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      return {};
    }
  }

  /**
   * Get token info by CMC ID
   */
  async getTokenInfo(cmcId: number): Promise<TokenForMarket | null> {
    try {
      const [quotes, map] = await Promise.all([
        this.getTokenPrices([cmcId]),
        this.getAllCryptocurrencies(),
      ]);

      const quote = quotes[cmcId];
      const mapToken = map.find(t => t.id === cmcId);

      if (!mapToken) return null;

      return {
        cmcId: mapToken.id,
        symbol: mapToken.symbol,
        name: mapToken.name,
        slug: mapToken.slug,
        currentPrice: quote?.quote?.USD?.price,
        marketCap: quote?.quote?.USD?.market_cap,
        isActive: mapToken.is_active === 1,
      };

    } catch (error) {
      console.error('Failed to fetch token info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const coinMarketCapService = new CoinMarketCapService();

// Utility functions for market creation
export function formatTokenForDisplay(token: TokenForMarket): string {
  return `${token.symbol} - ${token.name}`;
}

export function formatPrice(price: number | undefined): string {
  if (!price) return 'N/A';
  
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(2)}`;
  }
}

export function formatMarketCap(marketCap: number | undefined): string {
  if (!marketCap) return 'N/A';
  
  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  } else if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  } else if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  } else {
    return `$${marketCap.toFixed(2)}`;
  }
}