import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(
  value: number | string,
  options: Intl.NumberFormatOptions = {}
) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numValue)
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number | string,
  options: Intl.NumberFormatOptions = {}
) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(numValue)
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: number | string,
  options: Intl.NumberFormatOptions = {}
) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
    ...options,
  }).format(numValue / 100)
}

/**
 * Format a time duration in human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }
  
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`
  }
  
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`
  }
  
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * Format a date in relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  }
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  
  if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  }
  
  if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  }
  
  if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  }
  
  return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month')
}

/**
 * Format an address for display (truncate middle)
 */
export function formatAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address || address.length <= startLength + endLength) {
    return address
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Calculate probability from pool sizes
 */
export function calculateProbability(poolYes: string | number, poolNo: string | number): number {
  const yes = typeof poolYes === 'string' ? parseFloat(poolYes) : poolYes
  const no = typeof poolNo === 'string' ? parseFloat(poolNo) : poolNo
  
  if (yes + no === 0) return 0.5 // 50% when no bets
  
  return yes / (yes + no)
}

/**
 * Calculate potential payout for a bet
 */
export function calculatePayout(
  betAmount: number,
  poolYes: number,
  poolNo: number,
  bettingOn: 'YES' | 'NO'
): number {
  const userPool = bettingOn === 'YES' ? poolYes + betAmount : poolNo + betAmount
  const oppositePool = bettingOn === 'YES' ? poolNo : poolYes
  
  if (oppositePool === 0) return betAmount // No opposite bets, just return bet
  
  // Return bet amount plus proportional share of opposite pool
  return betAmount + (betAmount / userPool) * oppositePool
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}