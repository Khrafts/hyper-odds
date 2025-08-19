import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, Address } from 'viem'
import { useState, useCallback } from 'react'
import { 
  PARIMUTUEL_MARKET_ABI, 
  getContractAddress,
  OUTCOME,
  type Outcome 
} from '@/lib/web3/contracts'

/**
 * Trading hook for depositing into market positions
 */
export function useDeposit(marketAddress: Address) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = useCallback(async (outcome: Outcome, amount: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const value = parseEther(amount)
      
      await writeContract({
        address: marketAddress,
        abi: PARIMUTUEL_MARKET_ABI,
        functionName: 'deposit',
        args: [outcome],
        value,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deposit')
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, writeContract])

  const depositYes = useCallback((amount: string) => {
    return deposit(OUTCOME.YES, amount)
  }, [deposit])

  const depositNo = useCallback((amount: string) => {
    return deposit(OUTCOME.NO, amount)
  }, [deposit])

  return {
    deposit,
    depositYes,
    depositNo,
    hash,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: isError || !!error,
    error,
  }
}

/**
 * Hook for claiming winnings from a resolved market
 */
export function useClaimWinnings(marketAddress: Address) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  const claimWinnings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await writeContract({
        address: marketAddress,
        abi: PARIMUTUEL_MARKET_ABI,
        functionName: 'claimWinnings',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim winnings')
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, writeContract])

  return {
    claimWinnings,
    hash,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: isError || !!error,
    error,
  }
}

/**
 * Hook for reading user's position in a market
 * DISABLED: This hook was causing excessive RPC calls
 * User position should be obtained from GraphQL/useTradingHooks instead
 */
export function useUserPosition(marketAddress: Address, userAddress?: Address) {
  return {
    position: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  }
}

/**
 * Hook for reading user's claimable amount
 * DISABLED: This hook was causing excessive RPC calls
 * Claimable amount should be calculated from GraphQL data instead
 */
export function useClaimableAmount(marketAddress: Address, userAddress?: Address) {
  return {
    claimableAmount: 0n,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  }
}

/**
 * Hook for reading market state
 * DISABLED: This hook was causing excessive RPC calls (7 separate useReadContract calls)
 * Market state should be obtained from GraphQL instead for better performance
 */
export function useMarketState(marketAddress: Address) {
  // Return static fallback data to prevent breaking existing usage
  // Users should migrate to using GraphQL data instead
  return {
    question: '',
    cutoffTime: 0n,
    resolved: false,
    winningOutcome: 0,
    poolYes: 0n,
    poolNo: 0n,
    totalPool: 0n,
    yesProbability: 50,
    noProbability: 50,
    isLoading: false,
    isExpired: false,
  }
}

/**
 * Combined trading hook with all functionality
 */
export function useMarketTrading(marketAddress: Address, userAddress?: Address) {
  const deposit = useDeposit(marketAddress)
  const claim = useClaimWinnings(marketAddress)
  const position = useUserPosition(marketAddress, userAddress)
  const claimableAmount = useClaimableAmount(marketAddress, userAddress)
  const marketState = useMarketState(marketAddress)

  // Helper to check if user can trade
  const canTrade = !marketState.resolved && !marketState.isExpired

  // Helper to check if user can claim
  const canClaim = marketState.resolved && 
                   position.position && 
                   !position.position.claimed && 
                   claimableAmount.claimableAmount > 0n

  return {
    // Trading functions
    ...deposit,
    claimWinnings: claim.claimWinnings,
    
    // State
    marketState,
    position: position.position,
    claimableAmount: claimableAmount.claimableAmount,
    
    // Loading states
    isLoadingMarket: marketState.isLoading,
    isLoadingPosition: position.isLoading,
    isLoadingClaim: claimableAmount.isLoading,
    isProcessingClaim: claim.isLoading,
    
    // Helpers
    canTrade,
    canClaim,
    
    // Refetch functions
    refetchPosition: position.refetch,
    refetchClaimable: claimableAmount.refetch,
  }
}

/**
 * Type definitions
 */
export interface UserPosition {
  stakeYes: bigint
  stakeNo: bigint
  totalStake: bigint
  effectiveStakeYes: bigint
  effectiveStakeNo: bigint
  totalEffectiveStake: bigint
  claimed: boolean
  payout: bigint
  profit: bigint
}

export interface MarketState {
  question: string
  cutoffTime: bigint
  resolved: boolean
  winningOutcome: number
  poolYes: bigint
  poolNo: bigint
  totalPool: bigint
  yesProbability: number
  noProbability: number
  isLoading: boolean
  isExpired: boolean
}