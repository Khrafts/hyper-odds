import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * GraphQL query for protocol statistics
 */
const GET_PROTOCOL_STATS = gql`
  query GetProtocolStats {
    markets(first: 1000) {
      id
      totalPool
      resolved
      cancelled
      createdAt
      resolvedAt
    }
    
    users(first: 1000) {
      id
      totalDeposited
    }
  }
`

export interface ProtocolStats {
  totalVolume: number
  formattedTotalVolume: string
  activeMarkets: number
  resolvedMarkets: number
  totalMarkets: number
  totalTraders: number
  averageMarketSize: number
  resolutionRate: number
  growthMetrics: {
    marketsThisWeek: number
    marketsThisMonth: number
    volumeGrowth: number
    traderGrowth: number
  }
}

/**
 * Hook to fetch and calculate protocol statistics
 */
export function useProtocolStats() {
  const { data, loading, error } = useQuery(GET_PROTOCOL_STATS, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000, // Refresh every minute
  })

  // Calculate statistics from raw data
  const stats: ProtocolStats = React.useMemo(() => {
    if (!data?.markets) {
      return {
        totalVolume: 0,
        formattedTotalVolume: '$0',
        activeMarkets: 0,
        resolvedMarkets: 0,
        totalMarkets: 0,
        totalTraders: 0,
        averageMarketSize: 0,
        resolutionRate: 0,
        growthMetrics: {
          marketsThisWeek: 0,
          marketsThisMonth: 0,
          volumeGrowth: 0,
          traderGrowth: 0,
        }
      }
    }

    const markets = data.markets || []
    const users = data.users || []

    // Calculate total volume
    const totalVolume = markets.reduce((sum: number, market: any) => {
      const poolValue = parseFloat(market.totalPool || '0')
      return sum + poolValue
    }, 0)

    // Count market types
    const activeMarkets = markets.filter((m: any) => !m.resolved && !m.cancelled).length
    const resolvedMarkets = markets.filter((m: any) => m.resolved).length
    const totalMarkets = markets.length

    // Calculate resolution rate
    const resolutionRate = resolvedMarkets > 0 ? (resolvedMarkets / totalMarkets) * 100 : 0

    // Calculate average market size
    const averageMarketSize = totalMarkets > 0 ? totalVolume / totalMarkets : 0

    // Get unique traders count
    const totalTraders = users.length

    // Calculate growth metrics
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const marketsThisWeek = markets.filter((m: any) => {
      const createdAt = new Date(parseInt(m.createdAt) * 1000)
      return createdAt >= oneWeekAgo
    }).length

    const marketsThisMonth = markets.filter((m: any) => {
      const createdAt = new Date(parseInt(m.createdAt) * 1000)
      return createdAt >= oneMonthAgo
    }).length

    // Format total volume
    const formattedTotalVolume = formatVolume(totalVolume)

    return {
      totalVolume,
      formattedTotalVolume,
      activeMarkets,
      resolvedMarkets,
      totalMarkets,
      totalTraders,
      averageMarketSize,
      resolutionRate,
      growthMetrics: {
        marketsThisWeek,
        marketsThisMonth,
        volumeGrowth: 12, // Placeholder - would need historical data
        traderGrowth: 18, // Placeholder - would need historical data
      }
    }
  }, [data])

  return {
    stats,
    loading,
    error,
    refetch: () => {
      // Manual refetch functionality
      window.location.reload()
    }
  }
}

/**
 * Format volume into readable string
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`
  } else {
    return `$${Math.round(volume)}`
  }
}

/**
 * Hook for getting basic market count stats quickly
 */
export function useMarketCounts() {
  const { data, loading } = useQuery(gql`
    query GetMarketCounts {
      activeMarkets: markets(where: { resolved: false, cancelled: false }, first: 1000) {
        id
      }
      resolvedMarkets: markets(where: { resolved: true }, first: 1000) {
        id  
      }
      allMarkets: markets(first: 1000) {
        id
        totalPool
      }
    }
  `, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
  })

  const counts = React.useMemo(() => {
    if (!data) {
      return { active: 0, resolved: 0, total: 0, totalVolume: '$0' }
    }

    const active = data.activeMarkets?.length || 0
    const resolved = data.resolvedMarkets?.length || 0 
    const total = data.allMarkets?.length || 0
    
    const volume = data.allMarkets?.reduce((sum: number, market: any) => {
      return sum + parseFloat(market.totalPool || '0')
    }, 0) || 0

    return {
      active,
      resolved, 
      total,
      totalVolume: formatVolume(volume)
    }
  }, [data])

  return { counts, loading }
}

// Need to import React for useMemo
import React from 'react'