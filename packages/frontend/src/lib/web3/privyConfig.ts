import { http, createConfig } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

/**
 * Wagmi configuration for Privy integration
 */
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http('https://arb-sepolia.g.alchemy.com/v2/demo'),
  },
})

/**
 * Privy configuration
 */
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'dummy-app-id',
  config: {
    loginMethods: ['wallet', 'email'] as const,
    appearance: {
      theme: 'light' as const,
      accentColor: 'hsl(var(--primary))',
      borderRadius: 'medium' as const,
    },
    defaultChain: arbitrumSepolia,
    supportedChains: [arbitrumSepolia],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      requireUserPasswordOnCreate: false,
    },
    // Enable smart wallets for better UX
    smartWallets: {
      createOnLogin: 'all-users' as const,
    },
  },
}

// Export main config for app usage
export const web3Config = {
  wagmi: wagmiConfig,
  privy: privyConfig,
} as const

export type Web3Config = typeof web3Config