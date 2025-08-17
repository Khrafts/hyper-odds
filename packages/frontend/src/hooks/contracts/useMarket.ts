import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatEther, parseEther, Address } from 'viem'
import { useMarketConfig } from '@/lib/contracts/config'
import { 
  ContractPosition, 
  ContractMarketState, 
  DepositParams,
  TransactionResult 
} from '@/lib/contracts/types'

/**
 * Hook for interacting with individual Market contracts
 */
export function useMarket(marketAddress: Address) {
  const { address, isConnected } = useAccount()
  const marketConfig = useMarketConfig(marketAddress)
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read market state using useReadContract
  const { data: pool } = useReadContract({
    ...marketConfig,
    functionName: 'pool',
  })

  const { data: resolved } = useReadContract({
    ...marketConfig,
    functionName: 'resolved',
  })

  const { data: winningOutcome } = useReadContract({
    ...marketConfig,
    functionName: 'winningOutcome',
  })

  /**
   * Deposit tokens into YES or NO position
   */
  const deposit = async (params: DepositParams): Promise<void> => {
    if (!marketConfig || !address) {
      throw new Error('Wallet not connected or contract not available')
    }

    writeContract({
      address: marketConfig.address,
      abi: marketConfig.abi,
      functionName: 'deposit',
      args: [params.outcome, params.amount],
    })
  }

  /**
   * Claim winnings from resolved market
   */
  const claim = async (): Promise<void> => {
    if (!marketConfig || !address) {
      throw new Error('Wallet not connected or contract not available')
    }

    writeContract({
      address: marketConfig.address,
      abi: marketConfig.abi,
      functionName: 'claim',
      args: [],
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
    marketAddress,
    
    // Contract data
    pool,
    resolved,
    winningOutcome,
    
    // Write functions
    deposit,
    claim,
  }
}

/**
 * Hook for market data with automatic updates
 */
export function useMarketData(marketAddress: Address, autoRefresh = false) {
  const market = useMarket(marketAddress)
  
  // TODO: Add SWR or React Query for automatic data fetching
  // For now, consumers need to manually call the functions
  
  return market
}