import { useMutation, useQuery, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * Fragments
 */
const TRADE_FRAGMENT = gql`
  fragment TradeFields on Trade {
    id
    tradeId
    outcome
    shares
    amount
    timestamp
    market {
      id
      marketId
      question
    }
    trader {
      id
      address
    }
  }
`

/**
 * Queries
 */
const GET_RECENT_TRADES = gql`
  ${TRADE_FRAGMENT}
  query GetRecentTrades($first: Int, $after: String) {
    trades(
      first: $first
      after: $after
      orderBy: { field: TIMESTAMP, direction: DESC }
    ) {
      edges {
        node {
          ...TradeFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`

const GET_MARKET_TRADES = gql`
  ${TRADE_FRAGMENT}
  query GetMarketTrades($marketId: ID!, $first: Int, $after: String) {
    trades(
      first: $first
      after: $after
      where: { marketId: $marketId }
      orderBy: { field: TIMESTAMP, direction: DESC }
    ) {
      edges {
        node {
          ...TradeFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`

const GET_USER_TRADES = gql`
  ${TRADE_FRAGMENT}
  query GetUserTrades($traderId: ID!, $first: Int, $after: String) {
    trades(
      first: $first
      after: $after
      where: { traderId: $traderId }
      orderBy: { field: TIMESTAMP, direction: DESC }
    ) {
      edges {
        node {
          ...TradeFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`

/**
 * Mutations
 */
const BUY_SHARES = gql`
  mutation BuyShares(
    $marketId: ID!
    $outcome: String!
    $amount: String!
    $minShares: String!
    $deadline: BigInt!
  ) {
    buyShares(
      input: {
        marketId: $marketId
        outcome: $outcome
        amount: $amount
        minShares: $minShares
        deadline: $deadline
      }
    ) {
      trade {
        id
        tradeId
        outcome
        shares
        amount
        timestamp
      }
      transactionHash
    }
  }
`

const SELL_SHARES = gql`
  mutation SellShares(
    $marketId: ID!
    $outcome: String!
    $shares: String!
    $minAmount: String!
    $deadline: BigInt!
  ) {
    sellShares(
      input: {
        marketId: $marketId
        outcome: $outcome
        shares: $shares
        minAmount: $minAmount
        deadline: $deadline
      }
    ) {
      trade {
        id
        tradeId
        outcome
        shares
        amount
        timestamp
      }
      transactionHash
    }
  }
`

const CLAIM_WINNINGS = gql`
  mutation ClaimWinnings($marketId: ID!) {
    claimWinnings(marketId: $marketId) {
      amount
      transactionHash
    }
  }
`

/**
 * Subscriptions
 */
const TRADE_EXECUTED = gql`
  subscription TradeExecuted($marketId: ID) {
    tradeExecuted(marketId: $marketId) {
      id
      tradeId
      outcome
      shares
      amount
      timestamp
      market {
        id
        marketId
        question
        poolYes
        poolNo
      }
      trader {
        id
        address
      }
    }
  }
`

/**
 * Hooks
 */

/**
 * Hook to fetch recent trades
 */
export function useRecentTrades(limit = 20) {
  return useQuery(GET_RECENT_TRADES, {
    variables: { first: limit },
    pollInterval: 10000, // Poll every 10 seconds
  })
}

/**
 * Hook to fetch trades for a specific market
 */
export function useMarketTrades(marketId: string, limit = 50) {
  return useQuery(GET_MARKET_TRADES, {
    variables: { marketId, first: limit },
    skip: !marketId,
  })
}

/**
 * Hook to fetch user's trades
 */
export function useUserTrades(userId: string, limit = 50) {
  return useQuery(GET_USER_TRADES, {
    variables: { traderId: userId, first: limit },
    skip: !userId,
  })
}

/**
 * Hook to buy shares
 */
export function useBuyShares() {
  return useMutation(BUY_SHARES, {
    refetchQueries: ['GetMarket', 'GetUserPositions'],
  })
}

/**
 * Hook to sell shares
 */
export function useSellShares() {
  return useMutation(SELL_SHARES, {
    refetchQueries: ['GetMarket', 'GetUserPositions'],
  })
}

/**
 * Hook to claim winnings
 */
export function useClaimWinnings() {
  return useMutation(CLAIM_WINNINGS, {
    refetchQueries: ['GetUserPositions'],
  })
}

/**
 * Hook to subscribe to trade executions
 */
export function useTradeSubscription(marketId?: string) {
  return useSubscription(TRADE_EXECUTED, {
    variables: marketId ? { marketId } : {},
  })
}