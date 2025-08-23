'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Market } from '@/types/market'
import { formatEther } from 'viem'
import { TrendingUp, Clock, Users, Layers } from 'lucide-react'
import { ComponentErrorBoundary, InlineError } from '../error'
import { getMarketProbability } from '@/lib/pricing'
import { getMarketType } from '@/lib/web3/contracts'

interface MarketCardProps {
  market: Market
  onClick?: () => void
  onTrade?: (market: Market, outcome: 'YES' | 'NO') => void
}

export function MarketCard({ market, onClick, onTrade }: MarketCardProps) {
  const [tradeError, setTradeError] = useState<string | null>(null)

  // Defensive null checks - log for debugging
  if (!market) {
    console.error('MarketCard: market is null/undefined')
    return null
  }

  try {
    // Get market type and calculate probabilities
    const marketType = getMarketType(market)
    const yesProb = getMarketProbability(market)
    const noProb = 100 - yesProb
    const yesDisplay = `${yesProb.toFixed(1)}%`
    const noDisplay = `${noProb.toFixed(1)}%`

    // Format volume - different fields based on market type
    let volume = 0
    if (marketType === 'CPMM') {
      // For CPMM, use total reserves as volume proxy
      const reserveYes = parseFloat(market.reserveYes || '0')
      const reserveNo = parseFloat(market.reserveNo || '0')
      volume = reserveYes + reserveNo
    } else {
      // For Parimutuel, use totalPool
      volume = parseFloat(market.totalPool || '0')
    }
    
    const formattedVolume = volume >= 1000000 
      ? `$${(volume / 1000000).toFixed(1)}M`
      : volume >= 1000 
      ? `$${(volume / 1000).toFixed(1)}K`
      : `$${volume.toFixed(0)}`

    // Check if expired - using cutoffTime from GraphQL schema
    const isExpired = market.cutoffTime && new Date(parseInt(market.cutoffTime) * 1000) < new Date()
    const isResolved = market.resolved

    const handleTrade = async (outcome: 'YES' | 'NO') => {
      try {
        setTradeError(null)
        await onTrade?.(market, outcome)
      } catch (error) {
        setTradeError(error instanceof Error ? error.message : 'Failed to process trade')
      }
    }

    return (
      <ComponentErrorBoundary componentName="MarketCard">
        <Card 
          className="hover:shadow-lg transition-smooth hover-lift cursor-pointer group"
          onClick={onClick}
        >
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  marketType === 'CPMM' 
                    ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300' 
                    : 'border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300'
                }`}
              >
                <Layers className="h-3 w-3 mr-1" />
                {marketType}
              </Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">
              {market.title}
            </CardTitle>
          </div>
          <div className="flex flex-col gap-1">
            {isResolved && (
              <Badge variant={market.winningOutcome === 1 ? 'default' : 'secondary'}>
                {market.winningOutcome === 1 ? 'YES' : 'NO'}
              </Badge>
            )}
            {!isResolved && isExpired && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Probability bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">
              YES {yesDisplay}
            </span>
            <span className="font-medium text-red-600 dark:text-red-400">
              NO {noDisplay}
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
              style={{ width: `${yesProb}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-500 ease-out"
              style={{ width: `${noProb}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1" title={marketType === 'CPMM' ? 'Total Liquidity' : 'Total Volume'}>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedVolume}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">0</span>
          </div>
          {market.cutoffTime && !isExpired && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {getTimeRemaining(market.cutoffTime)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Trade error display */}
        {tradeError && (
          <InlineError 
            message={tradeError} 
            onDismiss={() => setTradeError(null)} 
          />
        )}

        {/* Quick trade buttons */}
        {!isResolved && !isExpired && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950 transition-smooth active-scale focus-ring"
              onClick={(e) => {
                e.stopPropagation()
                handleTrade('YES')
              }}
            >
              {marketType === 'CPMM' ? 'Buy YES' : 'Bet YES'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-smooth active-scale focus-ring"
              onClick={(e) => {
                e.stopPropagation()
                handleTrade('NO')
              }}
            >
              {marketType === 'CPMM' ? 'Buy NO' : 'Bet NO'}
            </Button>
          </div>
        )}
      </CardContent>

        {/* Categories not yet available in GraphQL schema */}
        </Card>
      </ComponentErrorBoundary>
    )
  } catch (error) {
    console.error('MarketCard error:', error, 'Market data:', market)
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="text-sm text-red-900 dark:text-red-100">
            Error loading market card
          </div>
          <div className="text-xs text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    )
  }
}

function getTimeRemaining(cutoffTime: string): string {
  const now = new Date()
  const expiry = new Date(parseInt(cutoffTime) * 1000) // Convert Unix timestamp to milliseconds
  const diff = expiry.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h`
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${minutes}m`
}