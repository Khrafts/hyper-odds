/**
 * Market-related type definitions
 * Based on the GraphQL schema from the indexer
 */

export type MarketOutcome = 'YES' | 'NO' | 'INVALID'
export type MarketStatus = 'active' | 'resolved' | 'expired'
export type OrderType = 'market' | 'limit'

/**
 * Core market data structure
 */
export interface Market {
  id: string
  marketId: string
  question: string
  description?: string
  imageUrl?: string
  category?: string
  tags?: string[]
  
  // Pool state
  poolYes: string
  poolNo: string
  totalVolume: string
  totalTrades: number
  
  // Status
  resolved: boolean
  resolvedOutcome?: MarketOutcome
  status: MarketStatus
  
  // Timestamps
  createdAt: string
  updatedAt: string
  expirationTime?: string
  resolvedAt?: string
  
  // Creator
  creator: {
    id: string
    address: string
  }
  
  // Computed fields
  probability?: number
  yesPrice?: number
  noPrice?: number
  liquidity?: string
}

/**
 * Position in a market
 */
export interface Position {
  id: string
  market: Market
  user: User
  sharesYes: string
  sharesNo: string
  averageCostYes?: string
  averageCostNo?: string
  realizedPnl?: string
  unrealizedPnl?: string
  createdAt: string
  updatedAt: string
}

/**
 * Trade/transaction in a market
 */
export interface Trade {
  id: string
  tradeId: string
  market: Market
  trader: User
  outcome: 'YES' | 'NO'
  type: 'buy' | 'sell'
  shares: string
  amount: string
  price: string
  timestamp: string
  txHash: string
  blockNumber: number
  gasUsed?: string
  gasFee?: string
}

/**
 * User/trader information
 */
export interface User {
  id: string
  address: string
  ensName?: string
  avatar?: string
  totalVolume?: string
  totalTrades?: number
  winRate?: number
  pnl?: string
  createdAt: string
  lastActiveAt?: string
}

/**
 * Market creation parameters
 */
export interface CreateMarketParams {
  question: string
  description?: string
  category?: string
  tags?: string[]
  expirationTime?: number
  initialLiquidityYes?: string
  initialLiquidityNo?: string
  imageUrl?: string
}

/**
 * Trade execution parameters
 */
export interface TradeParams {
  marketId: string
  outcome: 'YES' | 'NO'
  type: 'buy' | 'sell'
  amount?: string // For market orders
  shares?: string // For limit orders
  slippage?: number // Max slippage tolerance (0-100)
  deadline?: number // Transaction deadline timestamp
}

/**
 * Market resolution parameters
 */
export interface ResolveMarketParams {
  marketId: string
  outcome: MarketOutcome
  proof?: string // Optional proof/evidence URL
}

/**
 * Market filters for queries
 */
export interface MarketFilters {
  status?: MarketStatus
  category?: string
  tags?: string[]
  creator?: string
  searchQuery?: string
  sortBy?: MarketSortBy
  minVolume?: string
  maxVolume?: string
  minLiquidity?: string
  createdAfter?: string
  createdBefore?: string
  expiringBefore?: string
  expiringAfter?: string
}

/**
 * Sort options for markets
 */
export type MarketSortBy = 
  | 'newest' 
  | 'oldest'
  | 'volume' 
  | 'liquidity' 
  | 'trades' 
  | 'expiring_soon'
  | 'recently_resolved'
  | 'trending'

/**
 * Pagination parameters
 */
export interface PaginationParams {
  first?: number
  after?: string
  before?: string
  last?: number
}

/**
 * Market statistics
 */
export interface MarketStats {
  totalMarkets: number
  activeMarkets: number
  resolvedMarkets: number
  totalVolume: string
  totalTrades: number
  totalUsers: number
  avgDailyVolume: string
  avgDailyTrades: number
}

/**
 * Price history point
 */
export interface PricePoint {
  timestamp: string
  yesPrice: number
  noPrice: number
  volume: string
}

/**
 * Market chart data
 */
export interface MarketChartData {
  priceHistory: PricePoint[]
  volumeHistory: Array<{
    timestamp: string
    volume: string
  }>
  liquidityHistory: Array<{
    timestamp: string
    liquidityYes: string
    liquidityNo: string
  }>
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  price: number
  shares: string
  total: string
  orders: number
}

/**
 * Market order book
 */
export interface OrderBook {
  marketId: string
  yesOrders: {
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
  }
  noOrders: {
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
  }
  spread: number
  midPrice: number
  lastUpdated: string
}

/**
 * Notification types
 */
export type NotificationType = 
  | 'trade_executed'
  | 'market_resolved'
  | 'position_liquidated'
  | 'market_created'
  | 'price_alert'

/**
 * Notification
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  marketId?: string
  timestamp: string
  read: boolean
  data?: Record<string, any>
}

/**
 * Transaction status
 */
export type TransactionStatus = 
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled'

/**
 * Transaction
 */
export interface Transaction {
  id: string
  hash: string
  type: 'trade' | 'create_market' | 'resolve_market' | 'claim_winnings'
  status: TransactionStatus
  marketId?: string
  amount?: string
  gasUsed?: string
  gasFee?: string
  timestamp: string
  blockNumber?: number
  error?: string
}