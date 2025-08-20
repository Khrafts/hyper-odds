'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { MarketHeader } from '@/components/markets/market-detail/marketHeader'
import { TradingInterface } from '@/components/markets/market-detail/tradingInterface'
import { ActivityFeed } from '@/components/markets/market-detail/activityFeed'
import { ProbabilityChart } from '@/components/charts/probabilityChart'
import { PageErrorBoundary, AsyncBoundary, NotFoundError } from '@/components/error'
import { useMarket } from '@/hooks/useMarket'
import { calculateMarketProbabilities } from '@/lib/probability'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Users, Clock, DollarSign, BarChart3, Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface MarketDetailPageParams {
  id: string
}

function MarketDetailContent({ marketId }: { marketId: string }) {
  const { data, loading, error, refetch } = useMarket(marketId)
  const market = data?.market
  const searchParams = useSearchParams()
  
  // Handle transaction success callback
  const handleTransactionSuccess = async () => {
    // Refetch GraphQL data after transaction to update:
    // - Market pools (poolYes, poolNo)
    // - Activity feed (recent deposits)
    // - Market statistics (volume, traders count)
    // - Probability calculations
    await refetch()
  }
  
  // Trading sidebar state
  const [isTradingSidebarOpen, setIsTradingSidebarOpen] = useState(false)
  
  // Auto-open sidebar if trade param is present
  useEffect(() => {
    const tradeParam = searchParams.get('trade')
    if (tradeParam && market) {
      setIsTradingSidebarOpen(true)
    }
  }, [searchParams, market])
  
  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTradingSidebarOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])
  
  // Calculate current probabilities using shared utility for consistency (use GraphQL data only)
  const { yesProb, noProb, yesDisplay, noDisplay } = market ? 
    calculateMarketProbabilities(market.poolYes || '0', market.poolNo || '0', 1) :
    { yesProb: 50, noProb: 50, yesDisplay: '50.0%', noDisplay: '50.0%' }
  
  // Calculate total pool for display purposes
  const totalPool = market ? parseFloat(market.poolYes || '0') + parseFloat(market.poolNo || '0') : 0

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
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          isTradingSidebarOpen ? "mr-96" : "mr-0"
        )}>
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
              yesDisplay={yesDisplay}
              noDisplay={noDisplay}
              yesProb={yesProb}
              noProb={noProb}
              onShare={() => {
                navigator.clipboard?.writeText(window.location.href)
                console.log('Market shared!')
              }}
              onBookmark={() => {
                console.log('Market bookmarked!')
              }}
              onReport={() => {
                console.log('Market reported!')
              }}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">YES</p>
                      <p className="text-lg font-bold text-green-600">{yesDisplay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                    <div>
                      <p className="text-sm text-muted-foreground">NO</p>
                      <p className="text-lg font-bold text-red-600">{noDisplay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pool</p>
                      <p className="text-lg font-bold">{totalPool.toFixed(0)} USDC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={
                        market.cancelled ? "destructive" : 
                        market.resolved ? "secondary" : 
                        "default"
                      }>
                        {market.cancelled ? "Cancelled" : 
                         market.resolved ? "Resolved" : 
                         "Active"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Market Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Probability Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProbabilityChart market={market} marketTitle={market.title} />
                  </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityFeed 
                      marketId={marketId} 
                      trades={market?.deposits?.map((deposit: any) => ({
                        id: deposit.id,
                        trader: deposit.user.id,
                        outcome: deposit.outcome === 1 ? 'YES' : 'NO' as 'YES' | 'NO',
                        type: 'buy' as 'buy' | 'sell', // Deposits are always buys in this context
                        shares: BigInt(deposit.amount), // Using amount as shares for now
                        amount: BigInt(Math.round(parseFloat(deposit.amount) * 1e18)), // Convert to wei
                        price: 0.5, // We'd need to calculate this from pool ratios
                        timestamp: new Date(parseInt(deposit.timestamp) * 1000),
                        txHash: deposit.transactionHash
                      }))}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Market Info */}
              <div className="space-y-6">
                {/* Quick Trade Button */}
                <Card>
                  <CardContent className="p-6">
                    <Button
                      onClick={() => setIsTradingSidebarOpen(true)}
                      className="w-full h-12"
                      size="lg"
                    >
                      Trade on this Market
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Opens trading sidebar
                    </p>
                  </CardContent>
                </Card>

                {/* Market Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{new Date(parseInt(market.createdAt) * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cut-off Time</span>
                      <span>{new Date(parseInt(market.cutoffTime) * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Resolve Time</span>
                      <span>{new Date(parseInt(market.resolveTime) * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">YES Pool</span>
                      <span className="font-medium">{parseFloat(market.poolYes || '0').toFixed(2)} USDC</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">NO Pool</span>
                      <span className="font-medium">{parseFloat(market.poolNo || '0').toFixed(2)} USDC</span>
                    </div>
                    
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground">Total Pool</span>
                      <span>{totalPool.toFixed(2)} USDC</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <NotFoundError 
          onRetry={() => refetch()}
          className="min-h-[400px]"
        />
      )}
      
      {/* Trading Sidebar Overlay */}
      {isTradingSidebarOpen && market && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsTradingSidebarOpen(false)}
        />
      )}

      {/* Trading Sidebar */}
      {market && (
        <div className={cn(
          "fixed top-0 right-0 h-full w-96 bg-background border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto",
          isTradingSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-6">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Trade Market</h2>
                <p className="text-sm text-muted-foreground">Make your prediction</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTradingSidebarOpen(false)}
              >
                ✕
              </Button>
            </div>

            {/* Market Title */}
            <div className="mb-6">
              <h3 className="font-medium text-sm mb-2">{market.title}</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>YES: {yesDisplay}</span>
                <span>NO: {noDisplay}</span>
                <span>Pool: {totalPool.toFixed(0)} USDC</span>
              </div>
            </div>

            {/* Trading Interface */}
            <TradingInterface 
              market={market}
              yesDisplay={yesDisplay}
              noDisplay={noDisplay}
              yesProb={yesProb}
              noProb={noProb}
              onTrade={async (side, amount) => {
                console.log(`Trading ${side} for ${amount} USDC`)
                // Trading will be handled by the TradingInterface component
              }}
              onTransactionSuccess={handleTransactionSuccess}
            />
          </div>
        </div>
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
  const params = useParams()
  const marketId = params?.id as string

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