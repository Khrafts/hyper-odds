import { useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useMarketFactoryConfig } from '@/lib/contracts/config'
import { MarketParams, MarketCreationResult, TransactionStatus } from '@/lib/contracts/types'

/**
 * Hook for interacting with MarketFactory contract
 */
export function useMarketFactory() {
  const { address, isConnected } = useAccount()
  const factoryConfig = useMarketFactoryConfig()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  /**
   * Get the stake required to create a market (1000 stHYPE)
   */
  const getStakeRequired = useMemo(() => {
    return parseEther('1000') // 1000 stHYPE per market
  }, [])

  /**
   * Create a new market
   */
  const createMarket = async (params: MarketParams): Promise<void> => {
    if (!factoryConfig || !address) {
      throw new Error('Wallet not connected or contract not available')
    }

    // Execute transaction using wagmi's writeContract
    writeContract({
      address: factoryConfig.address,
      abi: factoryConfig.abi,
      functionName: 'createMarket',
      args: [params],
    })
  }

  return {
    // State
    isConnected,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
    
    // Constants
    stakeRequired: getStakeRequired,
    
    // Functions
    createMarket,
  }
}

/**
 * Hook for market creation cost calculation
 */
export function useMarketCreationCost() {
  const stakeRequired = parseEther('1000') // 1000 stHYPE
  
  return {
    stakeRequired,
    stakeRequiredFormatted: formatEther(stakeRequired),
    currency: 'stHYPE',
  }
}