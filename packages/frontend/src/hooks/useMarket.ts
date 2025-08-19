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
      effectivePoolYes
      effectivePoolNo
      totalEffectivePool
      resolved
      cancelled
      winningOutcome
      cutoffTime
      resolveTime
      createdAt
      createdAtBlock
      resolvedAt
      resolvedAtBlock
      feeCollected
      feeBps
      creator {
        id
      }
      deposits(first: 10, orderBy: timestamp, orderDirection: desc) {
        id
        user {
          id
        }
        outcome
        amount
        timestamp
        transactionHash
      }
      priceHistory(first: 50, orderBy: timestamp, orderDirection: desc) {
        id
        timestamp
        probabilityYes
        probabilityNo
        poolYes
        poolNo
        totalPool
        cumulativeVolume
        tradeCount
      }
    }
  }
`

/**
 * Hook to fetch a single market by ID
 */
export function useMarket(id: string | undefined, options?: { pollInterval?: number }) {
  return useQuery(GET_MARKET, {
    variables: { id },
    skip: !id, // Skip the query if no ID is provided
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    ssr: false, // Disable SSR for this query
    pollInterval: options?.pollInterval || 0, // Allow custom polling interval
    fetchPolicy: 'cache-and-network', // Always fetch from network but use cache while loading
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