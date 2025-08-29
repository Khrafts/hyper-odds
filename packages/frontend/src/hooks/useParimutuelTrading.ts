/**
 * Trading hooks for Parimutuel markets
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useAccount } from 'wagmi'
import { parseEther, parseUnits, formatUnits, Address } from 'viem'
import React, { useState, useCallback, useMemo } from 'react'
import { 
  PARIMUTUEL_MARKET_ABI, 
  OUTCOME,
  UNIVERSAL_MARKET_ROUTER_ABI,
  ERC20_ABI,
  getContractAddress,
  type Outcome 
} from '@/lib/web3/contracts'

/**
 * Hook for depositing into Parimutuel market positions
 */
export function useParimutuelDeposit(marketAddress: Address, userAddress?: Address) {
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingApproval, setIsWaitingApproval] = useState(false)
  const [lastSuccessHash, setLastSuccessHash] = useState<`0x${string}` | undefined>()
  const [transactionType, setTransactionType] = useState<'approval' | 'deposit' | null>(null)
  
  // Get wagmi account info for debugging
  const wagmiAccount = useAccount()
  
  // Debug logging for initialization
  React.useEffect(() => {
    console.log('=== Parimutuel Hook Initialization ===')
    console.log('Chain ID:', chainId)
    console.log('Market Address:', marketAddress)
    console.log('User Address (passed):', userAddress)
    console.log('Wagmi Account:', wagmiAccount.address)
    console.log('Wagmi Connected:', wagmiAccount.isConnected)
  }, [chainId, marketAddress, userAddress, wagmiAccount])
  
  const { writeContract, data: hash, isPending, reset, error: writeError } = useWriteContract()
  
  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isReceiptError, 
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Transaction success is based on the type
  const isApprovalSuccess = isSuccess && transactionType === 'approval'
  const isDepositSuccess = isSuccess && transactionType === 'deposit'

  const routerAddress = useMemo(() => {
    try {
      const addr = getContractAddress(chainId as any, 'UniversalRouter' as any)
      console.log('Router Address resolved:', addr)
      return addr
    } catch (error) {
      console.error('Failed to get router address:', error)
      throw error
    }
  }, [chainId])

  const stakeTokenAddress = useMemo(() => {
    try {
      const addr = getContractAddress(chainId as any, 'StakeToken')
      console.log('Stake Token Address resolved:', addr)
      return addr
    } catch (error) {
      console.error('Failed to get stake token address:', error)
      throw error
    }
  }, [chainId])

  // Check USDC allowance for router
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 1000, // Consider allowance stale after 1 second
    },
  })

  // Check USDC balance
  const { data: balance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  // Approve USDC spending for Router
  const approveToken = useCallback(async (amount: string) => {
    try {
      setIsWaitingApproval(true)
      setError(null)
      setTransactionType('approval')
      reset() // Reset previous transaction state
      
      const amountBigInt = parseUnits(amount, 6)
      
      await writeContract({
        address: stakeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, amountBigInt],
      })
    } catch (err) {
      // Handle different types of errors
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('denied')) {
          setError('Transaction rejected by user')
        } else if (err.message.includes('insufficient funds')) {
          setError('Insufficient funds for gas')
        } else {
          setError(`Approval failed: ${err.message}`)
        }
      } else {
        setError('Failed to approve token')
      }
      setIsWaitingApproval(false) // Clear on error
      throw err
    }
  }, [stakeTokenAddress, routerAddress, writeContract, reset])

  const deposit = useCallback(async (outcome: Outcome, amount: string) => {
    try {
      setIsLoading(true)
      setError(null)
      reset() // Reset previous transaction state
      
      console.log('=== Parimutuel Deposit Debug ===')
      console.log('Chain ID:', chainId)
      console.log('Market Address:', marketAddress)
      console.log('Router Address:', routerAddress)
      console.log('Stake Token Address:', stakeTokenAddress)
      console.log('User Address:', userAddress)
      console.log('Outcome:', outcome)
      console.log('Amount (string):', amount)
      
      // Validate addresses
      if (!marketAddress || marketAddress === '0x0') {
        throw new Error('Invalid market address')
      }
      
      if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid router address - router not deployed on this network')
      }
      
      if (!userAddress) {
        throw new Error('User address is required for transactions')
      }
      
      // Additional wagmi validation
      if (!wagmiAccount.isConnected) {
        throw new Error('Wagmi wallet not connected - check wallet connection')
      }
      
      if (wagmiAccount.address !== userAddress) {
        console.warn('Address mismatch:', {
          passed: userAddress,
          wagmi: wagmiAccount.address
        })
        throw new Error('Wallet address mismatch - please reconnect wallet')
      }
      
      // Check if amount is valid
      const amountBigInt = parseUnits(amount, 6) // USDC has 6 decimals
      console.log('Amount (BigInt):', amountBigInt.toString())
      console.log('Current allowance:', allowance?.toString())
      console.log('User balance:', balance?.toString())
      
      if (amountBigInt <= 0n) {
        throw new Error('Amount must be greater than 0')
      }
      
      // Check balance
      if (balance && balance < amountBigInt) {
        throw new Error(`Insufficient balance. You have ${formatUnits(balance, 6)} USDC but need ${amount} USDC`)
      }
      
      // TODO: Add market state validation here
      // We should check if market is expired, resolved, or paused
      // For now, we'll rely on the contract to revert with a reason
      
      // Check if approval is needed first
      if (allowance && allowance < amountBigInt) {
        console.log('Approval needed, requesting approval...')
        console.log('Current allowance:', allowance.toString())
        console.log('Required amount:', amountBigInt.toString())
        setTransactionType('approval')
        setIsWaitingApproval(true)
        
        // Request approval for the exact amount (or slightly more for gas optimization)
        const approvalAmount = amountBigInt * 2n // Approve double to reduce future approvals
        await writeContract({
          address: stakeTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, approvalAmount],
        })
        
        // Return indication that we need to wait for approval
        return { needsApproval: true }
      }
      
      // Proceed with deposit - ensure outcome is passed as uint8
      console.log('Proceeding with deposit...')
      console.log('Deposit params:', {
        router: routerAddress,
        market: marketAddress,
        outcome: outcome as number,
        amount: amountBigInt.toString()
      })
      
      setTransactionType('deposit')
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [marketAddress, outcome as number, amountBigInt],
      })
      
      console.log('Deposit transaction submitted successfully')
      return { needsApproval: false }
    } catch (err) {
      console.error('=== Deposit Error ===')
      console.error('Error object:', err)
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error')
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack')
      
      // Enhanced error handling with more specific wagmi/viem errors
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('denied') || err.message.includes('rejected')) {
          setError('Transaction rejected by user')
        } else if (err.message.includes('insufficient funds')) {
          setError('Insufficient funds for transaction')
        } else if (err.message.includes('execution reverted')) {
          // Try to extract revert reason
          const revertMatch = err.message.match(/execution reverted(?:: (.+))?/)
          const revertReason = revertMatch?.[1] || 'Contract execution failed'
          setError(`Transaction failed: ${revertReason}`)
        } else if (err.message.includes('gas required exceeds allowance')) {
          setError('Transaction failed: Insufficient gas limit')
        } else if (err.message.includes('nonce too low')) {
          setError('Transaction failed: Nonce too low. Please try again.')
        } else {
          setError(`Transaction failed: ${err.message}`)
        }
      } else {
        setError('Failed to deposit')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract, allowance, stakeTokenAddress, reset, chainId, userAddress, wagmiAccount])

  // Continue deposit after approval is confirmed
  const continueAfterApproval = useCallback(async (outcome: Outcome, amount: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setTransactionType('deposit')
      setIsWaitingApproval(false) // Clear approval waiting state
      reset()
      
      const amountBigInt = parseUnits(amount, 6)
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [marketAddress, outcome as number, amountBigInt],
      })
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('denied') || err.message.includes('rejected')) {
          setError('Transaction rejected by user')
        } else if (err.message.includes('execution reverted')) {
          // Try to extract revert reason
          const revertMatch = err.message.match(/execution reverted(?:: (.+))?/)
          const revertReason = revertMatch?.[1] || 'Contract execution failed'
          setError(`Deposit failed: ${revertReason}`)
        } else {
          setError(`Deposit failed: ${err.message}`)
        }
      } else {
        setError('Failed to deposit')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract, reset])

  const depositYes = useCallback((amount: string) => {
    return deposit(OUTCOME.YES, amount)
  }, [deposit])

  const depositNo = useCallback((amount: string) => {
    return deposit(OUTCOME.NO, amount)
  }, [deposit])

  // Track success state and clear it on next transaction
  const isTransactionSuccess = isDepositSuccess
  
  // Handle success side effects
  React.useEffect(() => {
    if (isSuccess && hash) {
      setLastSuccessHash(hash)
      setError(null) // Clear any previous errors on success
      // Reset form state will be handled by the UI component
    }
  }, [isSuccess, hash])

  // Handle successful approval - refresh allowance and proceed with deposit
  React.useEffect(() => {
    if (isApprovalSuccess && transactionType === 'approval') {
      console.log('=== Approval confirmed, refreshing allowance and proceeding with deposit ===')
      setIsWaitingApproval(false)
      // Refresh the allowance data
      refetchAllowance()
      // Note: The UI will handle continuing with the deposit via continueAfterApproval
    }
  }, [isApprovalSuccess, transactionType, refetchAllowance])

  // Handle transaction errors from wagmi
  React.useEffect(() => {
    if (writeError) {
      console.error('=== Wagmi Write Error ===')
      console.error('Write error object:', writeError)
      console.error('Write error message:', writeError.message)
      console.error('Write error details:', writeError.cause)
      
      if (writeError.message.includes('User rejected') || 
          writeError.message.includes('denied') || 
          writeError.message.includes('rejected')) {
        setError('Transaction rejected by user')
      } else if (writeError.message.includes('insufficient funds')) {
        setError('Insufficient funds for transaction')
      } else if (writeError.message.includes('execution reverted')) {
        // Try to extract revert reason
        const revertMatch = writeError.message.match(/execution reverted(?:: (.+))?/)
        const revertReason = revertMatch?.[1] || 'Contract execution failed'
        setError(`Transaction failed: ${revertReason}`)
      } else {
        setError(`Transaction failed: ${writeError.message}`)
      }
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
  }, [writeError])

  // Handle receipt errors from wagmi
  React.useEffect(() => {
    if (isReceiptError && receiptError) {
      console.error('=== Wagmi Receipt Error ===')
      console.error('Receipt error object:', receiptError)
      console.error('Receipt error message:', receiptError.message)
      
      // Decode common contract errors
      let errorMessage = 'Transaction failed: Contract execution reverted'
      
      if (receiptError.message.includes('execution reverted')) {
        // Check for common Parimutuel market errors
        if (receiptError.message.includes('Deposits closed') || receiptError.message.includes('cutoff')) {
          errorMessage = 'Market has expired - deposits are no longer accepted'
        } else if (receiptError.message.includes('Already resolved')) {
          errorMessage = 'Market has already been resolved'
        } else if (receiptError.message.includes('Invalid outcome')) {
          errorMessage = 'Invalid betting outcome selected'
        } else if (receiptError.message.includes('Zero amount')) {
          errorMessage = 'Bet amount must be greater than zero'
        } else if (receiptError.message.includes('Paused')) {
          errorMessage = 'Market is currently paused'
        } else if (receiptError.message.includes('Unknown market type')) {
          errorMessage = 'This market type is not supported by the router'
        } else if (receiptError.message.includes('SafeERC20FailedOperation')) {
          errorMessage = 'Token transfer failed - check your balance and approvals'
        } else {
          // Default to showing the raw error if we can't decode it
          errorMessage = `Contract error: ${receiptError.message}`
        }
      }
      
      setError(errorMessage)
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
  }, [isReceiptError, receiptError])

  return {
    deposit,
    depositYes,
    depositNo,
    approveToken,
    continueAfterApproval,
    allowance: allowance || 0n,
    balance: balance || 0n,
    
    // Transaction hashes
    hash,
    lastSuccessHash,
    
    // Loading states  
    isLoading: isLoading || isPending || isConfirming,
    isWaitingApproval: isWaitingApproval || (isConfirming && transactionType === 'approval'),
    
    // Success states
    isSuccess: isDepositSuccess,
    isApprovalSuccess,
    isTransactionSuccess,
    
    // Error states
    isError: isReceiptError || !!writeError || !!error,
    receiptError,
    writeError,
    error,
    
    // Utilities
    reset: () => {
      reset()
      setError(null)
      setLastSuccessHash(undefined)
      setTransactionType(null)
    }
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
  const deposit = useParimutuelDeposit(marketAddress, userAddress)
  const claim = useParimutuelClaim(marketAddress)
  const marketState = useParimutuelMarketState(marketAddress)
  const position = useParimutuelPosition(marketAddress, userAddress)

  // Helper to check if user can trade
  const canTrade = !marketState.resolved && !marketState.isExpired

  // Helper to check if user can claim
  const canClaim = marketState.resolved && 
                   position.hasPosition && 
                   !position.claimed

  // Enhanced deposit functions that check market state
  const depositWithValidation = React.useCallback(async (outcome: any, amount: string) => {
    // Pre-transaction validation
    if (marketState.resolved) {
      throw new Error('Cannot trade on resolved market')
    }
    if (marketState.isExpired) {
      throw new Error('Market has expired - trading period has ended')
    }
    
    return deposit.deposit(outcome, amount)
  }, [deposit.deposit, marketState.resolved, marketState.isExpired])

  const depositYesWithValidation = React.useCallback((amount: string) => {
    return depositWithValidation(OUTCOME.YES, amount)
  }, [depositWithValidation])

  const depositNoWithValidation = React.useCallback((amount: string) => {
    return depositWithValidation(OUTCOME.NO, amount)
  }, [depositWithValidation])

  return {
    // Trading functions with validation
    ...deposit,
    deposit: depositWithValidation,
    depositYes: depositYesWithValidation,
    depositNo: depositNoWithValidation,
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