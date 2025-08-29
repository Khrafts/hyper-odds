import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useChainId as useWagmiChainId, useAccount } from 'wagmi'
import { useEffect } from 'react'

/**
 * Unified wallet hook that provides consistent connection state across the app
 * Uses only Privy authentication, no standalone wagmi hooks
 */
export function useWallet() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const wagmiAccount = useAccount()

  const walletAddress = user?.wallet?.address
  const isConnected = authenticated && !!walletAddress
  
  // Auto-connect wallet to wagmi when Privy is authenticated
  useEffect(() => {
    if (authenticated && wallets.length > 0 && !wagmiAccount.isConnected) {
      const wallet = wallets[0] // Use first wallet
      if (wallet.connectorType === 'injected' || wallet.connectorType === 'wallet_connect') {
        // The wallet should auto-connect via Privy's wagmi integration
        console.log('Privy wallet detected, should auto-connect to wagmi')
      }
    }
  }, [authenticated, wallets, wagmiAccount.isConnected])

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
    
    // Debug info
    wagmiConnected: wagmiAccount.isConnected,
    wagmiAddress: wagmiAccount.address,
  }
}

/**
 * Hook to get the current chain ID
 */
export function useChainId() {
  return useWagmiChainId()
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