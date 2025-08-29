/**
 * User and position-related type definitions
 * Based on the GraphQL schema from the indexer
 */

import { Market, MarketOutcome } from './market'

/**
 * User/trader base information from GraphQL schema
 */
export interface User {
  id: string // user address
  totalDeposited: string
  totalClaimed: string
  totalProfit: string
  marketsCreated: number
  marketsParticipated: number
  firstSeenAt: string
  firstSeenAtBlock: number
  lastActiveAt: string
  lastActiveAtBlock: number
  
  // Relations
  createdMarkets?: Market[]
  deposits?: Deposit[]
  claims?: Claim[]
  positions?: Position[]
}

/**
 * Extended user profile with additional stats
 */
export interface UserProfile extends User {
  // Trading statistics
  marketsTraded: number
  marketsCreated: number
  marketsWon: number
  marketsLost: number
  averageTradeSize: string
  largestWin: string
  largestLoss: string
  
  // Portfolio metrics
  totalInvested: string
  currentValue: string
  realizedPnl: string
  unrealizedPnl: string
  
  // Activity metrics
  totalClaimed: string
  pendingClaims: string
  activePositions: number
  
  // Social/reputation
  followers?: number
  following?: number
  reputation?: number
  verified?: boolean
  
  // Preferences
  notifications?: UserNotificationSettings
  privacy?: UserPrivacySettings
}

/**
 * Position from GraphQL schema
 */
export interface Position {
  id: string // market-user
  market: {
    id: string
    title: string
    description: string
    resolved: boolean
    cancelled: boolean
    winningOutcome?: number
    poolNo: string
    poolYes: string
    totalPool: string
    cutoffTime: string
    resolveTime: string
    feeBps: number
  }
  user: {
    id: string
  }
  
  // Stakes
  stakeNo: string
  stakeYes: string
  totalStake: string
  
  // Effective Stakes (with time decay multipliers)
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
 * Deposit from GraphQL schema
 */
export interface Deposit {
  id: string // tx-logIndex
  market: {
    id: string
    title: string
  }
  user: {
    id: string
  }
  outcome: number // 0 = NO, 1 = YES
  amount: string
  effectiveAmount: string // Amount after time decay multiplier
  timeMultiplier: string // The multiplier applied (e.g., 1.125 for early, 0.875 for late)
  
  // Metadata
  timestamp: string
  blockNumber: string
  transactionHash: string
  logIndex: string
}

/**
 * Claim from GraphQL schema
 */
export interface Claim {
  id: string // tx-logIndex
  market: {
    id: string
    title: string
  }
  user: {
    id: string
  }
  payout: string
  
  // Metadata
  timestamp: string
  blockNumber: string
  transactionHash: string
  logIndex: string
}

/**
 * Enhanced position with calculated fields for Parimutuel markets
 */
export interface ParimutuelPositionWithStats {
  // Base position data
  id: string
  market: Market
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
  
  // Calculated fields
  currentProbabilityYes: number
  currentProbabilityNo: number
  potentialPayout: string
  roi: number
  status: 'active' | 'won' | 'lost' | 'pending' | 'claimable'
  unrealizedPnl: string
}

/**
 * Enhanced position with calculated fields for CPMM markets
 */
export interface CPMMPositionWithStats {
  // Base position data
  id: string
  market: Market
  user: User
  
  // Shares
  sharesYes: string
  sharesNo: string
  totalShares: string
  
  // Value
  currentValue: string
  averageCost: string
  profit: string
  
  // Outcome (if resolved)
  claimed: boolean
  payout: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  claimedAt?: string
  
  // Calculated fields
  currentProbabilityYes: number
  currentProbabilityNo: number
  roi: number
  status: 'active' | 'won' | 'lost' | 'pending' | 'claimable'
  unrealizedPnl: string
}

/**
 * Union type for positions with stats
 */
export type PositionWithStats = ParimutuelPositionWithStats | CPMMPositionWithStats

/**
 * Legacy UserPosition interface for backward compatibility
 */
export interface UserPosition {
  id: string
  marketId: string
  market: Market
  user: User
  
  // Position details
  outcome: MarketOutcome
  shares: string
  sharesYes: string
  sharesNo: string
  
  // Cost basis
  averageCostYes?: string
  averageCostNo?: string
  totalInvested: string
  
  // P&L tracking
  currentValue: string
  realizedPnl: string
  unrealizedPnl: string
  pnlPercent: number
  
  // Timestamps
  firstTradeAt: string
  lastTradeAt: string
  createdAt: string
  updatedAt: string
  
  // Status
  isActive: boolean
  canClaim: boolean
  claimableAmount?: string
  claimed?: boolean
  claimedAt?: string
}

/**
 * Aggregated position summary
 */
export interface PositionSummary {
  totalPositions: number
  activePositions: number
  wonPositions: number
  lostPositions: number
  pendingPositions: number
  
  totalInvested: string
  currentValue: string
  totalPnl: string
  totalPnlPercent: number
  
  totalClaimable: string
  totalClaimed: string
  
  winRate: number
  averagePosition: string
  largestPosition: string
}

/**
 * User trading activity/history
 */
export interface UserActivity {
  id: string
  user: User
  type: UserActivityType
  marketId?: string
  market?: Market
  
  // Activity details
  title: string
  description: string
  amount?: string
  outcome?: MarketOutcome
  
  // Metadata
  timestamp: string
  txHash?: string
  blockNumber?: number
  
  // Status
  status: ActivityStatus
  data?: Record<string, any>
}

export type UserActivityType = 
  | 'trade_buy'
  | 'trade_sell'
  | 'market_created'
  | 'position_claimed'
  | 'market_resolved'
  | 'referral_earned'
  | 'badge_earned'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed'

/**
 * User notification settings
 */
export interface UserNotificationSettings {
  email?: boolean
  push?: boolean
  browser?: boolean
  
  // Notification types
  tradeExecuted?: boolean
  marketResolved?: boolean
  positionUpdates?: boolean
  marketExpiring?: boolean
  priceAlerts?: boolean
  marketCreated?: boolean
  socialActivity?: boolean
}

/**
 * User privacy settings
 */
export interface UserPrivacySettings {
  profileVisible?: boolean
  statsVisible?: boolean
  activityVisible?: boolean
  followersVisible?: boolean
  ensNameVisible?: boolean
}

/**
 * User portfolio filters
 */
export interface PortfolioFilters {
  status?: PositionStatus[]
  outcomes?: MarketOutcome[]
  categories?: string[]
  markets?: string[]
  minValue?: string
  maxValue?: string
  minPnl?: string
  maxPnl?: string
  sortBy?: PositionSortBy
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export type PositionStatus = 
  | 'active'
  | 'won' 
  | 'lost'
  | 'claimable'
  | 'claimed'
  | 'expired'

export type PositionSortBy = 
  | 'value'
  | 'pnl'
  | 'pnl_percent'
  | 'created_at'
  | 'updated_at'
  | 'market_expiry'

/**
 * User search/discovery
 */
export interface UserSearchFilters {
  query?: string
  minVolume?: string
  minTrades?: number
  minWinRate?: number
  verified?: boolean
  hasEns?: boolean
  sortBy?: UserSortBy
  sortOrder?: 'asc' | 'desc'
}

export type UserSortBy = 
  | 'volume'
  | 'trades'
  | 'win_rate'
  | 'pnl'
  | 'created_at'
  | 'last_active'

/**
 * User leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number
  user: User
  metric: string
  value: string
  change?: number
  period?: LeaderboardPeriod
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'

export type LeaderboardMetric = 
  | 'volume'
  | 'pnl'
  | 'win_rate'
  | 'trades'
  | 'markets_won'

/**
 * User referral system
 */
export interface UserReferral {
  id: string
  referrer: User
  referee: User
  
  // Referral details
  code: string
  rewardAmount: string
  rewardClaimed: boolean
  
  // Timestamps
  createdAt: string
  claimedAt?: string
  
  // Status
  isActive: boolean
}

/**
 * User badges/achievements
 */
export interface UserBadge {
  id: string
  user: User
  
  // Badge details
  type: BadgeType
  title: string
  description: string
  icon: string
  rarity: BadgeRarity
  
  // Requirements
  criteria: Record<string, any>
  progress?: number
  maxProgress?: number
  
  // Timestamps
  earnedAt?: string
  expiresAt?: string
  
  // Status
  isEarned: boolean
  isVisible: boolean
}

export type BadgeType = 
  | 'trader'
  | 'creator'
  | 'predictor'
  | 'social'
  | 'special'

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * User subscription/membership
 */
export interface UserSubscription {
  id: string
  user: User
  
  // Subscription details
  tier: SubscriptionTier
  status: SubscriptionStatus
  
  // Benefits
  features: string[]
  limits: Record<string, number>
  
  // Billing
  price: string
  currency: string
  billingCycle: BillingCycle
  
  // Timestamps
  startedAt: string
  renewsAt?: string
  cancelledAt?: string
  expiresAt?: string
}

export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused'
export type BillingCycle = 'monthly' | 'yearly'

/**
 * User API key for third-party integrations
 */
export interface UserApiKey {
  id: string
  user: User
  
  // Key details
  name: string
  key: string
  hashedKey: string
  
  // Permissions
  scopes: ApiScope[]
  rateLimit: number
  
  // Usage
  lastUsedAt?: string
  usageCount: number
  
  // Status
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export type ApiScope = 
  | 'read:profile'
  | 'read:positions'
  | 'read:trades'
  | 'write:trades'
  | 'read:markets'
  | 'write:markets'