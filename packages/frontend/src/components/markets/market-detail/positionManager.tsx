'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ComponentErrorBoundary, InlineError } from '@/components/error'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  Clock,
  Trophy
} from 'lucide-react'
import { formatEther } from 'viem'

interface UserPosition {
  marketId: string
  outcome: 'YES' | 'NO'
  shares: bigint
  avgPrice: number
  currentPrice: number
  invested: bigint
  currentValue: bigint
  pnl: bigint
  pnlPercent: number
  isWinning: boolean
  canClaim: boolean
  claimableAmount?: bigint
  entryTime: Date
}

interface PositionManagerProps {
  position?: UserPosition | null
  marketResolved?: boolean
  winningOutcome?: 'YES' | 'NO' | null
  onClaim?: () => Promise<void>
  onSell?: (shares: bigint) => Promise<void>
  loading?: boolean
  className?: string
}

export function PositionManager({
  position,
  marketResolved = false,
  winningOutcome,
  onClaim,
  onSell,
  loading = false,
  className
}: PositionManagerProps) {
  // Mock position for demo if none provided
  const displayPosition = position || {
    marketId: 'demo',
    outcome: 'YES' as const,
    shares: BigInt(100),
    avgPrice: 0.45,
    currentPrice: 0.75,
    invested: BigInt(45 * 1e18),
    currentValue: BigInt(75 * 1e18),
    pnl: BigInt(30 * 1e18),
    pnlPercent: 66.67,
    isWinning: true,
    canClaim: false,
    entryTime: new Date(Date.now() - 86400000) // 1 day ago
  }

  const pnlColor = displayPosition.pnl >= 0 ? 'text-green-600' : 'text-red-600'
  const pnlIcon = displayPosition.pnl >= 0 ? TrendingUp : TrendingDown
  const PnlIcon = pnlIcon

  const formatCurrency = (value: bigint) => {
    const formatted = parseFloat(formatEther(value))
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(formatted)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100)
  }

  const timeHeld = useMemo(() => {
    const now = new Date()
    const diff = now.getTime() - displayPosition.entryTime.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days}d ${hours}h`
    }
    return `${hours}h`
  }, [displayPosition.entryTime])

  if (!position && !loading) {
    return (
      <ComponentErrorBoundary componentName="PositionManager">
        <Card className={className}>
          <CardHeader>
            <CardTitle className="text-lg">Your Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No position in this market</p>
              <p className="text-xs mt-1">Buy YES or NO shares to get started</p>
            </div>
          </CardContent>
        </Card>
      </ComponentErrorBoundary>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Your Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ComponentErrorBoundary componentName="PositionManager">
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Position</CardTitle>
            <Badge 
              variant={displayPosition.outcome === 'YES' ? 'default' : 'secondary'}
              className={displayPosition.outcome === 'YES' ? 'bg-green-600' : 'bg-red-600'}
            >
              {displayPosition.outcome} Position
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* P&L Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Profit/Loss</span>
              <PnlIcon className={`h-4 w-4 ${pnlColor}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${pnlColor}`}>
                {displayPosition.pnl >= 0 ? '+' : ''}{formatCurrency(displayPosition.pnl)}
              </span>
              <span className={`text-sm ${pnlColor}`}>
                ({displayPosition.pnl >= 0 ? '+' : ''}{formatPercent(displayPosition.pnlPercent)})
              </span>
            </div>
          </div>

          <Separator />

          {/* Position Details */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Shares Owned</span>
              <span className="font-medium">{displayPosition.shares.toString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Entry Price</span>
              <span className="font-medium">${displayPosition.avgPrice.toFixed(3)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Price</span>
              <span className="font-medium">${displayPosition.currentPrice.toFixed(3)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Invested</span>
              <span className="font-medium">{formatCurrency(displayPosition.invested)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Value</span>
              <span className="font-medium">{formatCurrency(displayPosition.currentValue)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Time Held</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeHeld}
              </span>
            </div>
          </div>

          <Separator />

          {/* Market Resolution Status */}
          {marketResolved && winningOutcome && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Market Resolved</span>
                </div>
                <Badge variant={winningOutcome === displayPosition.outcome ? 'default' : 'secondary'}>
                  {winningOutcome === displayPosition.outcome ? 'Winner' : 'Lost'}
                </Badge>
              </div>
              
              {displayPosition.canClaim && displayPosition.claimableAmount && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Claimable Winnings
                    </span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(displayPosition.claimableAmount)}
                    </span>
                  </div>
                  <Button 
                    onClick={onClaim}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Claim Winnings
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!marketResolved && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onSell?.(displayPosition.shares / BigInt(2))}
              >
                Sell Half
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onSell?.(displayPosition.shares)}
              >
                Sell All
              </Button>
            </div>
          )}

          {/* Price Movement Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Entry</span>
              <span>Current</span>
            </div>
            <Progress 
              value={(displayPosition.currentPrice / 1) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs">
              <span>${displayPosition.avgPrice.toFixed(2)}</span>
              <span className={pnlColor}>
                ${displayPosition.currentPrice.toFixed(2)}
                {displayPosition.currentPrice > displayPosition.avgPrice ? (
                  <ArrowUpRight className="inline h-3 w-3 ml-1" />
                ) : (
                  <ArrowDownRight className="inline h-3 w-3 ml-1" />
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  )
}

// Mini version for market cards
interface MiniPositionProps {
  outcome: 'YES' | 'NO'
  shares: number
  pnl: number
  pnlPercent: number
}

export function MiniPosition({ outcome, shares, pnl, pnlPercent }: MiniPositionProps) {
  const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600'
  
  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
      <div className="flex items-center gap-2">
        <Badge 
          variant={outcome === 'YES' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {outcome}
        </Badge>
        <span className="text-sm">{shares} shares</span>
      </div>
      <div className={`text-sm font-medium ${pnlColor}`}>
        {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
      </div>
    </div>
  )
}