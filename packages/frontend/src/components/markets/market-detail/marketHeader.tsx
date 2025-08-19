'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ComponentErrorBoundary } from '@/components/error'
import { Market } from '@/hooks/useMarkets'
import { calculateMarketProbabilities } from '@/lib/probability'
import { 
  Clock, 
  Calendar,
  User,
  TrendingUp, 
  Users, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Share2,
  Bookmark,
  Flag
} from 'lucide-react'

interface MarketHeaderProps {
  market: Market
  yesDisplay: string
  noDisplay: string
  yesProb: number
  noProb: number
  onShare?: () => void
  onBookmark?: () => void
  onReport?: () => void
  className?: string
}

export function MarketHeader({ 
  market, 
  yesDisplay,
  noDisplay,
  yesProb,
  noProb,
  onShare, 
  onBookmark, 
  onReport,
  className 
}: MarketHeaderProps) {
  // Use probability values passed as props for consistency across all components

  // Format volume
  const volume = parseFloat(market.totalPool || '0')
  const formattedVolume = formatVolume(volume)

  // Market status
  const cutoffTime = market.cutoffTime ? new Date(parseInt(market.cutoffTime) * 1000) : null
  const resolveTime = market.resolveTime ? new Date(parseInt(market.resolveTime) * 1000) : null
  const createdAt = new Date(parseInt(market.createdAt) * 1000)
  const isExpired = cutoffTime && cutoffTime < new Date()
  const isResolved = market.resolved

  // Market status logic
  const getMarketStatus = () => {
    if (isResolved) {
      return {
        status: 'resolved',
        label: 'Resolved',
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        description: `Market resolved ${market.winningOutcome === 1 ? 'YES' : 'NO'}`
      }
    }
    
    if (isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive' as const,
        description: 'Trading has ended, awaiting resolution'
      }
    }
    
    return {
      status: 'active',
      label: 'Active',
      icon: <TrendingUp className="h-4 w-4" />,
      variant: 'secondary' as const,
      description: 'Trading is currently active'
    }
  }

  const marketStatus = getMarketStatus()

  return (
    <ComponentErrorBoundary componentName="MarketHeader">
      <div className={`space-y-6 ${className || ''}`}>
        {/* Header Section */}
        <div className="space-y-4">
          {/* Status and Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={marketStatus.variant} className="gap-1">
                {marketStatus.icon}
                {marketStatus.label}
              </Badge>
              
              {isResolved && market.winningOutcome !== undefined && (
                <Badge variant={market.winningOutcome === 1 ? 'default' : 'secondary'}>
                  Winner: {market.winningOutcome === 1 ? 'YES' : 'NO'}
                </Badge>
              )}
              
              {isExpired && !isResolved && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Awaiting Resolution
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onBookmark && (
                <Button variant="outline" size="sm" onClick={onBookmark}>
                  <Bookmark className="h-4 w-4" />
                </Button>
              )}
              {onReport && (
                <Button variant="outline" size="sm" onClick={onReport}>
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {market.title}
            </h1>
            
            {market.description && (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-4xl">
                {market.description}
              </p>
            )}
          </div>

          {/* Creator and Timestamps */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Created by</span>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {market.creator.id.slice(2, 4).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-mono text-xs">
                {`${market.creator.id.slice(0, 6)}...${market.creator.id.slice(-4)}`}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(createdAt)}</span>
            </div>

            {cutoffTime && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {isExpired ? 'Ended' : 'Ends'} {formatDate(cutoffTime)}
                  </span>
                </div>
              </>
            )}

            {resolveTime && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Resolved {formatDate(resolveTime)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Market Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Probability Display */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Current Odds</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-green-600 dark:text-green-400">
                  YES {yesDisplay}
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  NO {noDisplay}
                </span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
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
          </div>

          {/* Trading Volume */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Trading Volume</h3>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{formattedVolume}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Total value traded in this market
            </p>
          </div>

          {/* Market Activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Market Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">0 traders</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">0 trades</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Market participation metrics
            </p>
          </div>
        </div>

        {/* Status Description */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{marketStatus.icon}</div>
            <div>
              <h4 className="font-medium">{marketStatus.label}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {marketStatus.description}
              </p>
              {cutoffTime && !isResolved && (
                <p className="text-xs text-muted-foreground mt-2">
                  {isExpired 
                    ? `Trading ended ${getTimeAgo(cutoffTime)}`
                    : `Trading ends ${getTimeRemaining(cutoffTime)}`
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  )
}

// Helper functions
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`
  }
  return `$${volume.toFixed(0)}`
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 24) {
    return date.toLocaleDateString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  if (diffInHours < 168) { // 7 days
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function getTimeRemaining(endTime: Date): string {
  const now = new Date()
  const diff = endTime.getTime() - now.getTime()
  
  if (diff <= 0) return 'expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${minutes}m`
  return `in ${minutes}m`
}

function getTimeAgo(pastTime: Date): string {
  const now = new Date()
  const diff = now.getTime() - pastTime.getTime()
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}d ${hours}h ago`
  if (hours > 0) return `${hours}h ${minutes}m ago`
  return `${minutes}m ago`
}