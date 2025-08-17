import { Address } from 'viem'

/**
 * Market Parameters for contract interactions
 * Based on MarketParams.sol
 */
export interface MarketParams {
  subject: string
  predicate: string  
  creator: Address
  cutoffTime: bigint
  window: {
    tStart: bigint
    tEnd: bigint
  }
  econ: {
    maxTotalPool: bigint
    timeDecayBps: number
  }
}

/**
 * Market Creation Result
 */
export interface MarketCreationResult {
  marketAddress: Address
  transactionHash: `0x${string}`
  blockNumber: bigint
}

/**
 * Trading Parameters
 */
export interface DepositParams {
  marketAddress: Address
  outcome: 0 | 1 // 0 = NO, 1 = YES
  amount: bigint
}

/**
 * Position Data from Contract
 */
export interface ContractPosition {
  stakeNo: bigint
  stakeYes: bigint
  effectiveStakeNo: bigint
  effectiveStakeYes: bigint
  claimed: boolean
}

/**
 * Market State from Contract
 */
export interface ContractMarketState {
  poolNo: bigint
  poolYes: bigint
  totalEffectiveStakeNo: bigint
  totalEffectiveStakeYes: bigint
  resolved: boolean
  winningOutcome: number
  cutoffTime: bigint
  resolveTime: bigint
  maxTotalPool: bigint
  timeDecayBps: number
}

/**
 * Transaction States
 */
export type TransactionStatus = 
  | 'idle'
  | 'preparing'
  | 'pending'
  | 'confirmed'
  | 'failed'

/**
 * Transaction Result
 */
export interface TransactionResult {
  hash: `0x${string}`
  status: TransactionStatus
  error?: string
  gasUsed?: bigint
  blockNumber?: bigint
}

/**
 * Contract Function Names
 */
export type MarketFactoryFunctions = 
  | 'createMarket'
  | 'createMarketWithPermit'
  | 'createProtocolMarket'
  | 'releaseStake'

export type MarketFunctions =
  | 'deposit'
  | 'claim'
  | 'getPrice'
  | 'pool'
  | 'stakeOf'
  | 'userEffectiveStakes'

export type StHYPEFunctions =
  | 'approve'
  | 'permit'
  | 'balanceOf'
  | 'allowance'

/**
 * Error Types
 */
export interface ContractError {
  name: string
  message: string
  cause?: unknown
  metaMessages?: string[]
}

/**
 * Gas Estimation Result
 */
export interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  estimatedCost: bigint
}

/**
 * Token Information
 */
export interface TokenInfo {
  address: Address
  symbol: string
  decimals: number
  name: string
}

/**
 * Permit Parameters for EIP-2612
 */
export interface PermitParams {
  owner: Address
  spender: Address
  value: bigint
  deadline: bigint
  v: number
  r: `0x${string}`
  s: `0x${string}`
}