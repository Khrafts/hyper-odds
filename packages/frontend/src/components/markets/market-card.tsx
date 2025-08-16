'use client'

import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Market } from '@/types'
import { formatEther } from 'viem'
import { TrendingUp, TrendingDown, Clock, Users } from 'lucide-react'

interface MarketCardProps {
  market: Market
  onClick?: () => void
  onTrade?: (market: Market, outcome: 'YES' | 'NO') => void
}

export function MarketCard({ market, onClick, onTrade }: MarketCardProps) {
  // Calculate probabilities
  const poolYes = parseFloat(market.poolYes || '0')
  const poolNo = parseFloat(market.poolNo || '0')
  const totalPool = poolYes + poolNo
  const yesProb = totalPool > 0 ? (poolYes / totalPool) * 100 : 50
  const noProb = totalPool > 0 ? (poolNo / totalPool) * 100 : 50

  // Format volume
  const volume = parseFloat(market.totalVolume || '0')
  const formattedVolume = volume >= 1000000 
    ? `$${(volume / 1000000).toFixed(1)}M`
    : volume >= 1000 
    ? `$${(volume / 1000).toFixed(1)}K`
    : `$${volume.toFixed(0)}`

  // Check if expired
  const isExpired = market.expirationTime && new Date(market.expirationTime) < new Date()
  const isResolved = market.resolved

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">
            {market.question}
          </CardTitle>
          {isResolved && (
            <Badge variant={market.resolvedOutcome === 'YES' ? 'default' : 'secondary'}>
              {market.resolvedOutcome}
            </Badge>
          )}
          {!isResolved && isExpired && (
            <Badge variant="destructive">Expired</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Probability bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">
              YES {yesProb.toFixed(1)}%
            </span>
            <span className="font-medium text-red-600 dark:text-red-400">
              NO {noProb.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400"
              style={{ width: `${yesProb}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400"
              style={{ width: `${noProb}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedVolume}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{market.totalTrades || 0}</span>
          </div>
          {market.expirationTime && !isExpired && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {getTimeRemaining(market.expirationTime)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick trade buttons */}
        {!isResolved && !isExpired && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              onClick={(e) => {
                e.stopPropagation()
                onTrade?.(market, 'YES')
              }}
            >
              Buy YES @ {(yesProb / 100).toFixed(2)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              onClick={(e) => {
                e.stopPropagation()
                onTrade?.(market, 'NO')
              }}
            >
              Buy NO @ {(noProb / 100).toFixed(2)}
            </Button>
          </div>
        )}
      </CardContent>

      {market.category && (
        <CardFooter className="pt-0">
          <Badge variant="outline">{market.category}</Badge>
        </CardFooter>
      )}
    </Card>
  )
}

function getTimeRemaining(expirationTime: string): string {
  const now = new Date()
  const expiry = new Date(expirationTime)
  const diff = expiry.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h`
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${minutes}m`
}