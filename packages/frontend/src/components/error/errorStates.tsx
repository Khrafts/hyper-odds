'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  ShieldX, 
  Clock,
  AlertCircle,
  Home,
  FileX,
  ServerCrash
} from 'lucide-react'

interface ErrorStateProps {
  onRetry?: () => void
  className?: string
}

/**
 * Network/Connection Error State
 */
export function NetworkError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
          <WifiOff className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Connection Error
        </h3>
        
        <p className="text-muted-foreground mb-6">
          Unable to connect to the network. Please check your internet connection and try again.
        </p>

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <Wifi className="h-4 w-4" />
            Reconnect
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Authentication/Permission Error State
 */
export function AuthError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ShieldX className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Access Denied
        </h3>
        
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this resource. Please check your authentication or contact support.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Timeout Error State
 */
export function TimeoutError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Request Timeout
        </h3>
        
        <p className="text-muted-foreground mb-6">
          The request took too long to complete. This might be due to slow network or server issues.
        </p>

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Server Error State (5xx errors)
 */
export function ServerError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ServerCrash className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Server Error
        </h3>
        
        <p className="text-muted-foreground mb-6">
          Something went wrong on our servers. We're working to fix this issue. Please try again in a few minutes.
        </p>

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Not Found Error State (404)
 */
export function NotFoundError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <FileX className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Not Found
        </h3>
        
        <p className="text-muted-foreground mb-6">
          The resource you're looking for doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Generic Error State with customizable message
 */
interface GenericErrorProps extends ErrorStateProps {
  title?: string
  message?: string
  icon?: React.ReactNode
}

export function GenericError({ 
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  icon,
  onRetry, 
  className 
}: GenericErrorProps) {
  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center ${className || ''}`}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          {icon || <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {message}
        </p>

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline Error Component for forms and small areas
 */
interface InlineErrorProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function InlineError({ message, onDismiss, className }: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400 ${className || ''}`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
        >
          ×
        </button>
      )}
    </div>
  )
}

/**
 * Error Alert Component
 */
interface ErrorAlertProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorAlert({ 
  title = "Error", 
  message, 
  onRetry, 
  onDismiss, 
  className 
}: ErrorAlertProps) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
            {title}
          </h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="gap-1 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}