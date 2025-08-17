'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { MarketHeader } from '@/components/markets/market-detail/marketHeader'
import { TradingInterface } from '@/components/markets/market-detail/tradingInterface'
import { PageErrorBoundary, AsyncBoundary, NotFoundError } from '@/components/error'
import { useMarket } from '@/hooks/useMarket'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Users, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface MarketDetailPageParams {
  id: string
}

function MarketDetailContent({ marketId }: { marketId: string }) {
  const { data, loading, error, refetch } = useMarket(marketId)
  const market = data?.market

  return (
    <AsyncBoundary
      isLoading={loading}
      error={error}
      onRetry={() => refetch()}
      loadingFallback={<MarketDetailSkeleton />}
      errorFallback={
        !market && !loading ? (
          <NotFoundError onRetry={() => refetch()} />
        ) : undefined
      }
    >
      {market ? (
        <div className="space-y-8">
          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/markets">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Markets
              </Link>
            </Button>
          </div>

          {/* Market Header */}
          <MarketHeader 
            market={market}
            onShare={() => {
              // TODO: Implement share functionality
              navigator.clipboard?.writeText(window.location.href)
              console.log('Market shared!')
            }}
            onBookmark={() => {
              // TODO: Implement bookmark functionality
              console.log('Market bookmarked!')
            }}
            onReport={() => {
              // TODO: Implement report functionality
              console.log('Market reported!')
            }}
          />

          <Separator />

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trading Interface */}
              <TradingInterface 
                market={market}
                onTrade={async (side, amount) => {
                  // TODO: Implement actual trading logic with contract hooks
                  console.log(`Trading ${side} for ${amount} ETH`)
                  // This will be connected to the trading hooks in Task 31
                  return new Promise((resolve) => {
                    setTimeout(() => {
                      console.log('Trade executed successfully')
                      resolve()
                    }, 2000)
                  })
                }}
              />

              {/* Market Activity Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      Market activity feed coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Market Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Market Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Volume</span>
                      <span className="text-sm font-medium">
                        ${parseFloat(market.totalPool || '0').toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">YES Pool</span>
                      <span className="text-sm font-medium">
                        ${parseFloat(market.poolYes || '0').toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">NO Pool</span>
                      <span className="text-sm font-medium">
                        ${parseFloat(market.poolNo || '0').toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Traders</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Market Created</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(parseInt(market.createdAt) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {market.cutoffTime && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(parseInt(market.cutoffTime) * 1000) > new Date() 
                              ? 'Trading Ends' 
                              : 'Trading Ended'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(parseInt(market.cutoffTime) * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {market.resolved && market.resolveTime && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Market Resolved</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(parseInt(market.resolveTime) * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <NotFoundError 
          onRetry={() => refetch()}
          className="min-h-[400px]"
        />
      )}
    </AsyncBoundary>
  )
}

function MarketDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Navigation Skeleton */}
      <div className="h-10 w-32 bg-muted rounded" />

      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-3/4 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function MarketDetailPage() {
  const params = useParams() as MarketDetailPageParams
  const marketId = params?.id

  if (!marketId) {
    return (
      <PageErrorBoundary pageName="Market Detail">
        <div className="container mx-auto px-4 py-8">
          <NotFoundError />
        </div>
      </PageErrorBoundary>
    )
  }

  return (
    <PageErrorBoundary pageName="Market Detail">
      <div className="container mx-auto px-4 py-8">
        <MarketDetailContent marketId={marketId} />
      </div>
    </PageErrorBoundary>
  )
}