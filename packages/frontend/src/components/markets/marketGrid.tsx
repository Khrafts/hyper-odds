'use client'

import React from 'react'
import { MarketCard } from './marketCard'
import { Market } from '@/hooks/useMarkets'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription } from '../ui/alert'
import { AlertTriangle } from 'lucide-react'
import { ComponentErrorBoundary, AsyncBoundary } from '../error'

interface MarketGridProps {
  markets: Market[]
  loading?: boolean
  error?: string | Error | null
  onMarketClick?: (market: Market) => void
  onTrade?: (market: Market, outcome: 'YES' | 'NO') => void
  onRetry?: () => void
  className?: string
}

export function MarketGrid({ 
  markets, 
  loading, 
  error, 
  onMarketClick, 
  onTrade,
  onRetry,
  className 
}: MarketGridProps) {
  const errorObj = typeof error === 'string' ? new Error(error) : error

  return (
    <ComponentErrorBoundary componentName="MarketGrid">
      <AsyncBoundary
        isLoading={loading}
        error={errorObj}
        onRetry={onRetry}
        loadingFallback={<MarketGridSkeleton />}
      >
        {markets.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <h3 className="text-lg font-semibold text-muted-foreground">
                No markets found
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or check back later for new markets.
              </p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-6 ${className || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onClick={() => onMarketClick?.(market)}
                onTrade={onTrade}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </ComponentErrorBoundary>
  )
}

function MarketGridSkeleton() {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4 p-4 border rounded-lg">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </div>
  )
}