/**
 * Application-wide constants
 */

// App Metadata
export const APP_NAME = 'HyperOdds'
export const APP_DESCRIPTION = 'Decentralized prediction markets on Hyperliquid'
export const APP_VERSION = '0.1.0'

// Network Constants
export const CHAIN_IDS = {
  ARBITRUM: 42161,
  ARBITRUM_SEPOLIA: 421614,
} as const

export const NETWORK_NAMES = {
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum One',
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
} as const

// Market Constants
export const MARKET_OUTCOMES = {
  NO: 0,
  YES: 1,
  CANCELLED: 2,
} as const

export const MARKET_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
} as const

// Trading Constants
export const DEFAULT_SLIPPAGE = 0.01 // 1%
export const MAX_SLIPPAGE = 0.05 // 5%
export const MIN_BET_AMOUNT = 0.01
export const FEE_BASIS_POINTS = 500 // 5%

// UI Constants
export const ITEMS_PER_PAGE = 20
export const DEBOUNCE_DELAY = 300 // ms
export const TOAST_DURATION = 5000 // ms

// Market Categories
export const MARKET_CATEGORIES = [
  'Sports',
  'Politics',
  'Crypto',
  'Economics',
  'Technology',
  'Entertainment',
  'Weather',
  'Other',
] as const

// Subject Kinds
export const SUBJECT_KINDS = {
  HL_METRIC: 'HL_METRIC',
  TOKEN_PRICE: 'TOKEN_PRICE',
} as const

// Predicate Operations
export const PREDICATE_OPS = {
  GT: 'GT',
  GTE: 'GTE',
  LT: 'LT',
  LTE: 'LTE',
} as const

// Window Kinds
export const WINDOW_KINDS = {
  SNAPSHOT_AT: 'SNAPSHOT_AT',
  WINDOW_SUM: 'WINDOW_SUM',
  WINDOW_COUNT: 'WINDOW_COUNT',
} as const

// Time Constants
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

// Query Keys for React Query
export const QUERY_KEYS = {
  MARKETS: 'markets',
  MARKET: 'market',
  USER_POSITIONS: 'userPositions',
  USER_ANALYTICS: 'userAnalytics',
  PROTOCOL_STATS: 'protocolStats',
  LEADERBOARD: 'leaderboard',
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'hyperodds:theme',
  SLIPPAGE: 'hyperodds:slippage',
  FAVORITES: 'hyperodds:favorites',
  LAST_NETWORK: 'hyperodds:lastNetwork',
  MARKET_FILTERS: 'hyperodds:marketFilters',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  HEALTH: '/api/health',
  WEBHOOKS: '/api/webhooks',
} as const

// External Links
export const EXTERNAL_LINKS = {
  GITHUB: 'https://github.com/hyperodds',
  DOCS: 'https://docs.hyperodds.com',
  DISCORD: 'https://discord.gg/hyperodds',
  TWITTER: 'https://twitter.com/hyperodds',
  ARBITRUM_EXPLORER: 'https://arbiscan.io',
  ARBITRUM_SEPOLIA_EXPLORER: 'https://sepolia.arbiscan.io',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  MARKET_NOT_FOUND: 'Market not found',
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  INVALID_AMOUNT: 'Invalid amount',
  MARKET_CLOSED: 'Market is closed for trading',
  ALREADY_CLAIMED: 'Rewards already claimed',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  TRADE_SUCCESSFUL: 'Trade executed successfully',
  CLAIM_SUCCESSFUL: 'Rewards claimed successfully',
  MARKET_CREATED: 'Market created successfully',
  SETTINGS_SAVED: 'Settings saved',
} as const

// Chart Colors (matching CSS variables)
export const CHART_COLORS = {
  YES: 'hsl(var(--chart-1))', // Green
  NO: 'hsl(var(--chart-2))', // Red
  PRIMARY: 'hsl(var(--chart-3))', // Purple
  WARNING: 'hsl(var(--chart-4))', // Yellow
  ACCENT: 'hsl(var(--chart-5))', // Blue
} as const

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

// Feature Flags
export const FEATURES = {
  DARK_MODE: true,
  MARKET_CREATION: true,
  ANALYTICS: true,
  NOTIFICATIONS: true,
  SOCIAL_FEATURES: true,
} as const

// Rate Limiting
export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 60,
  TRADES_PER_HOUR: 100,
  MARKET_CREATION_PER_DAY: 10,
} as const