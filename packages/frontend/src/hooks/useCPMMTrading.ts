/**
 * Trading hooks for CPMM markets
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useSimulateContract, useChainId, useAccount } from 'wagmi'
import { parseEther, formatEther, Address, parseUnits, formatUnits } from 'viem'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  CPMM_MARKET_ABI, 
  ERC20_ABI,
  OUTCOME,
  UNIVERSAL_MARKET_ROUTER_ABI,
  getContractAddress,
  type Outcome 
} from '@/lib/web3/contracts'
import { calculateCPMMBuyShares, calculateCPMMSellAmount } from '@/lib/pricing'

/**
 * Hook for buying shares in CPMM markets via Universal Router
 */
export function useCPMMBuy(marketAddress: Address, userAddress?: Address) {
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingApproval, setIsWaitingApproval] = useState(false)
  const [lastSuccessHash, setLastSuccessHash] = useState<`0x${string}` | undefined>()
  const [transactionType, setTransactionType] = useState<'approval' | 'buy' | null>(null)
  
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  
  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isReceiptError, 
    error: receiptError 
  } = useWaitForTransactionReceipt({ hash })

  const routerAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'UniversalRouter')
  }, [chainId])
  
  const stakeTokenAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'StakeToken') // StakeToken is USDC
  }, [chainId])

  // Get allowance for approval checking
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const buyShares = useCallback(async (
    outcome: Outcome,
    amountIn: string,
    minSharesOut?: string
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const amount = parseUnits(amountIn, 6) // USDC has 6 decimals
      
      // Check approval
      if (!allowance || allowance < amount) {
        console.log('Approval needed...')
        setTransactionType('approval')
        setIsWaitingApproval(true)

        await writeContract({
          address: stakeTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, amount * 2n], // Approve 2x for future transactions
        })

        return { needsApproval: true }
      }

      // Proceed with buy
      console.log('Proceeding with buy...')
      setTransactionType('buy')
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [marketAddress, outcome, amount],
      })
    } catch (err) {
      console.error('Buy failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to buy shares')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract, stakeTokenAddress, allowance])

  const buyYes = useCallback((amountIn: string, minSharesOut?: string) => {
    return buyShares(OUTCOME.YES, amountIn, minSharesOut)
  }, [buyShares])

  const buyNo = useCallback((amountIn: string, minSharesOut?: string) => {
    return buyShares(OUTCOME.NO, amountIn, minSharesOut)
  }, [buyShares])

  // Handle successful transactions
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('Transaction successful:', hash)
      setLastSuccessHash(hash)
      setIsWaitingApproval(false)
      setIsLoading(false)
      
      // Refetch allowance after approval
      if (transactionType === 'approval') {
        setTimeout(() => refetchAllowance(), 2000)
      }
    }
  }, [isSuccess, hash, transactionType, refetchAllowance])

  // Handle errors
  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError)
      setError(writeError.message)
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
    if (isReceiptError && receiptError) {
      console.error('Receipt error:', receiptError)
      setError(receiptError.message)
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
  }, [writeError, isReceiptError, receiptError])

  return {
    buyShares,
    buyYes,
    buyNo,
    hash,
    lastSuccessHash,
    isLoading: isLoading || isPending || isConfirming,
    isWaitingApproval,
    isSuccess,
    isApprovalSuccess: isSuccess && transactionType === 'approval',
    isTransactionSuccess: isSuccess && transactionType === 'buy',
    isError: isReceiptError || !!error,
    error,
    writeError,
    receiptError,
    reset,
  }
}

/**
 * Hook for selling shares in CPMM markets via Universal Router
 */
export function useCPMMSell(marketAddress: Address) {
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  const routerAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'UniversalRouter')
  }, [chainId])

  const sellShares = useCallback(async (
    outcome: Outcome,
    sharesIn: string,
    minAmountOut?: string
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const shares = parseUnits(sharesIn, 6) // USDC has 6 decimals
      const minAmount = minAmountOut ? parseUnits(minAmountOut, 6) : 0n
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'withdrawFromMarket',
        args: [marketAddress, outcome, shares, minAmount],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell shares')
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract])

  const sellYes = useCallback((sharesIn: string, minAmountOut?: string) => {
    return sellShares(OUTCOME.YES, sharesIn, minAmountOut)
  }, [sellShares])

  const sellNo = useCallback((sharesIn: string, minAmountOut?: string) => {
    return sellShares(OUTCOME.NO, sharesIn, minAmountOut)
  }, [sellShares])

  return {
    sellShares,
    sellYes,
    sellNo,
    hash,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: isError || !!error,
    error,
  }
}

/**
 * Hook for claiming winnings from resolved CPMM markets via Universal Router
 */
export function useCPMMClaim(marketAddress: Address) {
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  const routerAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'UniversalRouter')
  }, [chainId])

  const claimWinnings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'claimFromMarket',
        args: [marketAddress],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim winnings')
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract])

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
 * Hook for reading CPMM market state
 */
export function useCPMMMarketState(marketAddress: Address) {
  const { data: reserveYES } = useReadContract({
    address: marketAddress,
    abi: CPMM_MARKET_ABI,
    functionName: 'reserveYES',
  })

  const { data: reserveNO } = useReadContract({
    address: marketAddress,
    abi: CPMM_MARKET_ABI,
    functionName: 'reserveNO',
  })

  const { data: spotPrice } = useReadContract({
    address: marketAddress,
    abi: CPMM_MARKET_ABI,
    functionName: 'getSpotPrice',
  })

  const reserves = useMemo(() => ({
    yes: reserveYES || 0n,
    no: reserveNO || 0n,
    total: (reserveYES || 0n) + (reserveNO || 0n),
  }), [reserveYES, reserveNO])

  const probability = useMemo(() => {
    if (reserves.total === 0n) return { yes: 50, no: 50 }
    
    // CPMM probability = reserveNo / (reserveYes + reserveNo)
    const yesProb = Number((reserves.no * 100n) / reserves.total)
    return {
      yes: yesProb,
      no: 100 - yesProb,
    }
  }, [reserves])

  return {
    reserveYes: reserves.yes,
    reserveNo: reserves.no,
    totalReserves: reserves.total,
    spotPrice: spotPrice || 0n,
    yesProbability: probability.yes,
    noProbability: probability.no,
    isLoading: false,
  }
}

/**
 * Hook for reading user's CPMM position
 */
export function useCPMMPosition(
  marketAddress: Address,
  userAddress?: Address
) {
  const { data: sharesYES } = useReadContract({
    address: marketAddress,
    abi: CPMM_MARKET_ABI,
    functionName: 'sharesYES',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const { data: sharesNO } = useReadContract({
    address: marketAddress,
    abi: CPMM_MARKET_ABI,
    functionName: 'sharesNO',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const shares = useMemo(() => ({
    yes: sharesYES || 0n,
    no: sharesNO || 0n,
    total: (sharesYES || 0n) + (sharesNO || 0n),
  }), [sharesYES, sharesNO])

  return {
    sharesYes: shares.yes,
    sharesNo: shares.no,
    totalShares: shares.total,
    hasPosition: shares.total > 0n,
    isLoading: false,
  }
}

/**
 * Hook for reading user's USDC balance
 */
export function useUSDCBalance(userAddress?: Address) {
  const chainId = useChainId()
  const wagmiAccount = useAccount()
  const stakeTokenAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'StakeToken') // StakeToken is USDC
  }, [chainId])
  const routerAddress = useMemo(() => {
    return getContractAddress(chainId as any, 'UniversalRouter')
  }, [chainId])

  const { data: balance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress && wagmiAccount.isConnected ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && wagmiAccount.isConnected,
    },
  })

  const { data: allowance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && wagmiAccount.isConnected ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: !!userAddress && wagmiAccount.isConnected,
    },
  })

  return {
    balance: balance || 0n,
    allowance: allowance || 0n,
    isLoading: false,
  }
}

/**
 * Hook for simulating CPMM trades
 */
export function useCPMMSimulation(
  marketAddress: Address,
  outcome: 'YES' | 'NO',
  amount: string,
  feeBps: number = 300 // Default to 3% if not provided
) {
  const marketState = useCPMMMarketState(marketAddress)
  
  const simulation = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return null
    }
    
    try {
      const result = calculateCPMMBuyShares(
        outcome,
        parseUnits(amount, 6), // USDC has 6 decimals
        marketState.reserveYes,
        marketState.reserveNo,
        feeBps
      )
      
      return {
        sharesOut: formatUnits(result.sharesOut, 6),
        priceImpact: result.priceImpact,
        effectivePrice: result.effectivePrice,
      }
    } catch {
      return null
    }
  }, [amount, outcome, marketState.reserveYes, marketState.reserveNo, feeBps])
  
  return simulation
}

/**
 * Combined CPMM trading hook
 */
export function useCPMMTrading(
  marketAddress: Address,
  userAddress?: Address
) {
  const buy = useCPMMBuy(marketAddress, userAddress)
  const sell = useCPMMSell(marketAddress)
  const claim = useCPMMClaim(marketAddress)
  const marketState = useCPMMMarketState(marketAddress)
  const position = useCPMMPosition(marketAddress, userAddress)
  const usdcBalance = useUSDCBalance(userAddress)

  // Helper to check if user can trade
  const canTrade = marketState.totalReserves > 0n

  // Helper to check if user can sell
  const canSell = position.hasPosition

  return {
    // Trading functions
    buyShares: buy.buyShares,
    buyYes: buy.buyYes,
    buyNo: buy.buyNo,
    sellShares: sell.sellShares,
    sellYes: sell.sellYes,
    sellNo: sell.sellNo,
    claimWinnings: claim.claimWinnings,
    
    // State
    marketState,
    position,
    balance: usdcBalance.balance,
    allowance: usdcBalance.allowance,
    
    // Transaction hashes
    hash: buy.hash,
    lastSuccessHash: buy.lastSuccessHash,
    
    // Loading states
    isLoadingMarket: marketState.isLoading,
    isLoadingPosition: position.isLoading,
    isProcessingBuy: buy.isLoading,
    isProcessingSell: sell.isLoading,
    isProcessingClaim: claim.isLoading,
    isWaitingApproval: buy.isWaitingApproval,
    
    // Success states
    isSuccess: buy.isSuccess,
    isApprovalSuccess: buy.isApprovalSuccess,
    isTransactionSuccess: buy.isTransactionSuccess,
    
    // Error states
    isError: buy.isError,
    error: buy.error,
    writeError: buy.writeError,
    receiptError: buy.receiptError,
    
    // Actions
    reset: buy.reset,
    
    // Helpers
    canTrade,
    canSell,
  }
}