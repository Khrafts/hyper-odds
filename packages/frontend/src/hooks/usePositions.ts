/**
 * Enhanced position management hooks
 * Builds on GraphQL hooks with additional calculations and utilities
 */

import { useMemo } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { 
  useUserPositions as useUserPositionsGraphQL, 
  useMarketPositions,
  useActivePositions as useActivePositionsGraphQL,
  usePosition 
} from './graphql/usePositions'
import { UserPosition, PositionSummary, PositionStatus } from '@/types/user'
import { formatEther, parseEther } from 'viem'

/**
 * Enhanced user positions hook with calculations
 */
export function useUserPositions(userId?: string, includeResolved = true) {
  const { address } = useWallet()
  const targetUserId = userId || address
  
  const { data, loading, error, refetch } = useUserPositionsGraphQL(
    targetUserId || '', 
    includeResolved ? 100 : 50
  )

  const positions = useMemo(() => {
    if (!data?.positions) return []
    
    return data.positions.map(position => {
      const market = position.market
      
      // Calculate current prices
      const poolYes = parseFloat(market.poolYes || '0')
      const poolNo = parseFloat(market.poolNo || '0')
      const totalPool = poolYes + poolNo
      
      const yesPrice = totalPool > 0 ? poolYes / totalPool : 0.5
      const noPrice = totalPool > 0 ? poolNo / totalPool : 0.5
      
      // Calculate position value
      const sharesYes = parseFloat(position.sharesYes || '0')
      const sharesNo = parseFloat(position.sharesNo || '0')
      const totalShares = sharesYes + sharesNo
      
      const currentValueYes = sharesYes * yesPrice
      const currentValueNo = sharesNo * noPrice
      const currentValue = currentValueYes + currentValueNo
      
      // Estimate invested amount (would be better from indexer)
      const avgPrice = 0.5 // Placeholder - would calculate from trade history
      const estimatedInvested = totalShares * avgPrice
      
      const pnl = currentValue - estimatedInvested
      const pnlPercent = estimatedInvested > 0 ? (pnl / estimatedInvested) * 100 : 0
      
      // Determine position status
      let status: PositionStatus
      if (market.resolved) {
        if (market.resolvedOutcome === 1 && sharesYes > 0) {
          status = 'won'
        } else if (market.resolvedOutcome === 0 && sharesNo > 0) {
          status = 'won'
        } else {
          status = 'lost'
        }
      } else {
        status = 'active'
      }
      
      const enhancedPosition: UserPosition = {
        id: position.id,
        marketId: market.id,
        market: market,
        user: position.user,
        outcome: sharesYes > sharesNo ? 'YES' : 'NO',
        shares: totalShares.toString(),
        sharesYes: position.sharesYes,
        sharesNo: position.sharesNo,
        totalInvested: estimatedInvested.toString(),
        currentValue: currentValue.toString(),
        realizedPnl: '0', // Would need claim data
        unrealizedPnl: pnl.toString(),
        pnlPercent,
        firstTradeAt: new Date().toISOString(), // Placeholder
        lastTradeAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: status === 'active',
        canClaim: status === 'won',
        claimableAmount: status === 'won' ? currentValue.toString() : undefined
      }
      
      return enhancedPosition
    })
  }, [data])

  const filteredPositions = useMemo(() => {
    if (includeResolved) return positions
    return positions.filter(p => p.isActive)
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
export function usePositionSummary(userId?: string): {
  summary: PositionSummary | null
  loading: boolean
  error: any
} {
  const { positions, loading, error } = useUserPositions(userId, true)

  const summary = useMemo(() => {
    if (!positions || positions.length === 0) return null

    const activePositions = positions.filter(p => p.isActive)
    const wonPositions = positions.filter(p => !p.isActive && parseFloat(p.unrealizedPnl) > 0)
    const lostPositions = positions.filter(p => !p.isActive && parseFloat(p.unrealizedPnl) <= 0)

    const totalInvested = positions.reduce((sum, p) => sum + parseFloat(p.totalInvested), 0)
    const currentValue = positions.reduce((sum, p) => sum + parseFloat(p.currentValue), 0)
    const totalPnl = currentValue - totalInvested
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

    const winRate = positions.length > 0 ? (wonPositions.length / (wonPositions.length + lostPositions.length)) * 100 : 0

    const claimablePositions = positions.filter(p => p.canClaim)
    const totalClaimable = claimablePositions.reduce((sum, p) => 
      sum + parseFloat(p.claimableAmount || '0'), 0
    )

    // Find largest position by current value
    const largestPosition = positions.reduce((max, p) => 
      parseFloat(p.currentValue) > parseFloat(max.currentValue || '0') ? p : max, 
      positions[0] || { currentValue: '0' }
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
      largestPosition: largestPosition.currentValue
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
export function useClaimablePositions(userId?: string) {
  const { positions, loading, error } = useUserPositions(userId, true)
  
  const claimablePositions = useMemo(() => {
    return positions.filter(p => p.canClaim && p.claimableAmount && parseFloat(p.claimableAmount) > 0)
  }, [positions])

  const totalClaimable = useMemo(() => {
    return claimablePositions.reduce((sum, p) => sum + parseFloat(p.claimableAmount || '0'), 0)
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