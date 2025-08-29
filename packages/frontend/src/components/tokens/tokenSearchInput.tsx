'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, TrendingUp, X } from 'lucide-react';
import { useTokenSearch } from '@/hooks/useTokenSearch';
import { TokenForMarket, formatPrice, formatMarketCap, formatTokenForDisplay } from '@/lib/tokens/coinmarketcap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TokenSearchInputProps {
  value?: TokenForMarket | null;
  onSelect: (token: TokenForMarket | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
  showPrices?: boolean;
  showMarketCap?: boolean;
}

export function TokenSearchInput({
  value,
  onSelect,
  placeholder = 'Search for a token...',
  disabled = false,
  className = '',
  maxResults = 50,
  showPrices = true,
  showMarketCap = true,
}: TokenSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    isSearching,
    displayResults,
    topTokens,
  } = useTokenSearch({
    maxResults,
    includeTopTokens: true,
  });

  // Handle input focus
  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setFocusedIndex(-1);
    }
  };

  // Handle input blur (with delay to allow clicks)
  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setFocusedIndex(-1);
    }, 150);
  };

  // Handle token selection
  const handleTokenSelect = (token: TokenForMarket) => {
    onSelect(token);
    setQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || displayResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < displayResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : displayResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < displayResults.length) {
          handleTokenSelect(displayResults[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [focusedIndex]);

  const showTopTokensSection = !query.trim() && topTokens.length > 0;
  const showSearchResults = query.trim() && displayResults.length > 0;
  const showNoResults = query.trim() && displayResults.length === 0 && !isSearching;

  return (
    <div className={`relative ${className}`}>
      {/* Selected Token Display */}
      {value && (
        <div className="mb-2 p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {value.symbol[0]}
            </div>
            <div>
              <div className="font-medium text-sm">{value.symbol}</div>
              <div className="text-xs text-gray-500">{value.name}</div>
            </div>
            {showPrices && value.currentPrice && (
              <Badge variant="secondary" className="ml-2">
                {formatPrice(value.currentPrice)}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={value ? `Selected: ${formatTokenForDisplay(value)}` : placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {isOpen && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div ref={dropdownRef} className="max-h-96 overflow-y-auto">
              {isSearching && (
                <div className="p-4 text-center text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span>Searching tokens...</span>
                  </div>
                </div>
              )}

              {/* Top Tokens Section */}
              {showTopTokensSection && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Popular Tokens</span>
                  </div>
                  {topTokens.slice(0, 20).map((token, index) => (
                    <TokenSearchItem
                      key={token.cmcId}
                      token={token}
                      onClick={() => handleTokenSelect(token)}
                      isFocused={index === focusedIndex}
                      showPrices={showPrices}
                      showMarketCap={showMarketCap}
                    />
                  ))}
                </div>
              )}

              {/* Search Results */}
              {showSearchResults && (
                <div>
                  {query.trim() && (
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <span className="text-sm font-medium text-gray-700">
                        Search Results ({displayResults.length})
                      </span>
                    </div>
                  )}
                  {displayResults.map((token, index) => (
                    <TokenSearchItem
                      key={token.cmcId}
                      token={token}
                      onClick={() => handleTokenSelect(token)}
                      isFocused={index === focusedIndex}
                      showPrices={showPrices}
                      showMarketCap={showMarketCap}
                    />
                  ))}
                </div>
              )}

              {/* No Results */}
              {showNoResults && (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-sm">
                    No tokens found for &ldquo;{query}&rdquo;
                  </div>
                  <div className="text-xs mt-1">
                    Try searching by symbol or token name
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isSearching && displayResults.length === 0 && !query.trim() && topTokens.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-sm">Start typing to search for tokens</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Token Search Item Component
interface TokenSearchItemProps {
  token: TokenForMarket;
  onClick: () => void;
  isFocused: boolean;
  showPrices: boolean;
  showMarketCap: boolean;
}

function TokenSearchItem({ 
  token, 
  onClick, 
  isFocused, 
  showPrices, 
  showMarketCap 
}: TokenSearchItemProps) {
  return (
    <div
      className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
        isFocused ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Token Icon */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {token.symbol[0]}
          </div>
          
          {/* Token Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{token.symbol}</span>
              {!token.isActive && (
                <Badge variant="outline" className="text-xs">Inactive</Badge>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">{token.name}</div>
          </div>
        </div>

        {/* Price & Market Cap */}
        <div className="text-right">
          {showPrices && token.currentPrice && (
            <div className="font-medium text-gray-900">
              {formatPrice(token.currentPrice)}
            </div>
          )}
          {showMarketCap && token.marketCap && (
            <div className="text-xs text-gray-500">
              {formatMarketCap(token.marketCap)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}