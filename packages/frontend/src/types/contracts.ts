/**
 * Contract-related type definitions
 * Based on the smart contract interfaces
 */

import { Address, Hex } from 'viem'

/**
 * Contract addresses by chain
 */
export interface ContractAddresses {
  marketFactory: Address
  marketImplementation: Address
  usdc?: Address
  weth?: Address
}

/**
 * Chain-specific contract configuration
 */
export interface ChainContracts {
  [chainId: number]: ContractAddresses
}

/**
 * Market contract state
 */
export interface MarketContractState {
  id: bigint
  question: string
  description: string
  imageUrl: string
  creator: Address
  poolYes: bigint
  poolNo: bigint
  resolved: boolean
  outcome: number // 0 = unresolved, 1 = YES, 2 = NO, 3 = INVALID
  totalVolume: bigint
  totalTrades: bigint
  expirationTime: bigint
  createdAt: bigint
  resolvedAt: bigint
}

/**
 * Position contract state
 */
export interface PositionContractState {
  marketId: bigint
  user: Address
  sharesYes: bigint
  sharesNo: bigint
  claimedWinnings: boolean
}

/**
 * Trade event from contract
 */
export interface TradeEvent {
  marketId: bigint
  trader: Address
  outcome: number // 1 = YES, 2 = NO
  isBuy: boolean
  shares: bigint
  cost: bigint
  newPoolYes: bigint
  newPoolNo: bigint
  timestamp: bigint
  transactionHash: Hex
  blockNumber: bigint
}

/**
 * Market created event
 */
export interface MarketCreatedEvent {
  marketId: bigint
  creator: Address
  question: string
  description: string
  expirationTime: bigint
  initialPoolYes: bigint
  initialPoolNo: bigint
  timestamp: bigint
  transactionHash: Hex
  blockNumber: bigint
}

/**
 * Market resolved event
 */
export interface MarketResolvedEvent {
  marketId: bigint
  resolver: Address
  outcome: number // 1 = YES, 2 = NO, 3 = INVALID
  timestamp: bigint
  transactionHash: Hex
  blockNumber: bigint
}

/**
 * Winnings claimed event
 */
export interface WinningsClaimedEvent {
  marketId: bigint
  user: Address
  amount: bigint
  timestamp: bigint
  transactionHash: Hex
  blockNumber: bigint
}

/**
 * Contract function parameters
 */

// Market Factory functions
export interface CreateMarketContractParams {
  question: string
  description: string
  imageUrl: string
  expirationTime: bigint
  initialLiquidityYes: bigint
  initialLiquidityNo: bigint
}

// Market Implementation functions
export interface BuySharesContractParams {
  outcome: number // 1 = YES, 2 = NO
  amount: bigint
  minShares: bigint
  deadline: bigint
}

export interface SellSharesContractParams {
  outcome: number // 1 = YES, 2 = NO
  shares: bigint
  minAmount: bigint
  deadline: bigint
}

export interface ResolveMarketContractParams {
  outcome: number // 1 = YES, 2 = NO, 3 = INVALID
}

/**
 * Contract read results
 */
export interface GetMarketResult {
  id: bigint
  question: string
  description: string
  imageUrl: string
  creator: Address
  poolYes: bigint
  poolNo: bigint
  resolved: boolean
  outcome: number
  expirationTime: bigint
  createdAt: bigint
  resolvedAt: bigint
}

export interface GetPositionResult {
  sharesYes: bigint
  sharesNo: bigint
  claimedWinnings: boolean
}

export interface CalculateBuyResult {
  shares: bigint
  cost: bigint
  priceImpact: bigint
  newPoolYes: bigint
  newPoolNo: bigint
}

export interface CalculateSellResult {
  amount: bigint
  priceImpact: bigint
  newPoolYes: bigint
  newPoolNo: bigint
}

/**
 * Contract error types
 */
export type ContractErrorCode = 
  | 'INSUFFICIENT_BALANCE'
  | 'MARKET_RESOLVED'
  | 'MARKET_EXPIRED'
  | 'INVALID_OUTCOME'
  | 'SLIPPAGE_EXCEEDED'
  | 'DEADLINE_EXCEEDED'
  | 'NOT_AUTHORIZED'
  | 'ALREADY_CLAIMED'
  | 'NO_WINNINGS'
  | 'MARKET_NOT_RESOLVED'

export interface ContractError {
  code: ContractErrorCode
  message: string
  data?: any
}

/**
 * Gas estimation results
 */
export interface GasEstimate {
  gasLimit: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  estimatedCost: bigint
  estimatedCostUSD?: number
}