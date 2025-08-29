import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * GraphQL Fragments
 */
const MARKET_FRAGMENT = gql`
  fragment MarketFields on Market {
    id
    title
    description
    marketType
    poolYes
    poolNo
    totalPool
    reserveYes
    reserveNo
    spotPrice
    initialLiquidity
    resolved
    winningOutcome
    cutoffTime
    resolveTime
    createdAt
    timeDecayBps
    creator {
      id
    }
  }
`

/**
 * Query to fetch markets list
 */
const GET_MARKETS = gql`
  ${MARKET_FRAGMENT}
  query GetMarkets(
    $first: Int
    $skip: Int
    $where: Market_filter
    $orderBy: Market_orderBy
    $orderDirection: OrderDirection
  ) {
    markets(first: $first, skip: $skip, where: $where, orderBy: $orderBy, orderDirection: $orderDirection) {
      ...MarketFields
    }
  }
`

// Simple test query without variables
const GET_MARKETS_SIMPLE = gql`
  query GetMarketsSimple {
    markets(first: 5) {
      id
      title
      description
      marketType
      poolYes
      poolNo
      totalPool
      reserveYes
      reserveNo
      spotPrice
      initialLiquidity
      resolved
      cutoffTime
      resolveTime
      createdAt
      timeDecayBps
      creator {
        id
      }
    }
  }
`

/**
 * Markets list filter and pagination options
 */
export interface MarketFilters {
  status?: 'active' | 'resolved' | 'all'
  category?: string
  creator?: string
  searchQuery?: string
  sortBy?: 'newest' | 'oldest' | 'volume' | 'trades'
}

export interface PaginationParams {
  first?: number
  after?: string
}

export interface Market {
  id: string
  title: string
  description: string
  marketType: string
  poolYes: string
  poolNo: string
  totalPool: string
  reserveYes: string
  reserveNo: string
  spotPrice: string
  initialLiquidity: string
  effectivePoolYes?: string
  effectivePoolNo?: string
  totalEffectivePool?: string
  resolved: boolean
  cancelled?: boolean
  winningOutcome?: number
  cutoffTime: string
  resolveTime: string
  createdAt: string
  createdAtBlock?: string
  resolvedAt?: string
  resolvedAtBlock?: string
  feeCollected?: string
  feeBps?: number
  timeDecayBps?: number
  creator: {
    id: string
  }
  deposits?: Array<{
    id: string
    user: {
      id: string
    }
    outcome: number
    amount: string
    timestamp: string
    transactionHash: string
  }>
  priceHistory?: Array<{
    id: string
    timestamp: string
    probabilityYes: string
    probabilityNo: string
    poolYes: string
    poolNo: string
    totalPool: string
    cumulativeVolume: string
    tradeCount: string
  }>
}

/**
 * Hook to fetch markets list
 */
export function useMarkets(
  filters?: MarketFilters,
  pagination?: PaginationParams
) {
  // Use complex query with filtering when filters are provided
  if (filters) {
    const where = buildWhereClause(filters)
    const { orderBy, orderDirection } = filters?.sortBy ? buildOrderBy(filters.sortBy) : { orderBy: 'createdAt', orderDirection: 'desc' }

    return useQuery(GET_MARKETS, {
      variables: {
        first: pagination?.first ?? 20,
        skip: 0, // Convert after cursor to skip if needed
        where,
        orderBy,
        orderDirection,
      },
      notifyOnNetworkStatusChange: true,
      errorPolicy: 'all',
      ssr: false, // Disable SSR for this query
    })
  }
  
  // Fallback to simple query when no filters
  return useQuery(GET_MARKETS_SIMPLE, {
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    ssr: false, // Disable SSR for this query
  })
}

/**
 * Hook to fetch active markets
 */
export function useActiveMarkets(pagination?: PaginationParams) {
  return useMarkets(
    { status: 'active' },
    pagination
  )
}

/**
 * Hook to fetch resolved markets
 */
export function useResolvedMarkets(pagination?: PaginationParams) {
  return useMarkets(
    { status: 'resolved' },
    pagination
  )
}

/**
 * Hook to fetch all markets
 */
export function useAllMarkets(pagination?: PaginationParams) {
  return useMarkets(
    { status: 'all' },
    pagination
  )
}

/**
 * Hook to search markets
 */
export function useSearchMarkets(
  searchQuery: string,
  pagination?: PaginationParams
) {
  return useMarkets(
    { searchQuery },
    pagination
  )
}

/**
 * Helper functions
 */
function buildWhereClause(filters: MarketFilters) {
  const where: any = {}
  
  if (filters.status === 'active') {
    where.resolved = false
  } else if (filters.status === 'resolved') {
    where.resolved = true
  }
  // 'all' doesn't add any filter
  
  if (filters.creator) {
    where.creator = filters.creator
  }
  
  if (filters.searchQuery) {
    // Search in both title and description
    where.or = [
      { title_contains_nocase: filters.searchQuery },
      { description_contains_nocase: filters.searchQuery }
    ]
  }
  
  return where
}

function buildOrderBy(sortBy: string) {
  switch (sortBy) {
    case 'newest':
      return { orderBy: 'createdAt', orderDirection: 'desc' }
    case 'oldest':
      return { orderBy: 'createdAt', orderDirection: 'asc' }
    case 'volume':
      return { orderBy: 'totalPool', orderDirection: 'desc' }
    default:
      return { orderBy: 'createdAt', orderDirection: 'desc' }
  }
}