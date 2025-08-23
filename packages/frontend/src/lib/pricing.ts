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
  const yesAmount = BigInt(poolYes)
  const noAmount = BigInt(poolNo)
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
  const yesReserve = BigInt(reserveYes)
  const noReserve = BigInt(reserveNo)
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
  const yesReserve = BigInt(reserveYes)
  const noReserve = BigInt(reserveNo)
  
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
  feeBps: number = 300 // 3% default fee
): { sharesOut: bigint; priceImpact: number; effectivePrice: number } {
  const amount = BigInt(amountIn)
  const yesReserve = BigInt(reserveYes)
  const noReserve = BigInt(reserveNo)
  const k = yesReserve * noReserve
  
  // Apply fee
  const feeAmount = (amount * BigInt(feeBps)) / 10000n
  const amountAfterFee = amount - feeAmount
  
  let sharesOut: bigint
  let newYesReserve: bigint
  let newNoReserve: bigint
  
  if (outcome === 'YES') {
    // Buying YES shares: add to NO reserve, remove from YES reserve
    newNoReserve = noReserve + amountAfterFee
    newYesReserve = k / newNoReserve
    sharesOut = yesReserve - newYesReserve
  } else {
    // Buying NO shares: add to YES reserve, remove from NO reserve
    newYesReserve = yesReserve + amountAfterFee
    newNoReserve = k / newYesReserve
    sharesOut = noReserve - newNoReserve
  }
  
  // Calculate price impact
  const oldPrice = calculateSpotPrice(yesReserve, noReserve)
  const newPrice = calculateSpotPrice(newYesReserve, newNoReserve)
  const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100
  
  // Calculate effective price (amount paid per share)
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
  feeBps: number = 300 // 3% default fee
): { amountOut: bigint; priceImpact: number; effectivePrice: number } {
  const shares = BigInt(sharesIn)
  const yesReserve = BigInt(reserveYes)
  const noReserve = BigInt(reserveNo)
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
  feeBps: number = 500 // 5% default fee
): bigint {
  const stake = BigInt(userStake)
  const winningPool = BigInt(totalWinningPool)
  const losingPool = BigInt(totalLosingPool)
  
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