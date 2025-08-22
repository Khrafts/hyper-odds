import { http, createConfig } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

/**
 * Wagmi configuration for Privy integration with better MetaMask handling
 */
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    // More specific injected connector with better error handling
    injected({
      shimDisconnect: false, // Disable shimming to prevent connection conflicts
    }),
    // Add WalletConnect as fallback
    ...(process.env.NEXT_PUBLIC_WC_PROJECT_ID ? [
      walletConnect({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
        metadata: {
          name: 'HyperOdds',
          description: 'Prediction Markets Platform',
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          icons: ['https://walletconnect.com/walletconnect-logo.png'],
        },
      })
    ] : []),
  ],
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 
      process.env.NEXT_PUBLIC_ARBITRUM_RPC || 
      'https://arbitrum-sepolia-rpc.publicnode.com'
    ),
  },
  multiInjectedProviderDiscovery: false, // Prevent conflicts with multiple injected providers
  syncConnectedChain: false, // Let Privy handle chain management
})

/**
 * Privy configuration with improved MetaMask handling
 */
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'dummy-app-id',
  config: {
    loginMethods: ['email', 'wallet', 'google', 'twitter'] as const, // Enable multiple auth methods
    appearance: {
      theme: 'light' as const,
      accentColor: 'hsl(var(--primary))',
      borderRadius: 'medium' as const,
      showWalletLoginFirst: false, // Show email first for easier onboarding
    },
    defaultChain: arbitrumSepolia,
    supportedChains: [arbitrumSepolia],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const, // Create wallets for email users
      requireUserPasswordOnCreate: false,
    },
    // Enable smart wallets for better UX
    smartWallets: {
      createOnLogin: 'all-users' as const,
    },
    // External wallet configuration with better error handling
    externalWallets: {
      walletConnect: {
        enabled: true,
        connectionOptions: 'all' as const,
      },
      metamask: {
        connectionOptions: 'all' as const,
      },
      coinbaseWallet: {
        connectionOptions: 'all' as const,
      },
    },
    // Add better error handling and connection recovery
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  },
}

// Export main config for app usage
export const web3Config = {
  wagmi: wagmiConfig,
  privy: privyConfig,
} as const

export type Web3Config = typeof web3Config