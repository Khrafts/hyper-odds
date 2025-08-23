import { useState, useEffect, useCallback, useMemo } from 'react';
import { coinMarketCapService, TokenForMarket } from '@/lib/tokens/coinmarketcap';
import { useDebounce } from './use-debounce';

interface UseTokenSearchProps {
  initialQuery?: string;
  searchDelay?: number;
  maxResults?: number;
  includeTopTokens?: boolean;
}

interface UseTokenSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  
  // Results
  searchResults: TokenForMarket[];
  topTokens: TokenForMarket[];
  displayResults: TokenForMarket[];
  
  // Actions
  searchTokens: (query: string) => Promise<void>;
  refreshTopTokens: () => Promise<void>;
  
  // Utilities
  getTokenBySymbol: (symbol: string) => TokenForMarket | undefined;
  getTokenById: (cmcId: number) => TokenForMarket | undefined;
}

export function useTokenSearch({
  initialQuery = '',
  searchDelay = 300,
  maxResults = 50,
  includeTopTokens = true,
}: UseTokenSearchProps = {}): UseTokenSearchReturn {
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TokenForMarket[]>([]);
  const [topTokens, setTopTokens] = useState<TokenForMarket[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(query, searchDelay);

  // Search function
  const searchTokens = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await coinMarketCapService.searchCryptocurrencies(
        searchQuery, 
        maxResults
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Token search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [maxResults]);

  // Refresh top tokens
  const refreshTopTokens = useCallback(async () => {
    if (!includeTopTokens) return;

    setIsLoadingTop(true);
    try {
      const tokens = await coinMarketCapService.getTopCryptocurrencies(100);
      setTopTokens(tokens);
    } catch (error) {
      console.error('Failed to fetch top tokens:', error);
      setTopTokens([]);
    } finally {
      setIsLoadingTop(false);
    }
  }, [includeTopTokens]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchTokens(debouncedQuery);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedQuery, searchTokens]);

  // Load top tokens on mount
  useEffect(() => {
    refreshTopTokens();
  }, [refreshTopTokens]);

  // Display results logic
  const displayResults = useMemo(() => {
    if (query.trim()) {
      return searchResults;
    }
    return includeTopTokens ? topTokens : [];
  }, [query, searchResults, topTokens, includeTopTokens]);

  // Utility functions
  const getTokenBySymbol = useCallback((symbol: string): TokenForMarket | undefined => {
    const allTokens = [...searchResults, ...topTokens];
    return allTokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }, [searchResults, topTokens]);

  const getTokenById = useCallback((cmcId: number): TokenForMarket | undefined => {
    const allTokens = [...searchResults, ...topTokens];
    return allTokens.find(token => token.cmcId === cmcId);
  }, [searchResults, topTokens]);

  return {
    // Search state
    query,
    setQuery,
    isSearching: isSearching || isLoadingTop,
    
    // Results
    searchResults,
    topTokens,
    displayResults,
    
    // Actions
    searchTokens,
    refreshTopTokens,
    
    // Utilities
    getTokenBySymbol,
    getTokenById,
  };
}

// Hook for getting current token prices
export function useTokenPrices(cmcIds: number[]) {
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    if (cmcIds.length === 0) {
      setPrices({});
      return;
    }

    setIsLoading(true);
    try {
      const quotes = await coinMarketCapService.getTokenPrices(cmcIds);
      
      const priceMap: Record<number, number> = {};
      Object.entries(quotes).forEach(([id, quote]) => {
        priceMap[parseInt(id)] = quote.quote.USD.price;
      });
      
      setPrices(priceMap);
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      setPrices({});
    } finally {
      setIsLoading(false);
    }
  }, [cmcIds]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    refresh: fetchPrices,
  };
}

// Hook for getting single token info
export function useTokenInfo(cmcId: number | null) {
  const [token, setToken] = useState<TokenForMarket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!cmcId) {
      setToken(null);
      return;
    }

    setIsLoading(true);
    coinMarketCapService.getTokenInfo(cmcId)
      .then(setToken)
      .catch((error) => {
        console.error('Failed to fetch token info:', error);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
      
  }, [cmcId]);

  return {
    token,
    isLoading,
  };
}