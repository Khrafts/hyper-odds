'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ComponentErrorBoundary } from '@/components/error'
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
import { UserPosition } from '@/types/user'
import { cn } from '@/lib/utils'
import { formatEther } from 'viem'

interface PositionCardProps {
  position: UserPosition
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
  const pnl = parseFloat(position.unrealizedPnl)
  const pnlPercent = position.pnlPercent
  const currentValue = parseFloat(position.currentValue)
  const invested = parseFloat(position.totalInvested)

  const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600'
  const pnlBgColor = pnl >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
  const pnlIcon = pnl >= 0 ? TrendingUp : TrendingDown
  const PnlIcon = pnlIcon

  const outcomeColor = position.outcome === 'YES' ? 'bg-green-600' : 'bg-red-600'
  const isResolved = !position.isActive
  const canClaim = position.canClaim && position.claimableAmount

  // Calculate market probability (mock for now)
  const marketProbability = position.outcome === 'YES' ? 65 : 35

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
                href={`/markets/${position.marketId}`}
                className="hover:underline"
              >
                <h3 className="font-semibold text-base line-clamp-2 leading-tight">
                  {position.market.question || 'Market Question'}
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
                {position.outcome}
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
              <p className="text-sm text-muted-foreground">Position Value</p>
              <p className="text-lg font-semibold">
                ${currentValue.toFixed(2)}
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
              <span className="text-sm text-muted-foreground">Shares Owned</span>
              <span className="font-medium">{parseFloat(position.shares).toFixed(0)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Invested</span>
              <span className="font-medium">${invested.toFixed(2)}</span>
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
            
            {position.firstTradeAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Held Since</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(position.firstTradeAt).toLocaleDateString()}
                </span>
              </div>
            )}
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
                  Claim ${parseFloat(position.claimableAmount || '0').toFixed(2)}
                </Button>
              )}
              
              {position.isActive && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onSell?.(position.shares)}
                  >
                    Sell All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/markets/${position.marketId}`}>
                      <Target className="h-4 w-4 mr-1" />
                      Trade
                    </Link>
                  </Button>
                </div>
              )}
              
              {!position.isActive && !canClaim && (
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
              <Link href={`/markets/${position.marketId}`}>
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
  position: UserPosition
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
  const outcomeColor = position.outcome === 'YES' ? 'bg-green-600' : 'bg-red-600'
  const currentValue = parseFloat(position.currentValue)

  return (
    <Card className={cn('hover:shadow-sm transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('text-white text-xs', outcomeColor)}>
                {position.outcome}
              </Badge>
              <span className="text-sm font-medium truncate">
                {parseFloat(position.shares).toFixed(0)} shares
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {position.market.question || 'Market Question'}
            </p>
          </div>
          
          <div className="text-right ml-4">
            <p className="text-sm font-semibold">
              ${currentValue.toFixed(2)}
            </p>
            <p className={cn('text-xs', pnlColor)}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </p>
            <p className={cn('text-xs', pnlColor)}>
              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
            </p>
          </div>
        </div>
        
        {position.canClaim && (
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
  positions: UserPosition[]
  loading?: boolean
  onClaim?: (position: UserPosition) => Promise<void>
  onSell?: (position: UserPosition, shares: string) => Promise<void>
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