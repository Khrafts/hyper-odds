import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import { Market, MarketFilters, PaginationParams } from '@/types'

/**
 * GraphQL Fragments
 */
const MARKET_FRAGMENT = gql`
  fragment MarketFieldsGQL on Market {
    id
    title
    description
    poolYes
    poolNo
    resolved
    cancelled
    winningOutcome
    cutoffTime
    resolveTime
    createdAt
    resolvedAt
    totalPool
    effectivePoolYes
    effectivePoolNo
    creator {
      id
    }
  }
`

/**
 * Queries
 */
const GET_MARKETS = gql`
  ${MARKET_FRAGMENT}
  query GetMarketsGQL(
    $first: Int
    $skip: Int
    $where: Market_filter
    $orderBy: Market_orderBy
    $orderDirection: OrderDirection
  ) {
    markets(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ...MarketFieldsGQL
    }
  }
`

const GET_MARKET = gql`
  ${MARKET_FRAGMENT}
  query GetMarketGQL($id: ID!) {
    market(id: $id) {
      ...MarketFieldsGQL
      deposits {
        id
        user {
          id
        }
        outcome
        amount
        effectiveAmount
        timeMultiplier
        timestamp
      }
      positions {
        id
        user {
          id
        }
        stakeYes
        stakeNo
        totalStake
        effectiveStakeYes
        effectiveStakeNo
        claimed
        payout
      }
    }
  }
`

/**
 * Mutations
 */
const CREATE_MARKET = gql`
  mutation CreateMarket(
    $question: String!
    $description: String!
    $imageUrl: String
    $expirationTime: BigInt
    $initialLiquidityYes: BigInt!
    $initialLiquidityNo: BigInt!
  ) {
    createMarket(
      input: {
        question: $question
        description: $description
        imageUrl: $imageUrl
        expirationTime: $expirationTime
        initialLiquidityYes: $initialLiquidityYes
        initialLiquidityNo: $initialLiquidityNo
      }
    ) {
      market {
        id
        marketId
        question
      }
      transactionHash
    }
  }
`

/**
 * Subscriptions
 */
const MARKET_UPDATES = gql`
  subscription MarketUpdates($marketId: ID!) {
    marketUpdated(marketId: $marketId) {
      id
      marketId
      poolYes
      poolNo
      resolved
      resolvedOutcome
    }
  }
`

/**
 * Hooks
 */

/**
 * Hook to fetch markets list
 */
export function useMarkets(
  filters?: MarketFilters,
  pagination?: PaginationParams
) {
  const where = filters ? buildWhereClause(filters) : undefined
  const { orderBy, orderDirection } = filters?.sortBy ? buildOrderBy(filters.sortBy) : { orderBy: 'createdAt', orderDirection: 'desc' }

  return useQuery(GET_MARKETS, {
    variables: {
      first: pagination?.first ?? 20,
      skip: pagination?.skip ?? 0,
      where,
      orderBy,
      orderDirection,
    },
    notifyOnNetworkStatusChange: true,
  })
}

/**
 * Hook to fetch single market
 */
export function useMarket(marketId: string) {
  return useQuery(GET_MARKET, {
    variables: { id: marketId },
    skip: !marketId,
  })
}

/**
 * Hook to fetch active markets
 */
export function useActiveMarkets(pagination?: PaginationParams) {
  return useMarkets(
    { status: 'active' as any },
    pagination
  )
}

/**
 * Hook to fetch resolved markets
 */
export function useResolvedMarkets(pagination?: PaginationParams) {
  return useMarkets(
    { status: 'resolved' as any },
    pagination
  )
}

/**
 * Hook to create a new market
 */
export function useCreateMarket() {
  return useMutation(CREATE_MARKET, {
    refetchQueries: ['GetMarkets'],
  })
}

/**
 * Hook to subscribe to market updates
 */
export function useMarketUpdates(marketId: string) {
  return useSubscription(MARKET_UPDATES, {
    variables: { marketId },
    skip: !marketId,
  })
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
  
  if (filters.category) {
    where.category = filters.category
  }
  
  if (filters.creator) {
    where.creator = filters.creator
  }
  
  if (filters.searchQuery) {
    where.question_contains = filters.searchQuery
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
    case 'trades':
      return { orderBy: 'totalPool', orderDirection: 'desc' }
    default:
      return { orderBy: 'createdAt', orderDirection: 'desc' }
  }
}