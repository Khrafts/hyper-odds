'use client'

import React from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { rainbowKitConfig } from '../lib/web3/config'

// Import RainbowKit CSS
import '@rainbow-me/rainbowkit/styles.css'

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

/**
 * RainbowKit theme configuration
 */
const rainbowKitTheme = {
  lightMode: lightTheme({
    accentColor: 'hsl(var(--primary))',
    accentColorForeground: 'hsl(var(--primary-foreground))',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  darkMode: darkTheme({
    accentColor: 'hsl(var(--primary))',
    accentColorForeground: 'hsl(var(--primary-foreground))',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
}

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Main providers wrapper component
 * Provides Web3, React Query, and other global context
 */
export default function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={rainbowKitConfig}>
        <RainbowKitProvider
          theme={rainbowKitTheme.lightMode}
          modalSize="compact"
          initialChain={rainbowKitConfig.chains[0]}
          showRecentTransactions={true}
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
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
                Web3 Connection Error
              </h2>
              <p className="text-muted-foreground mb-6">
                Something went wrong with the Web3 connection.
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