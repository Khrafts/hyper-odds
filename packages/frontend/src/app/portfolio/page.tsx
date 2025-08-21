'use client'

import React, { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Trophy, Activity, Wallet } from 'lucide-react'
import { usePositionSummary, useUserPositions, useClaimablePositions } from '@/hooks/usePositions'
import { PositionCardsList } from '@/components/portfolio/positionCard'
import { ClaimRewards } from '@/components/portfolio/claimRewards'
import ConnectButton, { SSRSafeConnectButton } from '@/components/web3/connectButton'
import { ComponentErrorBoundary } from '@/components/error/errorBoundary'
import { ClientOnly } from '@/components/clientOnly'
import { cn } from '@/lib/utils'

export default function PortfolioPage() {
  return (
    <ClientOnly>
      <PortfolioPageContent />
    </ClientOnly>
  )
}

function PortfolioPageContent() {
  const { address, isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')

  // Only use address when wallet is connected
  const effectiveAddress = isConnected && address ? address.toLowerCase() : null

  // Fetch portfolio data only when wallet is connected
  const { summary, loading: summaryLoading } = usePositionSummary(effectiveAddress)
  const { positions, loading: positionsLoading } = useUserPositions(effectiveAddress)
  const { claimablePositions, totalClaimable, loading: claimableLoading } = useClaimablePositions(effectiveAddress)

  if (!isConnected) {
    return (
      <ComponentErrorBoundary componentName="PortfolioPage">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Wallet className="h-6 w-6" />
                Portfolio
              </CardTitle>
              <p className="text-muted-foreground">
                Connect your wallet to view your trading portfolio
              </p>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-6">
                Your portfolio tracks all your prediction market positions, P&L, and claimable rewards.
              </div>
              <SSRSafeConnectButton />
            </CardContent>
          </Card>
        </div>
      </ComponentErrorBoundary>
    )
  }

  return (
    <ComponentErrorBoundary componentName="PortfolioPage">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">
              Track your positions and trading performance
            </p>
          </div>
          
          {totalClaimable > 0 && (
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              <Trophy className="h-4 w-4 mr-2" />
              Claim ${totalClaimable.toFixed(2)}
            </Button>
          )}
        </div>

        {/* Portfolio Summary Cards */}
        <PortfolioSummaryCards 
          summary={summary} 
          loading={summaryLoading}
          claimableAmount={totalClaimable}
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="claimable">
              Claimable
              {claimablePositions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {claimablePositions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <PortfolioOverview 
              summary={summary}
              positions={positions}
              loading={summaryLoading || positionsLoading}
            />
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <PositionCardsList 
              positions={positions}
              loading={positionsLoading}
              emptyMessage="No positions found. Start trading to see your positions here!"
            />
          </TabsContent>

          <TabsContent value="claimable" className="space-y-6">
            <ClaimRewards 
              userId={effectiveAddress}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TradingHistory />
          </TabsContent>
        </Tabs>
      </div>
    </ComponentErrorBoundary>
  )
}

interface PortfolioSummaryCardsProps {
  summary: any
  loading: boolean
  claimableAmount: number
}

function PortfolioSummaryCards({ summary, loading, claimableAmount }: PortfolioSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No trading activity yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start trading to see your portfolio summary
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalPnl = parseFloat(summary.totalPnl)
  const pnlColor = totalPnl === 0 ? 'text-muted-foreground' : totalPnl > 0 ? 'text-green-600' : 'text-red-600'
  const pnlIcon = totalPnl >= 0 ? TrendingUp : TrendingDown
  const PnlIcon = pnlIcon

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${parseFloat(summary.currentValue).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            ${parseFloat(summary.totalInvested).toFixed(2)} total staked
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">P&L</CardTitle>
          <PnlIcon className={cn('h-4 w-4', pnlColor)} />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', pnlColor)}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <p className={cn('text-xs', pnlColor)}>
            {totalPnl === 0 ? 'Unrealized' : `${summary.totalPnlPercent >= 0 ? '+' : ''}${summary.totalPnlPercent.toFixed(2)}%`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalPositions}</div>
          <p className="text-xs text-muted-foreground">
            {summary.activePositions} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.wonPositions + summary.lostPositions > 0 ? `${summary.winRate.toFixed(1)}%` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.wonPositions + summary.lostPositions > 0 
              ? `${summary.wonPositions}W / ${summary.lostPositions}L` 
              : 'No resolved positions'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface PortfolioOverviewProps {
  summary: any
  positions: any[]
  loading: boolean
}

function PortfolioOverview({ summary, positions, loading }: PortfolioOverviewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const activePositions = positions.filter(p => p.status === 'active')
  const recentPositions = positions.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <PositionCardsList 
            positions={recentPositions}
            loading={false}
            compact={true}
            showActions={false}
            emptyMessage="No recent positions"
          />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {activePositions.length > 0 ? (
              <div className="space-y-3">
                {activePositions.slice(0, 3).map(position => {
                  const stakeYes = parseFloat(position.stakeYes || '0')
                  const stakeNo = parseFloat(position.stakeNo || '0')
                  const totalStake = parseFloat(position.totalStake || '0')
                  return (
                    <div key={position.id} className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {position.market.title || 'Market Title'}
                        </p>
                        <div className="flex gap-1 items-center flex-wrap">
                          {stakeYes > 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                              YES: ${stakeYes.toFixed(0)}
                            </span>
                          )}
                          {stakeNo > 0 && (
                            <span className="text-xs bg-red-100 text-red-800 px-1 rounded">
                              NO: ${stakeNo.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${totalStake.toFixed(2)}
                        </p>
                        <p className={cn(
                          'text-xs',
                          position.roi >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {position.roi >= 0 ? '+' : ''}{position.roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No active positions
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-medium">{summary.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Position</span>
                  <span className="font-medium">
                    ${parseFloat(summary.averagePosition).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Largest Win</span>
                  <span className="font-medium">
                    ${parseFloat(summary.largestPosition).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                  <span className={cn(
                    'font-medium',
                    parseFloat(summary.totalPnl) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {parseFloat(summary.totalPnl) >= 0 ? '+' : ''}${parseFloat(summary.totalPnl).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No performance data
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Trading History placeholder - will be implemented in future tasks

function TradingHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading History</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Trading history will be implemented in the next task
        </p>
      </CardContent>
    </Card>
  )
}