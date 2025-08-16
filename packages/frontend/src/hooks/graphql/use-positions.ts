import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * Fragments
 */
const POSITION_FRAGMENT = gql`
  fragment PositionFields on Position {
    id
    sharesYes
    sharesNo
    market {
      id
      marketId
      question
      description
      poolYes
      poolNo
      resolved
      resolvedOutcome
      expirationTime
    }
    user {
      id
      address
    }
  }
`

/**
 * Queries
 */
const GET_USER_POSITIONS = gql`
  ${POSITION_FRAGMENT}
  query GetUserPositions($userId: ID!, $first: Int, $after: String) {
    positions(
      first: $first
      after: $after
      where: { userId: $userId }
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      edges {
        node {
          ...PositionFields
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

const GET_MARKET_POSITIONS = gql`
  query GetMarketPositions($marketId: ID!, $first: Int, $after: String) {
    positions(
      first: $first
      after: $after
      where: { marketId: $marketId }
      orderBy: { field: SHARES_YES, direction: DESC }
    ) {
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

const GET_POSITION = gql`
  ${POSITION_FRAGMENT}
  query GetPosition($id: ID!) {
    position(id: $id) {
      ...PositionFields
    }
  }
`

const GET_ACTIVE_POSITIONS = gql`
  ${POSITION_FRAGMENT}
  query GetActivePositions($userId: ID!, $first: Int) {
    positions(
      first: $first
      where: { 
        userId: $userId
        market: { resolved: false }
      }
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      edges {
        node {
          ...PositionFields
        }
      }
      totalCount
    }
  }
`

/**
 * Hooks
 */

/**
 * Hook to fetch user's positions
 */
export function useUserPositions(userId: string, limit = 50) {
  return useQuery(GET_USER_POSITIONS, {
    variables: { userId, first: limit },
    skip: !userId,
  })
}

/**
 * Hook to fetch positions for a specific market
 */
export function useMarketPositions(marketId: string, limit = 100) {
  return useQuery(GET_MARKET_POSITIONS, {
    variables: { marketId, first: limit },
    skip: !marketId,
  })
}

/**
 * Hook to fetch a single position
 */
export function usePosition(positionId: string) {
  return useQuery(GET_POSITION, {
    variables: { id: positionId },
    skip: !positionId,
  })
}

/**
 * Hook to fetch user's active positions
 */
export function useActivePositions(userId: string, limit = 20) {
  return useQuery(GET_ACTIVE_POSITIONS, {
    variables: { userId, first: limit },
    skip: !userId,
    pollInterval: 30000, // Poll every 30 seconds
  })
}

/**
 * Hook to calculate position value
 */
export function usePositionValue(position: any, currentPriceYes: number, currentPriceNo: number) {
  if (!position) return { value: 0, pnl: 0, pnlPercent: 0 }

  const sharesYes = parseFloat(position.sharesYes || '0')
  const sharesNo = parseFloat(position.sharesNo || '0')
  
  const valueYes = sharesYes * currentPriceYes
  const valueNo = sharesNo * currentPriceNo
  const totalValue = valueYes + valueNo

  // Calculate PnL if we have cost basis (would need to track this)
  // For now, just return current value
  return {
    value: totalValue,
    valueYes,
    valueNo,
    pnl: 0, // Would need cost basis to calculate
    pnlPercent: 0,
  }
}