import { env } from './env'
import { CHAIN_IDS } from './constants'

/**
 * Application configuration derived from environment variables
 */

// Network Configuration
export const networkConfig = {
  defaultChainId: env.NEXT_PUBLIC_ENABLE_TESTNETS 
    ? CHAIN_IDS.ARBITRUM_SEPOLIA 
    : CHAIN_IDS.ARBITRUM,
  
  enableTestnets: env.NEXT_PUBLIC_ENABLE_TESTNETS,
  
  rpcUrls: {
    [CHAIN_IDS.ARBITRUM]: env.NEXT_PUBLIC_ARBITRUM_RPC,
    [CHAIN_IDS.ARBITRUM_SEPOLIA]: env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC,
  },
  
  blockExplorers: {
    [CHAIN_IDS.ARBITRUM]: 'https://arbiscan.io',
    [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'https://sepolia.arbiscan.io',
  },
} as const

// Contract Addresses
export const contractAddresses = {
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    factory: env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA || '',
    oracle: env.NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA || '',
    stHype: env.NEXT_PUBLIC_STHYPE_ADDRESS_SEPOLIA || '',
  },
  [CHAIN_IDS.ARBITRUM]: {
    factory: env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET || '',
    oracle: env.NEXT_PUBLIC_ORACLE_ADDRESS_MAINNET || '',
    stHype: env.NEXT_PUBLIC_STHYPE_ADDRESS_MAINNET || '',
  },
} as const

// API Configuration
export const apiConfig = {
  graphqlEndpoint: env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
  ipfsGateway: env.NEXT_PUBLIC_IPFS_GATEWAY,
  analyticsId: env.NEXT_PUBLIC_ANALYTICS_ID,
} as const

// App Configuration
export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
  version: '0.1.0',
  description: 'Decentralized prediction markets on Hyperliquid',
  
  // Social metadata
  social: {
    twitter: '@hyperodds',
    github: 'https://github.com/hyperodds',
    discord: 'https://discord.gg/hyperodds',
  },
  
  // SEO configuration
  seo: {
    titleTemplate: '%s | HyperOdds',
    defaultTitle: 'HyperOdds - Prediction Markets',
    description: 'Trade on the future with decentralized prediction markets powered by Hyperliquid',
    keywords: [
      'prediction markets',
      'betting',
      'DeFi',
      'Hyperliquid',
      'Arbitrum',
      'trading',
      'forecasting',
    ],
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'HyperOdds',
    },
    twitter: {
      handle: '@hyperodds',
      site: '@hyperodds',
      cardType: 'summary_large_image',
    },
  },
} as const

// WalletConnect Configuration
export const walletConfig = {
  projectId: env.NEXT_PUBLIC_WC_PROJECT_ID || '',
  
  // Recommended wallet IDs
  recommendedWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
  ],
  
  // Metadata
  metadata: {
    name: appConfig.name,
    description: appConfig.description,
    url: appConfig.url,
    icons: [`${appConfig.url}/icons/icon-192x192.png`],
  },
} as const

// Feature Flags
export const featureFlags = {
  // Core features
  marketCreation: true,
  trading: true,
  portfolio: true,
  
  // Advanced features
  analytics: true,
  leaderboard: true,
  socialFeatures: true,
  
  // Experimental features
  advancedCharts: false,
  portfolioOptimization: false,
  aiPredictions: false,
  
  // Development features
  debugMode: process.env.NODE_ENV === 'development',
  mockData: process.env.NODE_ENV === 'development',
} as const

// Cache Configuration
export const cacheConfig = {
  // React Query stale times
  staleTime: {
    markets: 30 * 1000, // 30 seconds
    userPositions: 10 * 1000, // 10 seconds
    protocolStats: 5 * 60 * 1000, // 5 minutes
    leaderboard: 2 * 60 * 1000, // 2 minutes
  },
  
  // Cache sizes
  maxCacheSize: {
    apollo: 100, // 100 MB
    reactQuery: 50, // 50 MB
    localStorage: 10, // 10 MB
  },
} as const

// Performance Configuration
export const performanceConfig = {
  // Pagination
  itemsPerPage: {
    markets: 20,
    positions: 10,
    transactions: 15,
    leaderboard: 50,
  },
  
  // Debounce delays
  debounceMs: {
    search: 300,
    filterChange: 500,
    formValidation: 150,
  },
  
  // Animation settings
  reducedMotion: false, // Will be detected from user preferences
  animationDuration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const

// Security Configuration
export const securityConfig = {
  // Transaction limits
  maxTransactionValue: 1000000, // $1M USD equivalent
  
  // Rate limiting
  rateLimits: {
    api: 60, // requests per minute
    trading: 100, // trades per hour
    marketCreation: 10, // markets per day
  },
  
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
  },
} as const

// Export a unified config object
export const config = {
  app: appConfig,
  network: networkConfig,
  contracts: contractAddresses,
  api: apiConfig,
  wallet: walletConfig,
  features: featureFlags,
  cache: cacheConfig,
  performance: performanceConfig,
  security: securityConfig,
} as const

export type Config = typeof config