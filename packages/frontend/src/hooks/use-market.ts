import { useQuery, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * GraphQL Fragment for market detail
 */
const MARKET_DETAIL_FRAGMENT = gql`
  fragment MarketDetailFields on Market {
    id
    title
    description
    poolYes
    poolNo
    totalPool
    resolved
    winningOutcome
    cutoffTime
    resolveTime
    createdAt
    creator {
      id
    }
    deposits {
      id
      outcome
      amount
      effectiveAmount
      timeMultiplier
      timestamp
      user {
        id
      }
    }
    positions {
      id
      stakeYes
      stakeNo
      totalStake
      effectiveStakeYes
      effectiveStakeNo
      totalEffectiveStake
      claimed
      payout
      profit
      user {
        id
      }
    }
  }
`

/**
 * Query to fetch single market with detailed information
 */
const GET_MARKET = gql`
  ${MARKET_DETAIL_FRAGMENT}
  query GetMarket($id: ID!) {
    market(id: $id) {
      ...MarketDetailFields
    }
  }
`

/**
 * Market deposit type
 */
export interface MarketDeposit {
  id: string
  outcome: number
  amount: string
  effectiveAmount: string
  timeMultiplier: string
  timestamp: string
  user: {
    id: string
  }
}

/**
 * Market position type
 */
export interface MarketPosition {
  id: string
  stakeYes: string
  stakeNo: string
  totalStake: string
  effectiveStakeYes: string
  effectiveStakeNo: string
  totalEffectiveStake: string
  claimed: boolean
  payout: string
  profit: string
  user: {
    id: string
  }
}

/**
 * Detailed market type with deposits and positions
 */
export interface MarketDetail {
  id: string
  title: string
  description: string
  poolYes: string
  poolNo: string
  totalPool: string
  resolved: boolean
  winningOutcome?: number
  cutoffTime: string
  resolveTime: string
  createdAt: string
  creator: {
    id: string
  }
  deposits: MarketDeposit[]
  positions: MarketPosition[]
}

/**
 * Hook to fetch single market with detailed information
 */
export function useMarket(marketId: string) {
  return useQuery(GET_MARKET, {
    variables: { id: marketId },
    skip: !marketId,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    ssr: false, // Disable SSR for this query
  })
}

/**
 * Hook to subscribe to real-time market updates
 * TODO: Implement when subscriptions are available
 */
export function useMarketUpdates(marketId: string) {
  // Placeholder - subscriptions not implemented yet
  return { data: null, loading: false, error: null }
}

/**
 * Hook to get market probability (YES percentage)
 */
export function useMarketProbability(market?: MarketDetail) {
  if (!market || !market.poolYes || !market.poolNo) {
    return 50 // Default to 50% if no data
  }

  const poolYes = parseFloat(market.poolYes)
  const poolNo = parseFloat(market.poolNo)
  const totalPool = poolYes + poolNo

  if (totalPool === 0) {
    return 50
  }

  return Math.round((poolYes / totalPool) * 100)
}

/**
 * Hook to get market odds
 */
export function useMarketOdds(market?: MarketDetail) {
  const probability = useMarketProbability(market)
  
  const yesOdds = probability > 0 ? 100 / probability : 0
  const noOdds = probability < 100 ? 100 / (100 - probability) : 0
  
  return {
    yes: Number(yesOdds.toFixed(2)),
    no: Number(noOdds.toFixed(2))
  }
}

/**
 * Hook to check if market is expired
 */
export function useMarketExpired(market?: MarketDetail) {
  if (!market?.cutoffTime) {
    return false
  }

  const cutoffTimestamp = parseInt(market.cutoffTime) * 1000
  return Date.now() > cutoffTimestamp
}

/**
 * Hook to get time until cutoff
 */
export function useTimeUntilCutoff(market?: MarketDetail) {
  if (!market?.cutoffTime) {
    return null
  }

  const cutoffTimestamp = parseInt(market.cutoffTime) * 1000
  const now = Date.now()
  const timeLeft = cutoffTimestamp - now

  if (timeLeft <= 0) {
    return null
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, totalMs: timeLeft }
}

/**
 * Hook to get user's position in a specific market
 */
export function useUserMarketPosition(market?: MarketDetail, userAddress?: string) {
  if (!market?.positions || !userAddress) {
    return null
  }

  const userPosition = market.positions.find(
    (position) => position.user.id.toLowerCase() === userAddress.toLowerCase()
  )

  return userPosition || null
}