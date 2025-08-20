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
  id: string // market address
  title: string
  description: string
  
  // Pool state
  poolYes: string
  poolNo: string
  totalPool: string
  effectivePoolYes: string
  effectivePoolNo: string
  totalEffectivePool: string
  feeCollected: string
  
  // Status
  resolved: boolean
  cancelled: boolean
  winningOutcome?: number // 0 = NO, 1 = YES
  
  // Economics
  feeBps: number
  creatorFeeShareBps: number
  maxTotalPool: string
  timeDecayBps: number
  
  // Timestamps (BigInt as string)
  cutoffTime: string
  resolveTime: string
  createdAt: string
  resolvedAt?: string
  
  // Creator
  creator: {
    id: string
    totalDeposited?: string
    marketsCreated?: string
  }
  
  // Relations (optional, loaded separately)
  deposits?: Deposit[]
  positions?: Position[]
  
  // Computed fields
  probability?: number
  yesPrice?: number
  noPrice?: number
}

/**
 * Position in a market
 */
export interface Position {
  id: string // market-user
  market?: Market
  user: User
  
  // Stakes
  stakeNo: string
  stakeYes: string
  totalStake: string
  
  // Effective Stakes (with time decay)
  effectiveStakeNo: string
  effectiveStakeYes: string
  totalEffectiveStake: string
  
  // Outcome
  claimed: boolean
  payout: string
  profit: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  claimedAt?: string
}

/**
 * Deposit in a market
 */
export interface Deposit {
  id: string // tx-logIndex
  market?: Market
  user: User
  outcome: number // 0 = NO, 1 = YES
  amount: string
  effectiveAmount: string // After time decay multiplier
  timeMultiplier: string
  
  // Metadata
  timestamp: string
  blockNumber: string
  transactionHash: string
  logIndex: string
}

/**
 * User/trader information
 */
export interface User {
  id: string // user address
  
  // Stats
  totalDeposited?: string
  totalClaimed?: string
  totalProfit?: string
  marketsCreated?: string
  marketsParticipated?: string
  
  // Metadata
  firstSeenAt?: string
  firstSeenAtBlock?: string
  lastActiveAt?: string
  lastActiveAtBlock?: string
  
  // Frontend-only fields
  ensName?: string
  avatar?: string
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
  skip?: number
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