import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import { Market, MarketFilters, PaginationParams } from '../../types'

/**
 * GraphQL Fragments
 */
const MARKET_FRAGMENT = gql`
  fragment MarketFields on Market {
    id
    marketId
    question
    description
    poolYes
    poolNo
    resolved
    resolvedOutcome
    expirationTime
    createdAt
    updatedAt
    creator {
      id
      address
    }
    trades {
      totalCount
    }
  }
`

/**
 * Queries
 */
const GET_MARKETS = gql`
  ${MARKET_FRAGMENT}
  query GetMarkets(
    $first: Int
    $after: String
    $where: MarketFilter
    $orderBy: MarketOrderBy
  ) {
    markets(first: $first, after: $after, where: $where, orderBy: $orderBy) {
      edges {
        node {
          ...MarketFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

const GET_MARKET = gql`
  ${MARKET_FRAGMENT}
  query GetMarket($id: ID!) {
    market(id: $id) {
      ...MarketFields
      trades {
        edges {
          node {
            id
            outcome
            shares
            amount
            timestamp
            trader {
              id
              address
            }
          }
        }
      }
      positions {
        edges {
          node {
            id
            sharesYes
            sharesNo
            user {
              id
              address
            }
          }
        }
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
  const orderBy = filters?.sortBy ? buildOrderBy(filters.sortBy) : undefined

  return useQuery(GET_MARKETS, {
    variables: {
      first: pagination?.first ?? 20,
      after: pagination?.after,
      where,
      orderBy,
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
      return { field: 'CREATED_AT', direction: 'DESC' }
    case 'oldest':
      return { field: 'CREATED_AT', direction: 'ASC' }
    case 'volume':
      return { field: 'TOTAL_VOLUME', direction: 'DESC' }
    case 'trades':
      return { field: 'TOTAL_TRADES', direction: 'DESC' }
    default:
      return { field: 'CREATED_AT', direction: 'DESC' }
  }
}