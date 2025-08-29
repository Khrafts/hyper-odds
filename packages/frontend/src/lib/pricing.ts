/**
 * Pricing utilities for different market types
 */

import { parseEther, formatEther } from 'viem'

/**
 * Calculate probability for Parimutuel markets
 */
export function calculateParimutuelProbability(
  poolYes: string | bigint,
  poolNo: string | bigint
): number {
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const yesAmount = typeof poolYes === 'string' ? 
    BigInt(Math.floor(parseFloat(poolYes) * 1000000)) : BigInt(poolYes)
  const noAmount = typeof poolNo === 'string' ? 
    BigInt(Math.floor(parseFloat(poolNo) * 1000000)) : BigInt(poolNo)
  const total = yesAmount + noAmount
  
  if (total === 0n) return 50 // Default to 50% if no deposits
  
  return Number((yesAmount * 100n) / total)
}

/**
 * Calculate probability for CPMM markets
 */
export function calculateCPMMProbability(
  reserveYes: string | bigint,
  reserveNo: string | bigint
): number {
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const yesReserve = typeof reserveYes === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveYes) * 1000000)) : BigInt(reserveYes)
  const noReserve = typeof reserveNo === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveNo) * 1000000)) : BigInt(reserveNo)
  const total = yesReserve + noReserve
  
  if (total === 0n) return 50 // Default to 50% if no liquidity
  
  // CPMM probability = reserveNo / (reserveYes + reserveNo)
  return Number((noReserve * 100n) / total)
}

/**
 * Calculate spot price for CPMM markets
 */
export function calculateSpotPrice(
  reserveYes: string | bigint,
  reserveNo: string | bigint
): number {
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const yesReserve = typeof reserveYes === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveYes) * 1000000)) : BigInt(reserveYes)
  const noReserve = typeof reserveNo === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveNo) * 1000000)) : BigInt(reserveNo)
  
  if (yesReserve === 0n) return 0
  
  // Spot price = reserveNo / reserveYes
  return Number(noReserve) / Number(yesReserve)
}

/**
 * Calculate shares to receive when buying in CPMM
 */
export function calculateCPMMBuyShares(
  outcome: 'YES' | 'NO',
  amountIn: string | bigint,
  reserveYes: string | bigint,
  reserveNo: string | bigint,
  feeBps: number // Market-specific fee rate
): { sharesOut: bigint; priceImpact: number; effectivePrice: number } {
  const amount = BigInt(amountIn)
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const yesReserve = typeof reserveYes === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveYes) * 1000000)) : BigInt(reserveYes)
  const noReserve = typeof reserveNo === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveNo) * 1000000)) : BigInt(reserveNo)
  const k = yesReserve * noReserve
  
  let reserveIn: bigint
  let reserveOut: bigint
  
  if (outcome === 'YES') {
    // Buying YES shares: add to NO reserve, remove from YES reserve
    reserveIn = noReserve
    reserveOut = yesReserve
  } else {
    // Buying NO shares: add to YES reserve, remove from NO reserve
    reserveIn = yesReserve
    reserveOut = noReserve
  }
  
  // Calculate gross shares using constant product formula (matches contract)
  // sharesOutGross = (reserveOut * amountIn) / (reserveIn + amountIn)
  const sharesOutGross = (reserveOut * amount) / (reserveIn + amount)
  
  // Apply fee to output shares (matches contract line 244-245)
  const feeAmount = (sharesOutGross * BigInt(feeBps)) / 10000n
  const sharesOut = sharesOutGross - feeAmount
  
  // Calculate new reserves after trade
  let newYesReserve: bigint
  let newNoReserve: bigint
  
  if (outcome === 'YES') {
    newNoReserve = noReserve + amount
    newYesReserve = yesReserve - sharesOutGross
  } else {
    newYesReserve = yesReserve + amount
    newNoReserve = noReserve - sharesOutGross
  }
  
  // Calculate price impact
  const oldPrice = calculateSpotPrice(yesReserve, noReserve)
  const newPrice = calculateSpotPrice(newYesReserve, newNoReserve)
  const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100
  
  // Calculate effective price (amount paid per share received)
  const effectivePrice = Number(amount) / Number(sharesOut)
  
  return { sharesOut, priceImpact, effectivePrice }
}

/**
 * Calculate amount to receive when selling shares in CPMM
 */
export function calculateCPMMSellAmount(
  outcome: 'YES' | 'NO',
  sharesIn: string | bigint,
  reserveYes: string | bigint,
  reserveNo: string | bigint,
  feeBps: number // Market-specific fee rate
): { amountOut: bigint; priceImpact: number; effectivePrice: number } {
  const shares = BigInt(sharesIn)
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const yesReserve = typeof reserveYes === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveYes) * 1000000)) : BigInt(reserveYes)
  const noReserve = typeof reserveNo === 'string' ? 
    BigInt(Math.floor(parseFloat(reserveNo) * 1000000)) : BigInt(reserveNo)
  const k = yesReserve * noReserve
  
  let amountBeforeFee: bigint
  let newYesReserve: bigint
  let newNoReserve: bigint
  
  if (outcome === 'YES') {
    // Selling YES shares: add to YES reserve, remove from NO reserve
    newYesReserve = yesReserve + shares
    newNoReserve = k / newYesReserve
    amountBeforeFee = noReserve - newNoReserve
  } else {
    // Selling NO shares: add to NO reserve, remove from YES reserve
    newNoReserve = noReserve + shares
    newYesReserve = k / newNoReserve
    amountBeforeFee = yesReserve - newYesReserve
  }
  
  // Apply fee
  const feeAmount = (amountBeforeFee * BigInt(feeBps)) / 10000n
  const amountOut = amountBeforeFee - feeAmount
  
  // Calculate price impact
  const oldPrice = calculateSpotPrice(yesReserve, noReserve)
  const newPrice = calculateSpotPrice(newYesReserve, newNoReserve)
  const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100
  
  // Calculate effective price (amount received per share)
  const effectivePrice = Number(amountOut) / Number(shares)
  
  return { amountOut, priceImpact, effectivePrice }
}

/**
 * Calculate slippage for a trade
 */
export function calculateSlippage(
  expectedPrice: number,
  actualPrice: number
): number {
  return Math.abs((actualPrice - expectedPrice) / expectedPrice) * 100
}

/**
 * Format probability for display
 */
export function formatProbability(probability: number): string {
  return `${probability.toFixed(1)}%`
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price < 0.01) return '<$0.01'
  if (price < 1) return `$${price.toFixed(3)}`
  return `$${price.toFixed(2)}`
}

/**
 * Calculate payout for Parimutuel winner
 */
export function calculateParimutuelPayout(
  userStake: string | bigint,
  totalWinningPool: string | bigint,
  totalLosingPool: string | bigint,
  feeBps: number // Market-specific fee rate
): bigint {
  // Convert decimal values from indexer back to integer format (USDC has 6 decimals)
  const stake = typeof userStake === 'string' ? 
    BigInt(Math.floor(parseFloat(userStake) * 1000000)) : BigInt(userStake)
  const winningPool = typeof totalWinningPool === 'string' ? 
    BigInt(Math.floor(parseFloat(totalWinningPool) * 1000000)) : BigInt(totalWinningPool)
  const losingPool = typeof totalLosingPool === 'string' ? 
    BigInt(Math.floor(parseFloat(totalLosingPool) * 1000000)) : BigInt(totalLosingPool)
  
  if (winningPool === 0n) return 0n
  
  // User's share of losing pool
  const userShare = (stake * losingPool) / winningPool
  
  // Apply fee
  const feeAmount = (userShare * BigInt(feeBps)) / 10000n
  const profit = userShare - feeAmount
  
  // Return stake + profit
  return stake + profit
}

/**
 * Calculate CPMM initialization parameters
 */
export function calculateInitialReserves(
  liquidityAmount: string | bigint,
  initialProbability: number // 0-100
): { reserveYes: bigint; reserveNo: bigint } {
  const liquidity = BigInt(liquidityAmount)
  
  // Ensure probability is in valid range
  const prob = Math.max(1, Math.min(99, initialProbability))
  
  // Calculate reserves based on probability
  // probability = reserveNo / (reserveYes + reserveNo)
  // Let total = liquidity, then:
  // reserveNo = total * probability / 100
  // reserveYes = total * (100 - probability) / 100
  
  const reserveNo = (liquidity * BigInt(prob)) / 100n
  const reserveYes = liquidity - reserveNo
  
  return { reserveYes, reserveNo }
}

/**
 * Check if slippage is acceptable
 */
export function isSlippageAcceptable(
  actualSlippage: number,
  maxSlippage: number
): boolean {
  return actualSlippage <= maxSlippage
}

/**
 * Get market probability based on type
 */
export function getMarketProbability(market: {
  marketType?: string
  poolYes?: string
  poolNo?: string
  reserveYes?: string
  reserveNo?: string
}): number {
  const marketType = market.marketType || 'PARIMUTUEL'
  
  if (marketType === 'CPMM') {
    return calculateCPMMProbability(
      market.reserveYes || '0',
      market.reserveNo || '0'
    )
  }
  
  return calculateParimutuelProbability(
    market.poolYes || '0',
    market.poolNo || '0'
  )
}