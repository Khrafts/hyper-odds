import { createConfig, http } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { supportedChains, defaultChain } from './chains'

/**
 * wagmi configuration for Web3 integration
 */

// Basic wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'default-project-id',
      metadata: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'HyperOdds',
        description: 'Decentralized prediction markets on Hyperliquid',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        icons: [`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/icons/icon-192x192.png`],
      },
      showQrModal: false, // We'll use RainbowKit's modal
    }),
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'HyperOdds',
      appLogoUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/icons/icon-192x192.png`,
    }),
  ],
  transports: {
    [supportedChains[0].id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'),
    [supportedChains[1].id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'),
  },
  ssr: true,
})

// RainbowKit configuration (enhanced)
export const rainbowKitConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'HyperOdds',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'default-project-id',
  chains: supportedChains,
  ssr: true,
})

// Public client configuration for read-only operations
export const publicClientConfig = {
  chains: supportedChains,
  transports: {
    [supportedChains[0].id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'),
    [supportedChains[1].id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'),
  },
}

// Default connection settings
export const connectionConfig = {
  autoConnect: true,
  defaultChain,
  retryDelay: 3000,
  maxRetries: 3,
}

// Transaction settings
export const transactionConfig = {
  // Gas settings
  gasMultiplier: 1.2, // 20% buffer for gas estimation
  maxFeePerGas: undefined, // Let wallet decide
  maxPriorityFeePerGas: undefined, // Let wallet decide
  
  // Confirmation settings
  confirmations: 2,
  timeout: 300000, // 5 minutes
  
  // Retry settings
  retryCount: 3,
  retryDelay: 2000,
}

// RPC settings
export const rpcConfig = {
  batch: {
    multicall: true,
    batchSize: 100,
    wait: 16, // ms
  },
  pollingInterval: 4000, // 4 seconds
  stallTimeout: 5000, // 5 seconds
}

// Wallet connection options
export const walletConfig = {
  // Recommended wallets in order of preference
  recommendedWallets: [
    'MetaMask',
    'WalletConnect',
    'Coinbase Wallet',
    'Trust Wallet',
    'Safe',
  ],
  
  // Wallet-specific settings
  walletConnect: {
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'default-project-id',
    requiredNamespaces: {
      eip155: {
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
        ],
        chains: supportedChains.map(chain => `eip155:${chain.id}`),
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  },
  
  // Connection preferences
  autoConnect: {
    enabled: true,
    timeout: 10000, // 10 seconds
  },
  
  // Reconnection settings
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 2000,
  },
}

// Export main config for app usage
export const web3Config = {
  wagmi: wagmiConfig,
  rainbowKit: rainbowKitConfig,
  connection: connectionConfig,
  transaction: transactionConfig,
  rpc: rpcConfig,
  wallet: walletConfig,
} as const

export type Web3Config = typeof web3Config