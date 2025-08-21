'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ComponentErrorBoundary } from '@/components/error/errorBoundary'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ExternalLink,
  Trophy,
  AlertCircle,
  DollarSign,
  BarChart3,
  Target
} from 'lucide-react'
import { PositionWithStats } from '@/types/user'
import { cn } from '@/lib/utils'
import { formatEther } from 'viem'

interface PositionCardProps {
  position: PositionWithStats
  onClaim?: () => Promise<void>
  onSell?: (shares: string) => Promise<void>
  className?: string
  compact?: boolean
  showActions?: boolean
}

export function PositionCard({
  position,
  onClaim,
  onSell,
  className,
  compact = false,
  showActions = true
}: PositionCardProps) {
  const pnl = parseFloat(position.unrealizedPnl || '0')
  const pnlPercent = position.roi || 0
  const stakeYes = parseFloat(position.stakeYes || '0')
  const stakeNo = parseFloat(position.stakeNo || '0')
  const totalStake = parseFloat(position.totalStake || '0')
  const potentialPayout = parseFloat(position.potentialPayout || '0')

  const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600'
  const pnlBgColor = pnl >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
  const pnlIcon = pnl >= 0 ? TrendingUp : TrendingDown
  const PnlIcon = pnlIcon

  const dominantOutcome = stakeYes > stakeNo ? 'YES' : 'NO'
  const outcomeColor = dominantOutcome === 'YES' ? 'bg-green-600' : 'bg-red-600'
  const isResolved = position.market.resolved || position.market.cancelled
  const canClaim = position.status === 'claimable'

  // Use actual market probabilities
  const marketProbabilityYes = Math.round(position.currentProbabilityYes * 100)
  const marketProbabilityNo = Math.round(position.currentProbabilityNo * 100)
  const marketProbability = dominantOutcome === 'YES' ? marketProbabilityYes : marketProbabilityNo

  if (compact) {
    return (
      <CompactPositionCard 
        position={position}
        pnl={pnl}
        pnlPercent={pnlPercent}
        pnlColor={pnlColor}
        className={className}
      />
    )
  }

  return (
    <ComponentErrorBoundary componentName="PositionCard">
      <Card className={cn('hover:shadow-md transition-shadow', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link 
                href={`/markets/${position.market.id}`}
                className="hover:underline"
              >
                <h3 className="font-semibold text-base line-clamp-2 leading-tight">
                  {position.market.title || 'Market Title'}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                {position.market.description && position.market.description.length > 100
                  ? `${position.market.description.slice(0, 100)}...`
                  : position.market.description || 'Market description'}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge 
                className={cn('text-white', outcomeColor)}
              >
                {dominantOutcome}
              </Badge>
              
              {isResolved && (
                <Badge variant={canClaim ? 'default' : 'secondary'}>
                  {canClaim ? 'Won' : 'Lost'}
                </Badge>
              )}
              
              {canClaim && (
                <Trophy className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Position Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Stake</p>
              <p className="text-lg font-semibold">
                ${totalStake.toFixed(2)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">P&L</p>
              <div className="flex items-center gap-1">
                <PnlIcon className={cn('h-4 w-4', pnlColor)} />
                <p className={cn('text-lg font-semibold', pnlColor)}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </p>
              </div>
              <p className={cn('text-xs', pnlColor)}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <Separator />

          {/* Position Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">YES Stake</span>
              <span className="font-medium">${stakeYes.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">NO Stake</span>
              <span className="font-medium">${stakeNo.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Market Probability</span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={marketProbability} 
                  className="w-16 h-2"
                />
                <span className="text-sm font-medium">{marketProbability}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(parseInt(position.createdAt) * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className={cn('p-3 rounded-lg', pnlBgColor)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className={cn('h-4 w-4', pnlColor)} />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <span className={cn('text-sm font-semibold', pnlColor)}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="space-y-3">
              {canClaim && (
                <Button
                  onClick={onClaim}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Claim ${potentialPayout.toFixed(2)}
                </Button>
              )}
              
              {position.status === 'active' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onSell?.(totalStake.toString())}
                  >
                    Sell All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/markets/${position.market.id}`}>
                      <Target className="h-4 w-4 mr-1" />
                      Trade
                    </Link>
                  </Button>
                </div>
              )}
              
              {position.status === 'lost' && (
                <div className="text-center py-2">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">Position closed</p>
                </div>
              )}
            </div>
          )}

          {/* External Link */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={`/markets/${position.market.id}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                View Market
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  )
}

interface CompactPositionCardProps {
  position: PositionWithStats
  pnl: number
  pnlPercent: number
  pnlColor: string
  className?: string
}

function CompactPositionCard({ 
  position, 
  pnl, 
  pnlPercent, 
  pnlColor, 
  className 
}: CompactPositionCardProps) {
  const stakeYes = parseFloat(position.stakeYes || '0')
  const stakeNo = parseFloat(position.stakeNo || '0')
  const dominantOutcome = stakeYes > stakeNo ? 'YES' : 'NO'
  const outcomeColor = dominantOutcome === 'YES' ? 'bg-green-600' : 'bg-red-600'
  const totalStake = parseFloat(position.totalStake || '0')

  return (
    <Card className={cn('hover:shadow-sm transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('text-white text-xs', outcomeColor)}>
                {dominantOutcome}
              </Badge>
              <span className="text-sm font-medium truncate">
                ${totalStake.toFixed(2)} staked
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {position.market.title || 'Market Title'}
            </p>
          </div>
          
          <div className="text-right ml-4">
            <p className="text-sm font-semibold">
              ${totalStake.toFixed(2)}
            </p>
            <p className={cn('text-xs', pnlColor)}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </p>
            <p className={cn('text-xs', pnlColor)}>
              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
            </p>
          </div>
        </div>
        
        {position.status === 'claimable' && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600 font-medium">Ready to claim</span>
              <Trophy className="h-3 w-3 text-yellow-500" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// List wrapper component
interface PositionCardsListProps {
  positions: PositionWithStats[]
  loading?: boolean
  onClaim?: (position: PositionWithStats) => Promise<void>
  onSell?: (position: PositionWithStats, shares: string) => Promise<void>
  compact?: boolean
  showActions?: boolean
  emptyMessage?: string
  className?: string
}

export function PositionCardsList({
  positions,
  loading = false,
  onClaim,
  onSell,
  compact = false,
  showActions = true,
  emptyMessage = "No positions found",
  className
}: PositionCardsListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-6 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          position={position}
          onClaim={() => onClaim?.(position)}
          onSell={(shares) => onSell?.(position, shares)}
          compact={compact}
          showActions={showActions}
        />
      ))}
    </div>
  )
}