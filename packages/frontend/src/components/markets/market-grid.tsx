'use client'

import React from 'react'
import { MarketCard } from './market-card'
import { Market } from '@/hooks/use-markets'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription } from '../ui/alert'
import { AlertTriangle } from 'lucide-react'

interface MarketGridProps {
  markets: Market[]
  loading?: boolean
  error?: string | null
  onMarketClick?: (market: Market) => void
  onTrade?: (market: Market, outcome: 'YES' | 'NO') => void
  className?: string
}

export function MarketGrid({ 
  markets, 
  loading, 
  error, 
  onMarketClick, 
  onTrade,
  className 
}: MarketGridProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load markets: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return <MarketGridSkeleton />
  }

  if (markets.length === 0) {
    return (
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
    )
  }

  return (
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