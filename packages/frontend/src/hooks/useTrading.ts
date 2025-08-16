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
 */
export function useUserPosition(marketAddress: Address, userAddress?: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'getPosition',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    position: data ? {
      stakeYes: data[0],
      stakeNo: data[1], 
      totalStake: data[2],
      effectiveStakeYes: data[3],
      effectiveStakeNo: data[4],
      totalEffectiveStake: data[5],
      claimed: data[6],
      payout: data[7],
      profit: data[8],
    } : null,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for reading user's claimable amount
 */
export function useClaimableAmount(marketAddress: Address, userAddress?: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'getClaimableAmount',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    claimableAmount: data || 0n,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for reading market state
 */
export function useMarketState(marketAddress: Address) {
  const { data: question, isLoading: questionLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'question',
  })

  const { data: cutoffTime, isLoading: cutoffLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'cutoffTime',
  })

  const { data: resolved, isLoading: resolvedLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'resolved',
  })

  const { data: winningOutcome, isLoading: outcomeLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'winningOutcome',
  })

  const { data: poolYes, isLoading: poolYesLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'poolYes',
  })

  const { data: poolNo, isLoading: poolNoLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'poolNo',
  })

  const { data: totalPool, isLoading: totalPoolLoading } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'totalPool',
  })

  const isLoading = questionLoading || cutoffLoading || resolvedLoading || 
                   outcomeLoading || poolYesLoading || poolNoLoading || totalPoolLoading

  // Calculate probabilities
  const poolYesNum = poolYes ? Number(poolYes) : 0
  const poolNoNum = poolNo ? Number(poolNo) : 0
  const totalPoolNum = poolYesNum + poolNoNum
  
  const yesProbability = totalPoolNum > 0 ? (poolYesNum / totalPoolNum) * 100 : 50
  const noProbability = totalPoolNum > 0 ? (poolNoNum / totalPoolNum) * 100 : 50

  return {
    question: question || '',
    cutoffTime: cutoffTime || 0n,
    resolved: resolved || false,
    winningOutcome: winningOutcome || 0,
    poolYes: poolYes || 0n,
    poolNo: poolNo || 0n,
    totalPool: totalPool || 0n,
    yesProbability,
    noProbability,
    isLoading,
    isExpired: cutoffTime ? Date.now() / 1000 > Number(cutoffTime) : false,
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