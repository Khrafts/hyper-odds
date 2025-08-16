import { z } from 'zod'
import { parseEther } from 'viem'

/**
 * Trading side options
 */
export const TradingSide = z.enum(['YES', 'NO'])
export type TradingSide = z.infer<typeof TradingSide>

/**
 * Trading form validation schema
 */
export const tradingFormSchema = z.object({
  side: TradingSide,
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }, 'Amount must be greater than 0')
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num <= 1000000
    }, 'Amount must be less than 1,000,000 USDC')
    .refine((val) => {
      // Check decimal places (max 6 for USDC)
      const parts = val.split('.')
      if (parts.length > 1) {
        return parts[1].length <= 6
      }
      return true
    }, 'Too many decimal places (max 6)'),
  slippage: z
    .number()
    .min(0.01, 'Slippage must be at least 0.01%')
    .max(50, 'Slippage cannot exceed 50%')
    .default(1),
})

export type TradingFormData = z.infer<typeof tradingFormSchema>

/**
 * Balance validation schema
 */
export const balanceValidationSchema = z.object({
  userBalance: z.string(),
  requiredAmount: z.string(),
}).refine((data) => {
  try {
    const balance = parseEther(data.userBalance)
    const required = parseEther(data.requiredAmount)
    return balance >= required
  } catch {
    return false
  }
}, 'Insufficient balance')

/**
 * Market validation schema
 */
export const marketValidationSchema = z.object({
  marketId: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid market ID'),
  isResolved: z.boolean(),
  cutoffTime: z.string().optional(),
  hasExpired: z.boolean().optional(),
}).refine((data) => {
  // Check if market is still active
  if (data.isResolved) {
    return false
  }
  
  // Check if trading has ended
  if (data.cutoffTime) {
    const cutoff = new Date(parseInt(data.cutoffTime) * 1000)
    const now = new Date()
    return cutoff > now
  }
  
  return true
}, {
  message: 'Market is not accepting trades',
  path: ['marketId'],
})

/**
 * Transaction validation schema
 */
export const transactionValidationSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  value: z.string(),
  data: z.string().optional(),
  gasLimit: z.bigint().optional(),
  gasPrice: z.bigint().optional(),
  maxFeePerGas: z.bigint().optional(),
  maxPriorityFeePerGas: z.bigint().optional(),
})

/**
 * Share calculation validation
 */
export const shareCalculationSchema = z.object({
  depositAmount: z.number().positive('Deposit amount must be positive'),
  poolYes: z.number().positive('YES pool must be positive'),
  poolNo: z.number().positive('NO pool must be positive'),
  side: TradingSide,
}).transform((data) => {
  const { depositAmount, poolYes, poolNo, side } = data
  
  const selectedPool = side === 'YES' ? poolYes : poolNo
  const oppositePool = side === 'YES' ? poolNo : poolYes
  
  // CPMM formula
  const k = selectedPool * oppositePool
  const newSelectedPool = selectedPool + depositAmount
  const newOppositePool = k / newSelectedPool
  const shares = oppositePool - newOppositePool
  
  // Calculate new probabilities
  const newYesPool = side === 'YES' ? newSelectedPool : poolYes
  const newNoPool = side === 'NO' ? newSelectedPool : poolNo
  const total = newYesPool + newNoPool
  const newProbability = side === 'YES' 
    ? (newNoPool / total) * 100
    : (newYesPool / total) * 100
  
  return {
    shares,
    avgPrice: depositAmount / shares,
    newProbability,
    priceImpact: Math.abs(newProbability - (oppositePool / (poolYes + poolNo)) * 100),
  }
})

/**
 * Slippage validation
 */
export const slippageValidationSchema = z.object({
  expectedShares: z.number().positive(),
  actualShares: z.number().positive(),
  maxSlippage: z.number().min(0).max(100),
}).refine((data) => {
  const slippage = ((data.expectedShares - data.actualShares) / data.expectedShares) * 100
  return Math.abs(slippage) <= data.maxSlippage
}, 'Price moved beyond slippage tolerance')

/**
 * Gas estimation validation
 */
export const gasEstimationSchema = z.object({
  gasLimit: z.bigint().min(21000n, 'Gas limit too low'),
  gasPrice: z.bigint().optional(),
  maxFeePerGas: z.bigint().optional(),
  maxPriorityFeePerGas: z.bigint().optional(),
}).refine((data) => {
  // Either legacy gas price or EIP-1559 fees must be provided
  return data.gasPrice !== undefined || 
    (data.maxFeePerGas !== undefined && data.maxPriorityFeePerGas !== undefined)
}, 'Gas parameters required')

/**
 * Validate trading amount
 */
export function validateTradingAmount(
  amount: string,
  balance?: bigint,
  minAmount = '1',
  maxAmount = '1000000'
): { isValid: boolean; error?: string } {
  try {
    // Parse amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return { isValid: false, error: 'Invalid amount' }
    }
    
    // Check minimum
    if (amountNum < parseFloat(minAmount)) {
      return { isValid: false, error: `Minimum amount is ${minAmount} USDC` }
    }
    
    // Check maximum
    if (amountNum > parseFloat(maxAmount)) {
      return { isValid: false, error: `Maximum amount is ${maxAmount} USDC` }
    }
    
    // Check balance if provided (USDC has 6 decimals)
    if (balance !== undefined) {
      const amountInUSDC = BigInt(Math.floor(amountNum * 1e6)) // USDC has 6 decimals
      if (amountInUSDC > balance) {
        return { isValid: false, error: 'Insufficient balance' }
      }
    }
    
    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: 'Invalid amount format' }
  }
}

/**
 * Validate market state for trading
 */
export function validateMarketState(market: {
  resolved: boolean
  cutoffTime?: string
  poolYes?: string
  poolNo?: string
}): { canTrade: boolean; reason?: string } {
  // Check if resolved
  if (market.resolved) {
    return { canTrade: false, reason: 'Market is resolved' }
  }
  
  // Check cutoff time
  if (market.cutoffTime) {
    const cutoff = new Date(parseInt(market.cutoffTime) * 1000)
    if (cutoff < new Date()) {
      return { canTrade: false, reason: 'Trading has ended' }
    }
  }
  
  // Check liquidity
  const yesPool = parseFloat(market.poolYes || '0')
  const noPool = parseFloat(market.poolNo || '0')
  if (yesPool <= 0 || noPool <= 0) {
    return { canTrade: false, reason: 'Insufficient liquidity' }
  }
  
  return { canTrade: true }
}

/**
 * Calculate maximum tradeable amount based on slippage
 */
export function calculateMaxTradeAmount(
  pool: number,
  oppositePool: number,
  maxSlippage: number
): number {
  // Calculate the amount that would move the price by maxSlippage%
  const currentPrice = oppositePool / (pool + oppositePool)
  const targetPrice = currentPrice * (1 + maxSlippage / 100)
  
  // Solve for deposit amount
  // targetPrice = oppositePool / (pool + deposit + oppositePool)
  // deposit = (oppositePool / targetPrice) - pool - oppositePool
  const maxDeposit = (oppositePool / targetPrice) - pool - oppositePool
  
  return Math.max(0, maxDeposit)
}

/**
 * Validate wallet connection
 */
export const walletConnectionSchema = z.object({
  isConnected: z.boolean(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  chainId: z.number().optional(),
}).refine((data) => {
  if (!data.isConnected) {
    return false
  }
  return data.address !== undefined && data.chainId !== undefined
}, 'Wallet not properly connected')

/**
 * Complete trade validation combining all checks
 */
export const completeTradeValidationSchema = z.object({
  // Wallet
  wallet: walletConnectionSchema,
  
  // Market
  market: z.object({
    id: z.string(),
    resolved: z.boolean(),
    cutoffTime: z.string().optional(),
    poolYes: z.string(),
    poolNo: z.string(),
  }),
  
  // Trade parameters
  trade: tradingFormSchema,
  
  // User balance
  balance: z.bigint(),
}).refine((data) => {
  // Validate market state
  const marketState = validateMarketState(data.market)
  if (!marketState.canTrade) {
    return false
  }
  
  // Validate amount against balance
  const amountValidation = validateTradingAmount(
    data.trade.amount,
    data.balance
  )
  
  return amountValidation.isValid
}, 'Trade validation failed')