'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ComponentErrorBoundary } from '@/components/error'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Users,
  Activity,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { formatEther } from 'viem'
import { cn } from '@/lib/utils'

interface Trade {
  id: string
  trader: string
  ensName?: string
  outcome: 'YES' | 'NO'
  type: 'buy' | 'sell'
  shares: bigint
  amount: bigint
  price: number
  timestamp: Date
  txHash: string
  impact?: number // price impact percentage
}

interface ActivityFeedProps {
  marketId: string
  trades?: Trade[]
  loading?: boolean
  onRefresh?: () => void
  className?: string
  maxHeight?: number
  showFilters?: boolean
}

export function ActivityFeed({
  marketId,
  trades,
  loading = false,
  onRefresh,
  className,
  maxHeight = 400,
  showFilters = true
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'buys' | 'sells'>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'YES' | 'NO'>('all')

  // Generate mock trades if none provided
  const displayTrades = useMemo(() => {
    if (trades) return trades
    
    const mockTrades: Trade[] = []
    const now = Date.now()
    
    for (let i = 0; i < 20; i++) {
      const isBuy = Math.random() > 0.3
      const isYes = Math.random() > 0.5
      const amount = BigInt(Math.floor(Math.random() * 1000 + 10) * 1e18)
      const shares = BigInt(Math.floor(Math.random() * 2000 + 20))
      const price = isYes ? 0.3 + Math.random() * 0.4 : 0.3 + Math.random() * 0.4
      
      mockTrades.push({
        id: `trade-${i}`,
        trader: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
        ensName: Math.random() > 0.7 ? `trader${i}.eth` : undefined,
        outcome: isYes ? 'YES' : 'NO',
        type: isBuy ? 'buy' : 'sell',
        shares,
        amount,
        price,
        timestamp: new Date(now - i * 5 * 60 * 1000), // 5 minutes apart
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        impact: Math.random() * 5 - 2.5 // -2.5% to +2.5%
      })
    }
    
    return mockTrades
  }, [trades])

  // Apply filters
  const filteredTrades = useMemo(() => {
    let filtered = [...displayTrades]
    
    if (filter !== 'all') {
      filtered = filtered.filter(t => 
        filter === 'buys' ? t.type === 'buy' : t.type === 'sell'
      )
    }
    
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter(t => t.outcome === outcomeFilter)
    }
    
    return filtered
  }, [displayTrades, filter, outcomeFilter])

  const formatAmount = (amount: bigint) => {
    const value = parseFloat(formatEther(amount))
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(2)}`
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getTraderDisplay = (trade: Trade) => {
    if (trade.ensName) return trade.ensName
    return trade.trader
  }

  const getTraderInitials = (trade: Trade) => {
    if (trade.ensName) {
      return trade.ensName.slice(0, 2).toUpperCase()
    }
    return trade.trader.slice(2, 4).toUpperCase()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ComponentErrorBoundary componentName="ActivityFeed">
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Feed
            </CardTitle>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {showFilters && (
            <div className="px-6 pb-4 space-y-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="buys">Buys</TabsTrigger>
                  <TabsTrigger value="sells">Sells</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex gap-2">
                <Button
                  variant={outcomeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOutcomeFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={outcomeFilter === 'YES' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOutcomeFilter('YES')}
                  className={cn(
                    outcomeFilter === 'YES' && 'bg-green-600 hover:bg-green-700'
                  )}
                >
                  YES
                </Button>
                <Button
                  variant={outcomeFilter === 'NO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOutcomeFilter('NO')}
                  className={cn(
                    outcomeFilter === 'NO' && 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  NO
                </Button>
              </div>
            </div>
          )}
          
          <ScrollArea style={{ height: maxHeight }}>
            <div className="px-6 pb-4">
              {filteredTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No trades yet</p>
                  <p className="text-xs mt-1">Be the first to trade!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTrades.map((trade) => (
                    <TradeItem key={trade.id} trade={trade} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Summary Stats */}
          {filteredTrades.length > 0 && (
            <div className="border-t px-6 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredTrades.length} trades</span>
                <span>
                  Volume: {formatAmount(
                    filteredTrades.reduce((sum, t) => sum + t.amount, BigInt(0))
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  )
}

interface TradeItemProps {
  trade: Trade
}

function TradeItem({ trade }: TradeItemProps) {
  const isBuy = trade.type === 'buy'
  const isYes = trade.outcome === 'YES'
  
  const actionIcon = isBuy ? ArrowUpRight : ArrowDownRight
  const ActionIcon = actionIcon
  const actionColor = isBuy ? 'text-green-600' : 'text-red-600'
  
  return (
    <div className="flex items-start gap-3 group">
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn(
          'text-xs',
          isYes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        )}>
          {getTraderInitials(trade)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {getTraderDisplay(trade)}
              </span>
              <span className={cn('text-sm', actionColor)}>
                {isBuy ? 'bought' : 'sold'}
              </span>
              <Badge 
                variant={isYes ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  isYes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}
              >
                {trade.shares.toString()} {trade.outcome}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatAmount(trade.amount)}
              </span>
              {trade.price > 0 && <span>@${trade.price.toFixed(3)}</span>}
              {trade.impact && Math.abs(trade.impact) > 0.5 && (
                <span className={cn(
                  'flex items-center gap-0.5',
                  trade.impact > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  <TrendingUp className="h-3 w-3" />
                  {trade.impact > 0 ? '+' : ''}{trade.impact.toFixed(1)}%
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(trade.timestamp)}
              </span>
            </div>
          </div>
          
          <a
            href={`https://arbiscan.io/tx/${trade.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </a>
        </div>
      </div>
    </div>
  )
}

// Mini activity feed for cards
interface MiniActivityFeedProps {
  trades: Trade[]
  maxItems?: number
  className?: string
}

export function MiniActivityFeed({ 
  trades, 
  maxItems = 3,
  className 
}: MiniActivityFeedProps) {
  const recentTrades = trades.slice(0, maxItems)
  
  return (
    <div className={cn('space-y-2', className)}>
      {recentTrades.map((trade) => (
        <div key={trade.id} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium',
              trade.type === 'buy' ? 'text-green-600' : 'text-red-600'
            )}>
              {trade.type === 'buy' ? '↑' : '↓'}
            </span>
            <span className="truncate max-w-[100px]">
              {getTraderDisplay(trade)}
            </span>
            <Badge variant="outline" className="text-xs h-5">
              {trade.outcome}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {formatAmount(trade.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}

function getTraderDisplay(trade: Trade): string {
  if (trade.ensName) return trade.ensName
  return trade.trader
}

function getTraderInitials(trade: Trade): string {
  if (trade.ensName) {
    return trade.ensName.slice(0, 2).toUpperCase()
  }
  return trade.trader.slice(2, 4).toUpperCase()
}

function formatAmount(amount: bigint): string {
  const value = parseFloat(formatEther(amount))
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

function formatTime(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}