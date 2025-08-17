/**
 * SSR utilities to handle browser-only APIs safely
 */
import React from 'react'

// Polyfill for indexedDB during SSR
if (typeof window === 'undefined') {
  // @ts-ignore
  globalThis.indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    deleteDatabase: () => Promise.resolve(),
  }

  // @ts-ignore
  globalThis.IDBKeyRange = {
    bound: () => ({}),
    lowerBound: () => ({}),
    upperBound: () => ({}),
    only: () => ({}),
  }
}

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined'

/**
 * Check if the component is mounted (client-side)
 */
export const useIsomorphicLayoutEffect = isBrowser ? React.useLayoutEffect : React.useEffect

/**
 * Safe localStorage access
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Silently fail
    }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  },
}

/**
 * Suppress browser-only warnings during SSR and development
 */
export const suppressSSRWarnings = () => {
  if (!isBrowser) {
    // Suppress common browser API warnings during SSR
    const originalError = console.error
    console.error = (...args: any[]) => {
      if (
        args[0]?.includes?.('indexedDB') ||
        args[0]?.includes?.('localStorage') ||
        args[0]?.includes?.('sessionStorage') ||
        args[0]?.includes?.('WebSocket') ||
        args[0]?.includes?.('navigator')
      ) {
        return
      }
      originalError.apply(console, args)
    }
  }
}

/**
 * Suppress development analytics and network errors
 */
export const suppressDevelopmentNetworkErrors = () => {
  if (process.env.NODE_ENV === 'development' && isBrowser) {
    const originalError = console.error
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString?.() || ''
      
      // Suppress common development network errors
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Analytics SDK') ||
        errorMessage.includes('cca-lite.coinbase.com') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('WalletConnect') ||
        errorMessage.includes('Reown Config') ||
        errorMessage.includes('demo-project-id') ||
        errorMessage.includes('bridge.walletconnect.org') ||
        errorMessage.includes('explorer-api.walletconnect.com')
      ) {
        return
      }
      
      originalError.apply(console, args)
    }
  }
}