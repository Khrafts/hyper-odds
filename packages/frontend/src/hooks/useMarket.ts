import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Market } from './useMarkets'

/**
 * Query to fetch a single market by ID
 */
const GET_MARKET = gql`
  query GetMarket($id: ID!) {
    market(id: $id) {
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
    }
  }
`

/**
 * Hook to fetch a single market by ID
 */
export function useMarket(id: string | undefined) {
  return useQuery(GET_MARKET, {
    variables: { id },
    skip: !id, // Skip the query if no ID is provided
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    ssr: false, // Disable SSR for this query
  })
}

/**
 * Hook to fetch market with optimistic loading
 * Useful when you know the market should exist
 */
export function useMarketWithFallback(id: string | undefined, fallbackMarket?: Partial<Market>) {
  const { data, loading, error, refetch } = useMarket(id)
  
  return {
    data: data?.market || fallbackMarket,
    loading,
    error,
    refetch,
    market: data?.market as Market | undefined,
  }
}