'use client'

import React from 'react'
import { ApolloProvider } from '@apollo/client'
import { apolloClient } from './client'

interface GraphQLProviderProps {
  children: React.ReactNode
}

/**
 * GraphQL provider component
 * Wraps the app with Apollo Client context
 */
export function GraphQLProvider({ children }: GraphQLProviderProps) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  )
}

/**
 * Hook to ensure GraphQL context is available
 */
export function useGraphQLClient() {
  const client = React.useContext(
    (ApolloProvider as any).context
  )
  
  if (!client) {
    throw new Error('useGraphQLClient must be used within GraphQLProvider')
  }
  
  return client
}