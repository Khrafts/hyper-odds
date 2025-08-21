import { usePrivy } from '@privy-io/react-auth'

/**
 * Unified wallet hook that provides consistent connection state across the app
 * Uses only Privy authentication, no standalone wagmi hooks
 */
export function useWallet() {
  const { ready, authenticated, user, login, logout } = usePrivy()

  const walletAddress = user?.wallet?.address
  const isConnected = authenticated && !!walletAddress

  return {
    // Connection state
    ready,
    isConnected,
    authenticated,
    
    // Wallet info
    address: walletAddress,
    user,
    
    // Actions
    connect: login,
    disconnect: logout,
  }
}

/**
 * Hook that returns wallet address or null
 * Useful for components that need to check if user has a wallet
 */
export function useWalletAddress() {
  const { address, isConnected } = useWallet()
  return isConnected ? address : null
}

/**
 * Hook that throws if wallet is not connected
 * Useful for components that require wallet connection
 */
export function useConnectedWallet() {
  const wallet = useWallet()
  
  if (!wallet.isConnected) {
    throw new Error('Wallet not connected')
  }
  
  return wallet
}