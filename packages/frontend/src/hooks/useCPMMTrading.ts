/**
 * Trading hooks for CPMM markets
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useSimulateContract, useChainId } from 'wagmi'
import { parseEther, formatEther, Address, parseUnits } from 'viem'
import { useState, useCallback, useMemo } from 'react'
import { 
  CPMM_MARKET_ABI, 
  OUTCOME,
  UNIVERSAL_MARKET_ROUTER_ABI,
  getContractAddress,
  type Outcome 
} from '@/lib/web3/contracts'
import { calculateCPMMBuyShares, calculateCPMMSellAmount } from '@/lib/pricing'

/**
 * Hook for buying shares in CPMM markets via Universal Router
 */
export function useCPMMBuy(marketAddress: Address) {
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

  const buyShares = useCallback(async (
    outcome: Outcome,
    amountIn: string,
    minSharesOut?: string
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const amount = parseEther(amountIn)
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [marketAddress, outcome, amount],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to buy shares')
    } finally {
      setIsLoading(false)
    }
  }, [marketAddress, routerAddress, writeContract])

  const buyYes = useCallback((amountIn: string, minSharesOut?: string) => {
    return buyShares(OUTCOME.YES, amountIn, minSharesOut)
  }, [buyShares])

  const buyNo = useCallback((amountIn: string, minSharesOut?: string) => {
    return buyShares(OUTCOME.NO, amountIn, minSharesOut)
  }, [buyShares])

  return {
    buyShares,
    buyYes,
    buyNo,
    hash,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: isError || !!error,
    error,
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
      
      const shares = parseEther(sharesIn)
      const minAmount = minAmountOut ? parseEther(minAmountOut) : 0n
      
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
 * Hook for simulating CPMM trades
 */
export function useCPMMSimulation(
  marketAddress: Address,
  outcome: 'YES' | 'NO',
  amount: string
) {
  const marketState = useCPMMMarketState(marketAddress)
  
  const simulation = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return null
    }
    
    try {
      const result = calculateCPMMBuyShares(
        outcome,
        parseEther(amount),
        marketState.reserveYes,
        marketState.reserveNo
      )
      
      return {
        sharesOut: formatEther(result.sharesOut),
        priceImpact: result.priceImpact,
        effectivePrice: result.effectivePrice,
      }
    } catch {
      return null
    }
  }, [amount, outcome, marketState.reserveYes, marketState.reserveNo])
  
  return simulation
}

/**
 * Combined CPMM trading hook
 */
export function useCPMMTrading(
  marketAddress: Address,
  userAddress?: Address
) {
  const buy = useCPMMBuy(marketAddress)
  const sell = useCPMMSell(marketAddress)
  const claim = useCPMMClaim(marketAddress)
  const marketState = useCPMMMarketState(marketAddress)
  const position = useCPMMPosition(marketAddress, userAddress)

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
    
    // Loading states
    isLoadingMarket: marketState.isLoading,
    isLoadingPosition: position.isLoading,
    isProcessingBuy: buy.isLoading,
    isProcessingSell: sell.isLoading,
    isProcessingClaim: claim.isLoading,
    
    // Helpers
    canTrade,
    canSell,
  }
}