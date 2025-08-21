'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ComponentErrorBoundary } from '@/components/error/errorBoundary'
import { 
  Trophy, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  DollarSign,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react'
import { PositionWithStats } from '@/types/user'
import { useClaimablePositions } from '@/hooks/usePositions'
import { cn } from '@/lib/utils'

interface ClaimRewardsProps {
  userId?: string
  onClaim?: (positions: PositionWithStats[]) => Promise<void>
  className?: string
}

export function ClaimRewards({ 
  userId, 
  onClaim,
  className 
}: ClaimRewardsProps) {
  const { claimablePositions, totalClaimable, loading, error } = useClaimablePositions(userId)
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState<string[]>([])

  // Calculate selected positions value
  const selectedValue = useMemo(() => {
    return claimablePositions
      .filter(p => selectedPositions.has(p.id))
      .reduce((sum, p) => sum + parseFloat(p.potentialPayout), 0)
  }, [claimablePositions, selectedPositions])

  const handleSelectAll = () => {
    if (selectedPositions.size === claimablePositions.length) {
      setSelectedPositions(new Set())
    } else {
      setSelectedPositions(new Set(claimablePositions.map(p => p.id)))
    }
  }

  const handleSelectPosition = (positionId: string) => {
    const newSelected = new Set(selectedPositions)
    if (newSelected.has(positionId)) {
      newSelected.delete(positionId)
    } else {
      newSelected.add(positionId)
    }
    setSelectedPositions(newSelected)
  }

  const handleClaimSelected = async () => {
    if (selectedPositions.size === 0 || !onClaim) return

    setClaiming(true)
    try {
      const positionsToClaim = claimablePositions.filter(p => selectedPositions.has(p.id))
      await onClaim(positionsToClaim)
      
      // Mark as successful
      setClaimSuccess(prev => [...prev, ...positionsToClaim.map(p => p.id)])
      setSelectedPositions(new Set())
    } catch (error) {
      console.error('Claim failed:', error)
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading claimable rewards...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error loading claimable positions</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (claimablePositions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Claimable Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No rewards to claim yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Win some predictions to see claimable rewards here!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ComponentErrorBoundary componentName="ClaimRewards">
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Claimable Rewards
            </div>
            <Badge variant="secondary" className="bg-green-50 text-green-700">
              {claimablePositions.length} Position{claimablePositions.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Total Claimable
              </span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">
                ${totalClaimable.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>Congratulations on your winning predictions!</span>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all"
                checked={selectedPositions.size === claimablePositions.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({claimablePositions.length})
              </label>
            </div>
            
            {selectedPositions.size > 0 && (
              <span className="text-sm text-muted-foreground">
                Selected: ${selectedValue.toFixed(2)}
              </span>
            )}
          </div>

          <Separator />

          {/* Claimable Positions List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {claimablePositions.map((position) => {
              const isSelected = selectedPositions.has(position.id)
              const isSuccess = claimSuccess.includes(position.id)
              const payout = parseFloat(position.potentialPayout)
              const profit = parseFloat(position.profit || '0')

              return (
                <div
                  key={position.id}
                  className={cn(
                    'border rounded-lg p-3 transition-colors',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border',
                    isSuccess && 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectPosition(position.id)}
                      disabled={isSuccess}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {position.market.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className={cn(
                                'text-xs',
                                parseFloat(position.stakeYes || '0') > parseFloat(position.stakeNo || '0')
                                  ? 'bg-green-600 text-white'
                                  : 'bg-red-600 text-white'
                              )}
                            >
                              {parseFloat(position.stakeYes || '0') > parseFloat(position.stakeNo || '0') ? 'YES' : 'NO'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Staked: ${parseFloat(position.totalStake).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${payout.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            +${profit.toFixed(2)} profit
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Resolved {new Date(parseInt(position.market.resolveTime) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          <span>
                            ROI: {position.roi > 0 ? '+' : ''}{position.roi.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSuccess && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Claim Actions */}
          <div className="space-y-3">
            <Separator />
            
            <div className="flex gap-3">
              <Button
                onClick={handleClaimSelected}
                disabled={selectedPositions.size === 0 || claiming}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Claim Selected (${selectedValue.toFixed(2)})
                  </>
                )}
              </Button>
              
              {selectedPositions.size < claimablePositions.length && (
                <Button
                  onClick={async () => {
                    setSelectedPositions(new Set(claimablePositions.map(p => p.id)))
                    await handleClaimSelected()
                  }}
                  variant="outline"
                  disabled={claiming}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Claim All
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Claiming will transfer your winnings to your wallet
            </p>
          </div>
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  )
}

// Summary component for quick stats
interface ClaimRewardsSummaryProps {
  userId?: string
  className?: string
}

export function ClaimRewardsSummary({ userId, className }: ClaimRewardsSummaryProps) {
  const { claimablePositions, totalClaimable, loading } = useClaimablePositions(userId)

  if (loading || claimablePositions.length === 0) {
    return null
  }

  return (
    <Card className={cn('bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                ${totalClaimable.toFixed(2)} Ready to Claim
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {claimablePositions.length} winning position{claimablePositions.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Claim Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}