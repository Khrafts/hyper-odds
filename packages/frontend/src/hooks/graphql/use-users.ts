import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

/**
 * Fragments
 */
const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    address
    positions {
      totalCount
    }
    trades {
      totalCount
    }
    createdMarkets {
      totalCount
    }
  }
`

/**
 * Queries
 */
const GET_USER = gql`
  ${USER_FRAGMENT}
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserFields
      positions {
        edges {
          node {
            id
            sharesYes
            sharesNo
            market {
              id
              marketId
              question
              resolved
              resolvedOutcome
            }
          }
        }
      }
      trades {
        edges {
          node {
            id
            outcome
            shares
            amount
            timestamp
            market {
              id
              marketId
              question
            }
          }
        }
      }
      createdMarkets {
        edges {
          node {
            id
            marketId
            question
            resolved
          }
        }
      }
    }
  }
`

const GET_USER_BY_ADDRESS = gql`
  ${USER_FRAGMENT}
  query GetUserByAddress($address: String!) {
    users(where: { address: $address }, first: 1) {
      edges {
        node {
          ...UserFields
        }
      }
    }
  }
`

const GET_TOP_TRADERS = gql`
  ${USER_FRAGMENT}
  query GetTopTraders($first: Int) {
    users(
      first: $first
      orderBy: { field: TRADES_COUNT, direction: DESC }
    ) {
      edges {
        node {
          ...UserFields
        }
      }
    }
  }
`

const GET_USER_STATS = gql`
  query GetUserStats($userId: ID!) {
    user(id: $userId) {
      id
      address
      stats {
        totalVolume
        totalTrades
        marketsCreated
        winRate
        profitLoss
        avgTradeSize
      }
    }
  }
`

/**
 * Hooks
 */

/**
 * Hook to fetch user data
 */
export function useUser(userId: string) {
  return useQuery(GET_USER, {
    variables: { id: userId },
    skip: !userId,
  })
}

/**
 * Hook to fetch user by address
 */
export function useUserByAddress(address: string) {
  return useQuery(GET_USER_BY_ADDRESS, {
    variables: { address },
    skip: !address,
  })
}

/**
 * Hook to fetch top traders
 */
export function useTopTraders(limit = 10) {
  return useQuery(GET_TOP_TRADERS, {
    variables: { first: limit },
    pollInterval: 60000, // Poll every minute
  })
}

/**
 * Hook to fetch user statistics
 */
export function useUserStats(userId: string) {
  return useQuery(GET_USER_STATS, {
    variables: { userId },
    skip: !userId,
  })
}

/**
 * Hook to get or create user
 */
export function useCurrentUser(address?: string) {
  const { data, loading, error, refetch } = useUserByAddress(address || '')
  
  const user = data?.users?.edges?.[0]?.node
  
  return {
    user,
    loading,
    error,
    refetch,
    exists: !!user,
  }
}