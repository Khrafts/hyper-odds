'use client'

import React from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, privyConfig } from '../lib/web3/privyConfig'
import { GraphQLProvider } from '../lib/graphql/provider'
import { suppressSSRWarnings, suppressDevelopmentNetworkErrors } from '../lib/ssrUtils'

// Suppress SSR warnings and development network errors
suppressSSRWarnings()
suppressDevelopmentNetworkErrors()

/**
 * React Query client configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time configuration based on data type
      staleTime: 30 * 1000, // 30 seconds default
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime in v4)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})


interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Main providers wrapper component
 * Provides Web3, React Query, and other global context
 */
export default function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false)
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Configuration Error
          </h2>
          <p className="text-muted-foreground">
            NEXT_PUBLIC_PRIVY_APP_ID environment variable is required
          </p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {mounted ? (
        <PrivyProvider
          appId={appId}
          config={privyConfig.config}
        >
          <WagmiProvider config={wagmiConfig}>
            <GraphQLProvider>
              {children}
            </GraphQLProvider>
          </WagmiProvider>
        </PrivyProvider>
      ) : (
        <GraphQLProvider>
          {children}
        </GraphQLProvider>
      )}
    </QueryClientProvider>
  )
}

/**
 * Hook to access React Query client
 */
export function useQueryClient() {
  return queryClient
}

/**
 * Custom error boundary for Web3 errors
 */
export class Web3ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Web3 Error:', error, errorInfo)
    
    // Here you could send error to monitoring service
    // e.g., Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Wallet Connection Error
              </h2>
              <p className="text-muted-foreground mb-6">
                Something went wrong with the wallet connection.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Provider wrapper with error boundary
 */
export function AppProviders({ children }: ProvidersProps) {
  return (
    <Web3ErrorBoundary>
      <Providers>{children}</Providers>
    </Web3ErrorBoundary>
  )
}