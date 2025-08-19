/**
 * Shared probability calculation utilities for consistent market probability display
 */

export interface MarketProbabilities {
  yesProb: number
  noProb: number
  yesDisplay: string
  noDisplay: string
}

/**
 * Calculate market probabilities with consistent rounding and formatting
 * @param poolYes - YES pool amount (as string or number)
 * @param poolNo - NO pool amount (as string or number)
 * @param decimalPlaces - Number of decimal places for display (default: 1)
 * @returns Consistent probability calculations and formatted display strings
 */
export function calculateMarketProbabilities(
  poolYes: string | number,
  poolNo: string | number,
  decimalPlaces: number = 1
): MarketProbabilities {
  // Parse pool values safely
  const yesPool = typeof poolYes === 'string' ? parseFloat(poolYes || '0') : poolYes
  const noPool = typeof poolNo === 'string' ? parseFloat(poolNo || '0') : poolNo
  const totalPool = yesPool + noPool
  
  // Handle edge case: empty pools
  if (totalPool === 0) {
    const fallbackDisplay = (50).toFixed(decimalPlaces)
    return {
      yesProb: 50,
      noProb: 50,
      yesDisplay: `${fallbackDisplay}%`,
      noDisplay: `${fallbackDisplay}%`
    }
  }
  
  // Calculate probabilities based on CPMM logic (larger pool = higher probability of that outcome)
  const yesProb = (yesPool / totalPool) * 100  // YES probability from YES pool ratio
  const noProb = (noPool / totalPool) * 100   // NO probability from NO pool ratio
  
  // Format with consistent decimal places
  const yesDisplay = `${yesProb.toFixed(decimalPlaces)}%`
  const noDisplay = `${noProb.toFixed(decimalPlaces)}%`
  
  return {
    yesProb,
    noProb,
    yesDisplay,
    noDisplay
  }
}

/**
 * Calculate probability from a single pool value and total
 * @param poolValue - The pool value for this outcome
 * @param totalPool - Total pool value
 * @param decimalPlaces - Number of decimal places for display (default: 1)
 * @returns Probability as number and formatted display string
 */
export function calculateSingleProbability(
  poolValue: string | number,
  totalPool: string | number,
  decimalPlaces: number = 1
): { prob: number; display: string } {
  const pool = typeof poolValue === 'string' ? parseFloat(poolValue || '0') : poolValue
  const total = typeof totalPool === 'string' ? parseFloat(totalPool || '0') : totalPool
  
  if (total === 0) {
    const fallbackDisplay = (50).toFixed(decimalPlaces)
    return {
      prob: 50,
      display: `${fallbackDisplay}%`
    }
  }
  
  const prob = (pool / total) * 100
  const display = `${prob.toFixed(decimalPlaces)}%`
  
  return { prob, display }
}

/**
 * Format a probability number as a percentage string
 * @param probability - Probability as a number (0-100)
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatProbability(probability: number, decimalPlaces: number = 1): string {
  return `${probability.toFixed(decimalPlaces)}%`
}

/**
 * Get probability color class for UI styling
 * @param probability - Probability as a number (0-100)
 * @param isYes - Whether this is for YES outcome
 * @returns Tailwind color class
 */
export function getProbabilityColorClass(probability: number, isYes: boolean): string {
  const baseClass = isYes ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  
  // Optional: Add intensity based on probability
  if (probability >= 80) {
    return isYes ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
  } else if (probability <= 20) {
    return isYes ? 'text-green-500 dark:text-green-500' : 'text-red-500 dark:text-red-500'
  }
  
  return baseClass
}