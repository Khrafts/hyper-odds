'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useMarkets } from '@/hooks/useMarkets'
import { cn } from '@/lib/utils'
import { Search, X, TrendingUp, Clock } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  showResults?: boolean
  onSelect?: () => void
}

export function SearchBar({ 
  className, 
  placeholder = "Search markets...", 
  showResults = true,
  onSelect 
}: SearchBarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // Fetch search results
  const { data: marketsData, loading } = useMarkets(
    debouncedSearchQuery.trim() ? { searchQuery: debouncedSearchQuery.trim() } : undefined,
    { first: 5 }
  )
  
  const markets = marketsData?.markets || []

  // Auto-focus when component mounts (for modal usage)
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle search input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setIsOpen(value.trim().length > 0 && showResults)
  }

  // Handle market selection
  const handleMarketSelect = (marketId: string) => {
    router.push(`/markets/${marketId}`)
    setSearchQuery('')
    setIsOpen(false)
    onSelect?.()
  }

  // Handle view all results
  const handleViewAllResults = () => {
    router.push(`/markets?search=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    setIsOpen(false)
    onSelect?.()
  }

  // Handle clear search
  const handleClear = () => {
    setSearchQuery('')
    setIsOpen(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && searchQuery.trim()) {
      handleViewAllResults()
    }
  }

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim() && showResults) {
              setIsOpen(true)
            }
          }}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mx-auto mb-2" />
              Searching markets...
            </div>
          ) : markets.length > 0 ? (
            <>
              <div className="p-2 border-b">
                <p className="text-xs text-muted-foreground px-2">
                  Found {markets.length} market{markets.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {markets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => handleMarketSelect(market.id)}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-1 mb-1">
                        {market.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {market.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {market.resolved ? 'Resolved' : 'Active'}
                        </span>
                        {!market.resolved && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-primary font-medium">
                              ${parseFloat(market.totalPool).toLocaleString()} pool
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {searchQuery.trim() && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewAllResults}
                    className="w-full justify-center"
                  >
                    View all results for "{searchQuery.trim()}"
                  </Button>
                </div>
              )}
            </>
          ) : debouncedSearchQuery.trim() ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No markets found for "{debouncedSearchQuery.trim()}"</p>
              <p className="text-xs mt-1">Try different keywords or browse all markets</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}