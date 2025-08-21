/**
 * Enhanced position management hooks
 * Builds on GraphQL hooks with additional calculations and utilities
 */

import React, { useMemo } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { 
  useUserPositions as useUserPositionsGraphQL, 
  useMarketPositions,
  useActivePositions as useActivePositionsGraphQL,
  usePosition 
} from './graphql/usePositions'
import { Position, PositionWithStats, UserPosition, PositionSummary, PositionStatus } from '@/types/user'
import { formatEther, parseEther } from 'viem'

/**
 * Enhanced user positions hook with calculations
 * Returns PositionWithStats[] instead of UserPosition[]
 */
export function useUserPositions(userId?: string | null, includeResolved = true): {
  positions: PositionWithStats[]
  loading: boolean
  error: any
  refetch: any
} {
  // Only use the provided userId, don't fallback to anything
  const targetUserId = userId?.toLowerCase()
  
  const { data, loading, error, refetch } = useUserPositionsGraphQL(
    targetUserId || '', 
    includeResolved ? 100 : 50
  )

  // Debug logging - remove in production
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('useUserPositions Debug:', {
        targetUserId,
        loading,
        error: error?.message || error,
        data,
        hasPositions: data?.positions?.length || 0
      })
    }
  }, [targetUserId, loading, error, data])

  const positions = useMemo(() => {
    if (!data?.positions) return []
    
    return data.positions.map((position: Position) => {
      const market = position.market
      
      // Calculate current prices based on pools
      const poolYes = parseFloat(market.poolYes || '0')
      const poolNo = parseFloat(market.poolNo || '0')
      const totalPool = poolYes + poolNo
      
      const probabilityYes = totalPool > 0 ? poolYes / totalPool : 0.5
      const probabilityNo = totalPool > 0 ? poolNo / totalPool : 0.5
      
      // Get stakes from position
      const stakeYes = parseFloat(position.stakeYes || '0')
      const stakeNo = parseFloat(position.stakeNo || '0')
      const totalStake = parseFloat(position.totalStake || '0')
      
      // Calculate current position value
      const currentValue = (stakeYes * probabilityYes) + (stakeNo * probabilityNo)
      
      // PnL calculation using the profit field from indexer
      const profit = parseFloat(position.profit || '0')
      const payout = parseFloat(position.payout || '0')
      
      // Determine position status
      let status: 'active' | 'won' | 'lost' | 'claimable'
      if (market.resolved) {
        if (position.claimed) {
          status = profit > 0 ? 'won' : 'lost'
        } else if (market.winningOutcome !== undefined) {
          const hasWinningStake = 
            (market.winningOutcome === 1 && stakeYes > 0) || 
            (market.winningOutcome === 0 && stakeNo > 0)
          status = hasWinningStake ? 'claimable' : 'lost'
        } else {
          status = 'lost'
        }
      } else {
        status = 'active'
      }
      
      // Convert to PositionWithStats format
      const enhancedPosition: PositionWithStats = {
        ...position,
        currentProbabilityYes: probabilityYes,
        currentProbabilityNo: probabilityNo,
        potentialPayout: payout.toString(),
        roi: totalStake > 0 ? (profit / totalStake) * 100 : 0,
        status,
        unrealizedPnl: profit.toString()
      }
      
      return enhancedPosition
    })
  }, [data])

  const filteredPositions = useMemo(() => {
    if (includeResolved) return positions
    return positions.filter(p => p.status === 'active')
  }, [positions, includeResolved])

  return {
    positions: filteredPositions,
    loading,
    error,
    refetch
  }
}

/**
 * Hook for active positions only
 */
export function useActivePositions(userId?: string) {
  return useUserPositions(userId, false)
}

/**
 * Hook for position summary/portfolio overview
 */
export function usePositionSummary(userId?: string | null): {
  summary: PositionSummary | null
  loading: boolean
  error: any
} {
  // Only fetch data if userId is provided
  const { positions, loading, error } = useUserPositions(userId, true)

  const summary = useMemo(() => {
    if (!positions || positions.length === 0) return null

    const activePositions = positions.filter(p => p.status === 'active')
    const wonPositions = positions.filter(p => p.status === 'won')
    const lostPositions = positions.filter(p => p.status === 'lost')

    // Use totalStake as the invested amount and calculate current value based on stakes and probabilities
    const totalInvested = positions.reduce((sum, p) => sum + parseFloat(p.totalStake || '0'), 0)
    
    // For unrealized positions, current value should be the total stake (what they could get back if market closed now)
    // In parimutuel markets, until resolution, the "fair value" is essentially what was staked
    const currentValue = totalInvested  // For active positions, current value = total stake
    
    // For unrealized positions, P&L should be 0 until markets resolve
    // Only show P&L for resolved positions using the profit field from indexer
    const realizedPnl = positions.reduce((sum, p) => {
      if (p.status === 'won' || p.status === 'lost') {
        return sum + parseFloat(p.profit || '0')
      }
      return sum
    }, 0)
    
    const totalPnl = realizedPnl  // Only count realized gains/losses
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

    // Only calculate win rate if there are resolved positions
    const resolvedPositions = wonPositions.length + lostPositions.length
    const winRate = resolvedPositions > 0 ? (wonPositions.length / resolvedPositions) * 100 : 0

    const claimablePositions = positions.filter(p => p.status === 'claimable')
    const totalClaimable = claimablePositions.reduce((sum, p) => 
      sum + parseFloat(p.potentialPayout || '0'), 0
    )

    // Find largest position by total stake
    const largestPosition = positions.reduce((max, p) => 
      parseFloat(p.totalStake || '0') > parseFloat(max.totalStake || '0') ? p : max, 
      positions[0] || { totalStake: '0' }
    )

    const averagePosition = positions.length > 0 ? totalInvested / positions.length : 0

    const positionSummary: PositionSummary = {
      totalPositions: positions.length,
      activePositions: activePositions.length,
      wonPositions: wonPositions.length,
      lostPositions: lostPositions.length,
      pendingPositions: activePositions.length,
      totalInvested: totalInvested.toString(),
      currentValue: currentValue.toString(),
      totalPnl: totalPnl.toString(),
      totalPnlPercent,
      totalClaimable: totalClaimable.toString(),
      totalClaimed: '0', // Would need claim data from indexer
      winRate,
      averagePosition: averagePosition.toString(),
      largestPosition: largestPosition.totalStake || '0'
    }

    return positionSummary
  }, [positions])

  return {
    summary,
    loading,
    error
  }
}

/**
 * Hook for a single position with calculations
 */
export function useEnhancedPosition(positionId: string) {
  const { data, loading, error } = usePosition(positionId)
  
  const position = useMemo(() => {
    if (!data?.position) return null
    
    const pos = data.position
    const market = pos.market
    
    // Calculate current market prices
    const poolYes = parseFloat(market.poolYes || '0')
    const poolNo = parseFloat(market.poolNo || '0')
    const totalPool = poolYes + poolNo
    
    const yesPrice = totalPool > 0 ? poolYes / totalPool : 0.5
    const noPrice = totalPool > 0 ? poolNo / totalPool : 0.5
    
    // Calculate position metrics
    const sharesYes = parseFloat(pos.sharesYes || '0')
    const sharesNo = parseFloat(pos.sharesNo || '0')
    const currentValue = (sharesYes * yesPrice) + (sharesNo * noPrice)
    
    return {
      ...pos,
      currentValue,
      yesPrice,
      noPrice,
      dominantOutcome: sharesYes > sharesNo ? 'YES' : 'NO' as const,
      isWinning: market.resolved ? 
        (market.resolvedOutcome === 1 && sharesYes > 0) || (market.resolvedOutcome === 0 && sharesNo > 0) :
        false
    }
  }, [data])

  return {
    position,
    loading,
    error
  }
}

/**
 * Hook for market positions leaderboard
 */
export function useMarketLeaderboard(marketId: string, limit = 10) {
  const { data, loading, error } = useMarketPositions(marketId, limit)
  
  const leaderboard = useMemo(() => {
    if (!data?.positions) return []
    
    return data.positions.map((position, index) => {
      const sharesYes = parseFloat(position.sharesYes || '0')
      const sharesNo = parseFloat(position.sharesNo || '0')
      const totalShares = sharesYes + sharesNo
      
      return {
        rank: index + 1,
        user: position.user,
        totalShares,
        sharesYes,
        sharesNo,
        dominantOutcome: sharesYes > sharesNo ? 'YES' : 'NO',
        percentage: 0 // Would calculate based on total market shares
      }
    })
  }, [data])

  return {
    leaderboard,
    loading,
    error
  }
}

/**
 * Hook for claimable positions
 */
export function useClaimablePositions(userId?: string | null) {
  // Only fetch data if userId is provided
  const { positions, loading, error } = useUserPositions(userId, true)
  
  const claimablePositions = useMemo(() => {
    return positions.filter(p => p.status === 'claimable')
  }, [positions])

  const totalClaimable = useMemo(() => {
    return claimablePositions.reduce((sum, p) => sum + parseFloat(p.potentialPayout), 0)
  }, [claimablePositions])

  return {
    claimablePositions,
    totalClaimable,
    loading,
    error
  }
}

/**
 * Utility hook for position calculations
 */
export function usePositionCalculations() {
  const calculatePositionValue = (
    sharesYes: number,
    sharesNo: number,
    priceYes: number,
    priceNo: number
  ) => {
    return (sharesYes * priceYes) + (sharesNo * priceNo)
  }

  const calculatePnL = (currentValue: number, invested: number) => {
    const pnl = currentValue - invested
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0
    return { pnl, pnlPercent }
  }

  const calculateWinRate = (positions: UserPosition[]) => {
    const resolvedPositions = positions.filter(p => !p.isActive)
    if (resolvedPositions.length === 0) return 0
    
    const wonPositions = resolvedPositions.filter(p => parseFloat(p.unrealizedPnl) > 0)
    return (wonPositions.length / resolvedPositions.length) * 100
  }

  return {
    calculatePositionValue,
    calculatePnL,
    calculateWinRate
  }
}

/**
 * Export commonly used types
 */
export type { UserPosition, PositionSummary, PositionStatus } from '@/types/user'