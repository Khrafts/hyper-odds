import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi'
import { useWallet } from '@/hooks/useWallet'
import { parseUnits, formatUnits, Address } from 'viem'
import { getContractAddress, CONTRACTS, OUTCOME, ERC20_ABI } from '@/lib/web3/contracts'
import { useChainId } from 'wagmi'
import { useTradingStore, type Transaction } from '@/stores/useTradingStore'
import { useGasEstimation, type GasEstimates, type GasSpeed } from '@/lib/gas'

export interface TradingState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  txHash?: string
  stage?: 'approval' | 'deposit' | 'completed'
}

export function useTradingHooks(marketAddress?: Address) {
  const { address: userAddress, isConnected } = useWallet()
  const chainId = useChainId()
  
  // Use Zustand store for transaction state
  const {
    tradingState: storeState,
    startApproval,
    startDeposit,
    startClaim,
    completeTransaction,
    failTransaction,
    setOptimisticBalance,
    setOptimisticPools,
    clearOptimisticUpdates,
    getTransactionsByMarket,
    isTransactionPending,
  } = useTradingStore()
  
  // Gas estimation hook
  const {
    estimateApproval,
    estimateDeposit,
    estimateClaim,
    isLoading: isGasLoading,
    error: gasError,
    clearError: clearGasError,
  } = useGasEstimation()
  
  // Local state for backward compatibility
  const [tradingState, setTradingState] = useState<TradingState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  })
  
  // Gas estimation states
  const [gasEstimates, setGasEstimates] = useState<{
    approval?: GasEstimates
    deposit?: GasEstimates
    claim?: GasEstimates
  }>({})
  
  const [selectedGasSpeed, setSelectedGasSpeed] = useState<GasSpeed>('standard')

  // Get contract addresses
  const stakeTokenAddress = useMemo(() => {
    try {
      return getContractAddress(chainId as any, 'StakeToken')
    } catch {
      return undefined
    }
  }, [chainId])

  const routerAddress = useMemo(() => {
    try {
      return getContractAddress(chainId as any, 'UniversalRouter')
    } catch {
      return undefined
    }
  }, [chainId])

  // Contract write hooks
  const { writeContract, data: txHash, error: writeError, isPending: isWritePending } = useWriteContract()

  // Wait for transaction confirmation
  const { isLoading: isTxLoading, isSuccess: isTxSuccess, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  })


  // Get user's USDC balance and allowance
  const { data: contractData, refetch: refetchContractData } = useReadContracts({
    contracts: [
      // USDC balance
      {
        address: stakeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      // USDC allowance for router
      {
        address: stakeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: userAddress && routerAddress ? [userAddress, routerAddress] : undefined,
      },
      // Market pool info (pool[0] = NO, pool[1] = YES)
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'pool',
        args: [0], // NO pool
      },
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'pool',
        args: [1], // YES pool
      },
      // User stakes [NO, YES]
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'userInfo',
        args: userAddress ? [userAddress] : undefined,
      },
      // Market state
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'resolved',
      },
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'cutoffTime',
      },
      // User claimed status
      {
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'claimed',
        args: userAddress ? [userAddress] : undefined,
      },
    ],
    query: {
      enabled: Boolean(stakeTokenAddress && routerAddress && marketAddress && userAddress && isConnected),
      // DISABLED: Automatic refetching was causing excessive RPC calls
      // refetchInterval: 10000, // Refetch every 10 seconds
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnMount: false, // Disable refetch on mount
      refetchOnReconnect: false, // Disable refetch on reconnect
      // Prevent hydration mismatches
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000, // Keep in cache for 5 minutes
    },
  })

  // Parse contract data
  const { 
    usdcBalance, 
    usdcAllowance, 
    poolNo, 
    poolYes, 
    userStakes, 
    isResolved, 
    cutoffTime,
    hasClaimed 
  } = useMemo(() => {
    if (!contractData) {
      return {
        usdcBalance: 0n,
        usdcAllowance: 0n,
        poolNo: 0n,
        poolYes: 0n,
        userStakes: [0n, 0n] as const,
        isResolved: false,
        cutoffTime: 0n,
        hasClaimed: false,
      }
    }

    return {
      usdcBalance: contractData[0]?.result as bigint || 0n,
      usdcAllowance: contractData[1]?.result as bigint || 0n,
      poolNo: contractData[2]?.result as bigint || 0n,
      poolYes: contractData[3]?.result as bigint || 0n,
      userStakes: contractData[4]?.result as readonly [bigint, bigint] || [0n, 0n] as const,
      isResolved: contractData[5]?.result as boolean || false,
      cutoffTime: contractData[6]?.result as bigint || 0n,
      hasClaimed: contractData[7]?.result as boolean || false,
    }
  }, [contractData])

  // Approve USDC spending for Router
  const approveUSDC = useCallback(async (amount: string) => {
    if (!stakeTokenAddress || !routerAddress || !isConnected) {
      throw new Error('Contract not connected or user not authenticated')
    }

    try {
      // Start approval in store
      const txId = startApproval(marketAddress, amount)
      
      setTradingState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        stage: 'approval',
      })

      const amountInUSDC = parseUnits(amount, 6) // USDC has 6 decimals

      await writeContract({
        address: stakeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, amountInUSDC],
      })

    } catch (error) {
      failTransaction((error as Error).message)
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [stakeTokenAddress, routerAddress, marketAddress, isConnected, writeContract, startApproval, failTransaction])

  // Deposit function via Router
  const deposit = useCallback(async (outcome: 'YES' | 'NO', amount: string) => {
    if (!marketAddress || !isConnected || !userAddress) {
      throw new Error('Market not connected or user not authenticated')
    }

    if (!routerAddress) {
      throw new Error('Router contract not available')
    }

    try {
      // Start deposit in store
      const txId = startDeposit(marketAddress, outcome, amount)
      
      setTradingState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        stage: 'deposit',
      })

      const outcomeValue = outcome === 'YES' ? 1 : 0 // 0=NO, 1=YES as per contract
      const amountInUSDC = parseUnits(amount, 6) // USDC has 6 decimals

      // Use Universal Router contract for deposits (works with both PARIMUTUEL and CPMM)
      await writeContract({
        address: routerAddress,
        abi: CONTRACTS.UniversalRouter.abi,
        functionName: 'depositToMarket',
        args: [marketAddress, outcomeValue, amountInUSDC],
      })

    } catch (error) {
      failTransaction((error as Error).message)
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [marketAddress, isConnected, userAddress, routerAddress, writeContract, startDeposit, failTransaction])

  // Combined approve and deposit function
  const approveAndDeposit = useCallback(async (outcome: 'YES' | 'NO', amount: string) => {
    const amountInUSDC = parseUnits(amount, 6)
    
    // Check if approval is needed
    if (usdcAllowance < amountInUSDC) {
      await approveUSDC(amount)
      // The transaction state will be handled by the transaction effect
      // Once approved, the user can manually trigger deposit
      return { requiresSecondTx: true }
    } else {
      await deposit(outcome, amount)
      return { requiresSecondTx: false }
    }
  }, [usdcAllowance, approveUSDC, deposit])

  // Claim winnings function
  const claimWinnings = useCallback(async () => {
    if (!marketAddress || !isConnected || !userAddress) {
      throw new Error('Market not connected or user not authenticated')
    }

    try {
      // Start claim in store
      const txId = startClaim(marketAddress)
      
      setTradingState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      })

      await writeContract({
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'claim',
      })

    } catch (error) {
      failTransaction((error as Error).message)
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [marketAddress, isConnected, userAddress, writeContract, startClaim, failTransaction])

  // Update trading state based on transaction status
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // Complete transaction in store
      completeTransaction(txHash)
      
      setTradingState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        txHash: txHash,
        stage: 'completed',
      }))
      // Refetch contract data after successful transaction
      refetchContractData()
      
      // Note: GraphQL data refetch is handled by the parent component's onTransactionSuccess callback
    } else if (writeError || txError) {
      // Handle different types of errors
      const error = writeError || txError
      const isUserRejection = error?.message?.toLowerCase().includes('user rejected') || 
                              error?.message?.toLowerCase().includes('user denied') ||
                              error?.message?.toLowerCase().includes('user cancelled') ||
                              error?.name === 'UserRejectedRequestError'
      
      // Clean up error message - remove technical details
      let cleanErrorMessage = 'Transaction failed'
      if (isUserRejection) {
        cleanErrorMessage = 'Transaction cancelled by user'
      } else if (error?.message) {
        // Extract only the main error message, remove technical details
        const message = error.message
        if (message.includes('insufficient funds')) {
          cleanErrorMessage = 'Insufficient funds for transaction'
        } else if (message.includes('gas')) {
          cleanErrorMessage = 'Gas estimation failed. Please try again.'
        } else if (message.includes('network')) {
          cleanErrorMessage = 'Network error. Please check your connection.'
        } else {
          // Take only the first sentence/line before technical details
          const firstLine = message.split('\n')[0].split('.')[0]
          cleanErrorMessage = firstLine.length > 100 ? 'Transaction failed' : firstLine
        }
      }
      
      setTradingState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: new Error(cleanErrorMessage),
        txHash: txHash,
      }))
      
      // Clear the error from the store with clean message
      if (error) {
        failTransaction(cleanErrorMessage)
      }
    } else if (isWritePending || isTxLoading) {
      setTradingState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        txHash: txHash,
      }))
    }
  }, [isTxSuccess, isTxLoading, isWritePending, writeError, txError, txHash, completeTransaction, refetchContractData, failTransaction])

  // Helper to check if amount needs approval
  const needsApproval = useCallback((amount: string) => {
    const amountInUSDC = parseUnits(amount, 6)
    return usdcAllowance < amountInUSDC
  }, [usdcAllowance])

  // Gas estimation functions
  const updateApprovalGasEstimate = useCallback(async (amount: string) => {
    if (!stakeTokenAddress || !marketAddress || !amount) return
    
    try {
      clearGasError()
      const amountInUSDC = parseUnits(amount, 6)
      const estimates = await estimateApproval(stakeTokenAddress, marketAddress, amountInUSDC)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, approval: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate approval gas:', error)
    }
  }, [stakeTokenAddress, marketAddress, estimateApproval, clearGasError])

  const updateDepositGasEstimate = useCallback(async (outcome: 'YES' | 'NO', amount: string) => {
    if (!marketAddress || !amount) return
    
    try {
      clearGasError()
      const outcomeValue = outcome === 'YES' ? 1 : 0
      const amountInUSDC = parseUnits(amount, 6)
      const estimates = await estimateDeposit(marketAddress, outcomeValue, amountInUSDC)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, deposit: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate deposit gas:', error)
    }
  }, [marketAddress, estimateDeposit, clearGasError])

  const updateClaimGasEstimate = useCallback(async () => {
    if (!marketAddress) return
    
    try {
      clearGasError()
      const estimates = await estimateClaim(marketAddress)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, claim: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate claim gas:', error)
    }
  }, [marketAddress, estimateClaim, clearGasError])

  // Get current gas estimate for selected speed
  const getCurrentGasEstimate = useCallback((type: 'approval' | 'deposit' | 'claim') => {
    const estimates = gasEstimates[type]
    return estimates ? estimates[selectedGasSpeed] : null
  }, [gasEstimates, selectedGasSpeed])

  // Memoize the merged trading state to prevent setState during render
  const mergedTradingState = useMemo(() => {
    const baseState = { ...tradingState }
    
    // Only merge store state if it's for the current market
    if (storeState.currentTransaction?.marketId === marketAddress) {
      return {
        ...baseState,
        isLoading: storeState.isLoading,
        error: storeState.error ? new Error(storeState.error) : null,
        stage: storeState.stage,
      }
    }
    
    return baseState
  }, [tradingState, storeState, marketAddress])

  // Reset function to clear stuck states
  const resetTradingState = useCallback(() => {
    setTradingState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    })
    clearOptimisticUpdates()
  }, [clearOptimisticUpdates])

  return {
    // Actions
    deposit,
    approveUSDC,
    approveAndDeposit,
    claimWinnings,
    resetTradingState,
    
    // Gas estimation actions
    updateApprovalGasEstimate,
    updateDepositGasEstimate,
    updateClaimGasEstimate,
    getCurrentGasEstimate,
    setSelectedGasSpeed,
    
    // State (merged local and store state)
    tradingState: mergedTradingState,
    
    // Gas-related state
    gasEstimates,
    selectedGasSpeed,
    isGasLoading,
    gasError,
    clearGasError,
    
    // Store-specific data
    transactions: marketAddress ? getTransactionsByMarket(marketAddress) : [],
    isPending: marketAddress ? isTransactionPending(marketAddress) : false,
    
    // Data
    usdcBalance,
    usdcAllowance,
    poolNo,
    poolYes,
    userStakes,
    isResolved,
    cutoffTime,
    hasClaimed,
    
    // Utils
    needsApproval,
    refetchContractData,
    
    // Formatted data
    formattedBalance: formatUnits(usdcBalance, 6),
    formattedPoolNo: formatUnits(poolNo, 6),
    formattedPoolYes: formatUnits(poolYes, 6),
    formattedUserStakeNo: formatUnits(userStakes[0], 6),
    formattedUserStakeYes: formatUnits(userStakes[1], 6),
  }
}