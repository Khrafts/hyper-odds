/**
 * MetaMask connection utilities and error handling
 */

interface MetaMaskProvider {
  isMetaMask?: boolean
  isConnected?: () => boolean
  request?: (args: { method: string; params?: any[] }) => Promise<any>
  on?: (eventName: string, handler: (...args: any[]) => void) => void
  removeListener?: (eventName: string, handler: (...args: any[]) => void) => void
}

interface WindowWithEthereum extends Window {
  ethereum?: MetaMaskProvider & {
    providers?: MetaMaskProvider[]
  }
}

/**
 * Detect if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === 'undefined') return false
  
  const { ethereum } = window as WindowWithEthereum
  
  if (!ethereum) return false
  
  // Check if it's MetaMask specifically
  if (ethereum.isMetaMask) return true
  
  // Check if MetaMask is in providers array (for multiple wallets)
  if (ethereum.providers?.some(provider => provider.isMetaMask)) {
    return true
  }
  
  return false
}

/**
 * Get MetaMask provider from multiple providers
 */
export function getMetaMaskProvider(): MetaMaskProvider | null {
  if (typeof window === 'undefined') return null
  
  const { ethereum } = window as WindowWithEthereum
  
  if (!ethereum) return null
  
  // If it's MetaMask directly
  if (ethereum.isMetaMask) return ethereum
  
  // Find MetaMask in providers array
  if (ethereum.providers) {
    const metamask = ethereum.providers.find(provider => provider.isMetaMask)
    return metamask || null
  }
  
  return null
}

/**
 * Check if MetaMask is connected
 */
export async function isMetaMaskConnected(): Promise<boolean> {
  const provider = getMetaMaskProvider()
  
  if (!provider) return false
  
  try {
    if (provider.isConnected && typeof provider.isConnected === 'function') {
      return provider.isConnected()
    }
    
    // Fallback: try to get accounts
    if (provider.request) {
      const accounts = await provider.request({ method: 'eth_accounts' })
      return Array.isArray(accounts) && accounts.length > 0
    }
    
    return false
  } catch (error) {
    console.warn('Error checking MetaMask connection:', error)
    return false
  }
}

/**
 * Enhanced error handling for MetaMask connection errors
 */
export function handleMetaMaskError(error: any): string {
  if (!error) return 'Unknown wallet error'
  
  const message = error.message || error.toString()
  
  // Common MetaMask error patterns
  if (message.includes('User rejected')) {
    return 'Connection cancelled by user'
  }
  
  if (message.includes('Already processing')) {
    return 'Please check your wallet - a request is already pending'
  }
  
  if (message.includes('Unauthorized')) {
    return 'Wallet connection unauthorized. Please unlock your wallet.'
  }
  
  if (message.includes('Network Error') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  
  if (message.includes('Chain not added')) {
    return 'Please add the Arbitrum Sepolia network to your wallet'
  }
  
  if (message.includes('Failed to connect')) {
    return 'Failed to connect to wallet. Please refresh and try again.'
  }
  
  // Log the full error for debugging but return a user-friendly message
  console.error('MetaMask Error Details:', error)
  
  return 'Wallet connection failed. Please try again or use a different wallet.'
}

/**
 * Attempt to recover from connection errors
 */
export async function attemptMetaMaskRecovery(): Promise<boolean> {
  const provider = getMetaMaskProvider()
  
  if (!provider || !provider.request) return false
  
  try {
    // Try to request accounts again
    await provider.request({ method: 'eth_requestAccounts' })
    return true
  } catch (error) {
    console.warn('MetaMask recovery failed:', error)
    return false
  }
}

/**
 * Check MetaMask health and provide diagnostics
 */
export async function diagnoseMetaMaskConnection(): Promise<{
  isInstalled: boolean
  isConnected: boolean
  hasAccounts: boolean
  error?: string
}> {
  const diagnosis = {
    isInstalled: false,
    isConnected: false,
    hasAccounts: false,
    error: undefined as string | undefined,
  }
  
  try {
    // Check if installed
    diagnosis.isInstalled = isMetaMaskInstalled()
    
    if (!diagnosis.isInstalled) {
      diagnosis.error = 'MetaMask is not installed'
      return diagnosis
    }
    
    // Check if connected
    diagnosis.isConnected = await isMetaMaskConnected()
    
    // Check for accounts
    const provider = getMetaMaskProvider()
    if (provider?.request) {
      const accounts = await provider.request({ method: 'eth_accounts' })
      diagnosis.hasAccounts = Array.isArray(accounts) && accounts.length > 0
    }
    
    if (!diagnosis.hasAccounts) {
      diagnosis.error = 'No accounts connected to MetaMask'
    }
    
  } catch (error) {
    diagnosis.error = handleMetaMaskError(error)
  }
  
  return diagnosis
}

/**
 * Preemptively prepare MetaMask connection
 */
export async function prepareMetaMaskConnection(): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    const provider = getMetaMaskProvider()
    
    if (!provider) {
      console.warn('MetaMask not found during preparation')
      return
    }
    
    // Warm up the connection without triggering user prompts
    if (provider.request) {
      await provider.request({ method: 'eth_accounts' })
    }
    
  } catch (error) {
    // Silently fail during preparation
    console.debug('MetaMask preparation failed (this is normal):', error)
  }
}