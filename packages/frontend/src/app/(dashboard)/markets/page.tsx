'use client'

import React, { useState, useEffect } from 'react'
import type { Metadata } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMarkets, MarketFilters } from '@/hooks/useMarkets'
import { useMarketCounts } from '@/hooks/useProtocolStats'
import { MarketGrid } from '@/components/markets/marketGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ClientOnly } from '@/components/clientOnly'
import { PageErrorBoundary } from '@/components/error'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, Filter, SortAsc, X } from 'lucide-react'

function MarketsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<MarketFilters>({
    status: 'all',
    sortBy: 'newest'
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize search query from URL params
  useEffect(() => {
    const urlSearchQuery = searchParams?.get('search')
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery)
    }
  }, [searchParams])
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Apply search query to filters when it changes
  const effectiveFilters = {
    ...filters,
    searchQuery: debouncedSearchQuery.trim() || undefined
  }

  const { data: marketsData, loading, error, refetch } = useMarkets(
    effectiveFilters,
    { first: 20 }
  )

  // Get market counts for stats display
  const { counts, loading: countsLoading } = useMarketCounts()

  // Use markets from GraphQL data or empty array
  const markets = marketsData?.markets || []

  const handleFilterChange = (key: keyof MarketFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      sortBy: 'newest'
    })
    setSearchQuery('')
  }

  const hasActiveFilters = filters.status !== 'all' || filters.sortBy !== 'newest' || searchQuery.trim()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Prediction Markets
              </h1>
              <p className="text-muted-foreground mt-2">
                Discover and trade on future events
              </p>
            </div>
            
            {/* Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-semibold">
                  {countsLoading ? '...' : counts.total}
                </div>
                <div className="text-muted-foreground">Markets</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">
                  {countsLoading ? '...' : counts.totalVolume}
                </div>
                <div className="text-muted-foreground">Volume</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Filter */}
          <Select 
            value={filters.sortBy || 'newest'} 
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="capitalize">
                {filters.status}
              </Badge>
            )}
            {filters.sortBy !== 'newest' && (
              <Badge variant="secondary">
                Sort: {filters.sortBy}
              </Badge>
            )}
            {searchQuery.trim() && (
              <Badge variant="secondary">
                Search: "{searchQuery.trim()}"
              </Badge>
            )}
          </div>
        )}

        {/* Market Grid */}
        <MarketGrid
          markets={markets}
          loading={loading}
          error={error}
          onRetry={() => refetch?.()}
          onMarketClick={(market) => {
            // Navigate to market detail page
            router.push(`/markets/${market.id}`)
          }}
          onTrade={(market, outcome) => {
            // Navigate to market detail page and open trading sidebar
            router.push(`/markets/${market.id}?trade=${outcome.toLowerCase()}`)
          }}
        />

        {/* Load More */}
        {markets.length > 0 && !loading && (
          <div className="text-center">
            <Button variant="outline" disabled>
              Load More Markets
              <span className="text-xs ml-2">(Coming Soon)</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MarketsPage() {
  return (
    <PageErrorBoundary pageName="Markets">
      <ClientOnly fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Prediction Markets
                </h1>
                <p className="text-muted-foreground mt-2">
                  Loading markets...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
        <MarketsPageContent />
      </ClientOnly>
    </PageErrorBoundary>
  )
}