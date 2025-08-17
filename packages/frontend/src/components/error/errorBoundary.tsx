'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

/**
 * Generic Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Here you could send error to monitoring service
    // e.g., Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props
    const prevResetKeys = prevProps.resetKeys

    // Reset error boundary when resetKeys change
    if (
      this.state.hasError &&
      prevResetKeys &&
      resetKeys &&
      resetKeys.some((key, idx) => key !== prevResetKeys[idx])
    ) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      })
    }, 0)
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] w-full items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Something went wrong
            </h2>
            
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-muted p-4 text-xs">
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <div className="mt-2 border-t pt-2">
                      {this.state.error.stack}
                    </div>
                  )}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.resetErrorBoundary}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>

              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    console.error('Error Details:', this.state.error, this.state.errorInfo)
                    alert('Error details logged to console')
                  }}
                  className="gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Debug
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Page-level Error Boundary
 * Used for entire pages to provide page-specific error handling
 */
export function PageErrorBoundary({ 
  children, 
  pageName 
}: { 
  children: React.ReactNode
  pageName?: string 
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Page Error (${pageName || 'Unknown'}):`, error, errorInfo)
      }}
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Page Error
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {pageName ? `The ${pageName} page` : 'This page'} encountered an error and couldn't be loaded.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Component-level Error Boundary
 * Used for individual components that might fail independently
 */
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  fallback
}: { 
  children: React.ReactNode
  componentName?: string
  fallback?: React.ReactNode
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Component Error (${componentName || 'Unknown'}):`, error, errorInfo)
      }}
      fallback={
        fallback || (
          <div className="flex min-h-[200px] w-full items-center justify-center border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 rounded-lg">
            <div className="text-center px-4">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Component Error
              </h3>
              
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {componentName ? `The ${componentName} component` : 'This component'} failed to load.
              </p>

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * AsyncBoundary for handling async operation errors
 * Combines error boundary with loading states
 */
interface AsyncBoundaryProps {
  children: React.ReactNode
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  loadingFallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function AsyncBoundary({
  children,
  isLoading,
  error,
  onRetry,
  loadingFallback,
  errorFallback
}: AsyncBoundaryProps) {
  if (isLoading) {
    return loadingFallback || (
      <div className="flex min-h-[200px] w-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return errorFallback || (
      <div className="flex min-h-[200px] w-full items-center justify-center border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 rounded-lg">
        <div className="text-center px-4">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Load Error
          </h3>
          
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {error.message || 'Failed to load data. Please try again.'}
          </p>

          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-2 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}