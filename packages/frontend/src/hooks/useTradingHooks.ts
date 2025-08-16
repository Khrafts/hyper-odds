import { useState, useCallback, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import { getContractAddress, CONTRACTS, OUTCOME, ERC20_ABI } from '@/lib/web3/contracts'
import { useChainId } from 'wagmi'

export interface TradingState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  txHash?: string
  stage?: 'approval' | 'deposit' | 'completed'
}

export function useTradingHooks(marketAddress?: Address) {
  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const [tradingState, setTradingState] = useState<TradingState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  })

  // Get contract addresses
  const stakeTokenAddress = useMemo(() => {
    try {
      return getContractAddress(chainId as any, 'StakeToken')
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
      // USDC allowance for market
      {
        address: stakeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: userAddress && marketAddress ? [userAddress, marketAddress] : undefined,
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
      enabled: Boolean(stakeTokenAddress && marketAddress && userAddress && isConnected),
      refetchInterval: 10000, // Refetch every 10 seconds
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

  // Approve USDC spending
  const approveUSDC = useCallback(async (amount: string) => {
    if (!stakeTokenAddress || !marketAddress || !isConnected) {
      throw new Error('Contract not connected or user not authenticated')
    }

    try {
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
        args: [marketAddress, amountInUSDC],
      })

    } catch (error) {
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [stakeTokenAddress, marketAddress, isConnected, writeContract])

  // Deposit function
  const deposit = useCallback(async (outcome: 'YES' | 'NO', amount: string) => {
    if (!marketAddress || !isConnected || !userAddress) {
      throw new Error('Market not connected or user not authenticated')
    }

    try {
      setTradingState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        stage: 'deposit',
      })

      const outcomeValue = outcome === 'YES' ? 1 : 0 // 0=NO, 1=YES as per contract
      const amountInUSDC = parseUnits(amount, 6) // USDC has 6 decimals

      await writeContract({
        address: marketAddress,
        abi: CONTRACTS.ParimutuelMarket.abi,
        functionName: 'deposit',
        args: [outcomeValue, amountInUSDC],
      })

    } catch (error) {
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [marketAddress, isConnected, userAddress, writeContract])

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
      setTradingState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
      })
      throw error
    }
  }, [marketAddress, isConnected, userAddress, writeContract])

  // Update trading state based on transaction status
  useMemo(() => {
    if (isTxSuccess) {
      setTradingState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        txHash: txHash,
        stage: 'completed',
      }))
      // Refetch data after successful transaction
      refetchContractData()
    } else if (writeError || txError) {
      setTradingState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: writeError || txError || new Error('Transaction failed'),
        txHash: txHash,
      }))
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
  }, [isTxSuccess, isTxLoading, isWritePending, writeError, txError, txHash, refetchContractData])

  // Helper to check if amount needs approval
  const needsApproval = useCallback((amount: string) => {
    const amountInUSDC = parseUnits(amount, 6)
    return usdcAllowance < amountInUSDC
  }, [usdcAllowance])

  return {
    // Actions
    deposit,
    approveUSDC,
    approveAndDeposit,
    claimWinnings,
    
    // State
    tradingState,
    
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