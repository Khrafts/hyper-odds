import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from '@apollo/client/link/retry'
import { env } from '@/lib/env'

/**
 * GraphQL client configuration
 */

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
  credentials: 'same-origin',
  fetch: typeof window !== 'undefined' ? window.fetch : undefined,
})

// Error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
    
    // Retry on network errors
    if ('statusCode' in networkError && networkError.statusCode >= 500) {
      return forward(operation)
    }
  }
})

// Retry logic for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors and 5xx errors
      return Boolean(
        error && (
          !('statusCode' in error) || 
          (typeof error.statusCode === 'number' && error.statusCode >= 500)
        )
      )
    },
  },
})

// Request middleware
const authLink = new ApolloLink((operation, forward) => {
  // Add any auth headers here if needed
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      // Add custom headers here
      'x-client-name': env.NEXT_PUBLIC_APP_NAME,
      'x-client-version': '0.1.0',
    },
  }))

  return forward(operation)
})

// Cache configuration
const cache = new InMemoryCache({
  addTypename: true,
  resultCaching: false, // Disable for SSR
  typePolicies: {
    Query: {
      fields: {
        // Markets array (not paginated in subgraph)
        markets: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing = [], incoming = []) {
            // Simple replace merge for non-paginated arrays
            return incoming
          },
        },
        // Market details
        market: {
          keyArgs: ['id'],
          read(existing, { args, toReference }) {
            return existing || toReference({ __typename: 'Market', id: args?.id })
          },
        },
        // User positions (array-based, not paginated)
        positions: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing = [], incoming = []) {
            return incoming
          },
        },
      },
    },
    Market: {
      keyFields: ['id'],
      fields: {
        // Optimistic updates for market fields
        poolYes: {
          merge(existing, incoming) {
            return incoming
          },
        },
        poolNo: {
          merge(existing, incoming) {
            return incoming
          },
        },
        resolved: {
          merge(existing, incoming) {
            return incoming
          },
        },
      },
    },
    Position: {
      keyFields: ['id'],
      fields: {
        // Optimistic updates for position fields
        sharesYes: {
          merge(existing, incoming) {
            return incoming
          },
        },
        sharesNo: {
          merge(existing, incoming) {
            return incoming
          },
        },
      },
    },
    User: {
      keyFields: ['id'],
    },
    Trade: {
      keyFields: ['id'],
    },
  },
  possibleTypes: {
    // Add any interface/union types here
  },
})

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    authLink,
    retryLink,
    httpLink,
  ]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
})

// Export cache for direct access if needed
export { cache as apolloCache }

// Helper to reset store
export const resetApolloStore = async () => {
  await apolloClient.resetStore()
}

// Helper to clear store
export const clearApolloStore = async () => {
  await apolloClient.clearStore()
}

// Helper to refetch queries
export const refetchQueries = async (queryNames: string[]) => {
  const queries = apolloClient.getObservableQueries()
  const promises = Array.from(queries.values())
    .filter(query => {
      const queryName = query.queryName
      return queryName && queryNames.includes(queryName)
    })
    .map(query => query.refetch())
  
  await Promise.all(promises)
}