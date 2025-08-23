/**
 * Trading hooks for Parimutuel markets
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, Address } from 'viem'
import { useState, useCallback } from 'react'
import { 
  PARIMUTUEL_MARKET_ABI, 
  OUTCOME,
  type Outcome 
} from '@/lib/web3/contracts'

/**
 * Hook for depositing into Parimutuel market positions
 */
export function useParimutuelDeposit(marketAddress: Address) {
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
 * Hook for claiming winnings from a resolved Parimutuel market
 */
export function useParimutuelClaim(marketAddress: Address) {
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
 * Hook for reading Parimutuel market state
 */
export function useParimutuelMarketState(marketAddress: Address) {
  const { data: poolData } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'pool',
  })

  const { data: resolved } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'resolved',
  })

  const { data: winningOutcome } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'winningOutcome',
  })

  const { data: cutoffTime } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'cutoffTime',
  })

  const poolNo = poolData?.[0] || 0n
  const poolYes = poolData?.[1] || 0n
  const totalPool = poolNo + poolYes

  const yesProbability = totalPool > 0n 
    ? Number((poolYes * 100n) / totalPool)
    : 50

  const noProbability = 100 - yesProbability

  const isExpired = cutoffTime 
    ? BigInt(Math.floor(Date.now() / 1000)) > cutoffTime
    : false

  return {
    poolYes,
    poolNo,
    totalPool,
    resolved: resolved || false,
    winningOutcome: winningOutcome || 0,
    cutoffTime,
    yesProbability,
    noProbability,
    isExpired,
    isLoading: false,
  }
}

/**
 * Hook for reading user's Parimutuel position
 */
export function useParimutuelPosition(
  marketAddress: Address,
  userAddress?: Address
) {
  const { data: stakeData } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'stakeOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const { data: effectiveStakeData } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'userEffectiveStakes',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const { data: claimed } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'claimed',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const stakeNo = stakeData?.[0] || 0n
  const stakeYes = stakeData?.[1] || 0n
  const totalStake = stakeNo + stakeYes

  const effectiveStakeNo = effectiveStakeData?.[0] || 0n
  const effectiveStakeYes = effectiveStakeData?.[1] || 0n
  const totalEffectiveStake = effectiveStakeNo + effectiveStakeYes

  return {
    stakeNo,
    stakeYes,
    totalStake,
    effectiveStakeNo,
    effectiveStakeYes,
    totalEffectiveStake,
    claimed: claimed || false,
    hasPosition: totalStake > 0n,
    isLoading: false,
  }
}

/**
 * Combined Parimutuel trading hook
 */
export function useParimutuelTrading(
  marketAddress: Address,
  userAddress?: Address
) {
  const deposit = useParimutuelDeposit(marketAddress)
  const claim = useParimutuelClaim(marketAddress)
  const marketState = useParimutuelMarketState(marketAddress)
  const position = useParimutuelPosition(marketAddress, userAddress)

  // Helper to check if user can trade
  const canTrade = !marketState.resolved && !marketState.isExpired

  // Helper to check if user can claim
  const canClaim = marketState.resolved && 
                   position.hasPosition && 
                   !position.claimed

  return {
    // Trading functions
    ...deposit,
    claimWinnings: claim.claimWinnings,
    
    // State
    marketState,
    position,
    
    // Loading states
    isLoadingMarket: marketState.isLoading,
    isLoadingPosition: position.isLoading,
    isProcessingClaim: claim.isLoading,
    
    // Helpers
    canTrade,
    canClaim,
  }
}