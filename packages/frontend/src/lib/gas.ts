'use client'

import { parseUnits, formatUnits, type Address } from 'viem'
import { usePublicClient, useAccount } from 'wagmi'
import { useState, useCallback, useMemo } from 'react'
import { CONTRACTS, ERC20_ABI, getContractAddress } from '@/lib/web3/contracts'

// Gas estimation constants
export const GAS_CONSTANTS = {
  // Base gas limits for different operations
  ERC20_APPROVAL: 50000n,
  ERC20_TRANSFER: 25000n,
  MARKET_DEPOSIT: 80000n,
  MARKET_CLAIM: 70000n,
  
  // Gas price multipliers for different speeds
  MULTIPLIERS: {
    slow: 1.0,
    standard: 1.2,
    fast: 1.5,
    instant: 2.0,
  },
  
  // Buffer for gas limit estimation (20% buffer)
  GAS_LIMIT_BUFFER: 0.2,
} as const

export type GasSpeed = keyof typeof GAS_CONSTANTS.MULTIPLIERS

export interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  totalCost: bigint
  totalCostFormatted: string
  isEIP1559: boolean
  speed: GasSpeed
}

export interface GasEstimates {
  slow: GasEstimate
  standard: GasEstimate
  fast: GasEstimate
  instant: GasEstimate
}

// Utility to format gas prices
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = formatUnits(gasPrice, 9)
  return `${parseFloat(gwei).toFixed(2)} Gwei`
}

// Utility to format ETH amounts
export function formatEthAmount(amount: bigint): string {
  const eth = formatUnits(amount, 18)
  const ethNumber = parseFloat(eth)
  
  if (ethNumber < 0.0001) {
    return '<0.0001 ETH'
  } else if (ethNumber < 0.01) {
    return `${ethNumber.toFixed(6)} ETH`
  } else {
    return `${ethNumber.toFixed(4)} ETH`
  }
}

// Get current gas prices from the network
export async function getCurrentGasPrices(publicClient: any): Promise<{
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  isEIP1559: boolean
}> {
  try {
    // Try to get EIP-1559 gas prices first
    const [gasPrice, feeData] = await Promise.allSettled([
      publicClient.getGasPrice(),
      publicClient.estimateFeesPerGas?.(),
    ])

    if (feeData.status === 'fulfilled' && feeData.value) {
      return {
        gasPrice: gasPrice.status === 'fulfilled' ? gasPrice.value : 0n,
        maxFeePerGas: feeData.value.maxFeePerGas,
        maxPriorityFeePerGas: feeData.value.maxPriorityFeePerGas,
        isEIP1559: true,
      }
    } else if (gasPrice.status === 'fulfilled') {
      return {
        gasPrice: gasPrice.value,
        isEIP1559: false,
      }
    }
  } catch (error) {
    console.warn('Failed to get gas prices:', error)
  }
  
  // Fallback gas price (20 Gwei)
  return {
    gasPrice: parseUnits('20', 9),
    isEIP1559: false,
  }
}

// Estimate gas for ERC20 approval
export async function estimateApprovalGas(
  publicClient: any,
  userAddress: Address,
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint
): Promise<bigint> {
  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
      account: userAddress,
    })
    
    // Add buffer
    return gasEstimate + BigInt(Math.floor(Number(gasEstimate) * GAS_CONSTANTS.GAS_LIMIT_BUFFER))
  } catch (error) {
    console.warn('Failed to estimate approval gas:', error)
    return GAS_CONSTANTS.ERC20_APPROVAL
  }
}

// Estimate gas for market deposit
export async function estimateDepositGas(
  publicClient: any,
  userAddress: Address,
  marketAddress: Address,
  outcome: number,
  amount: bigint
): Promise<bigint> {
  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: marketAddress,
      abi: CONTRACTS.ParimutuelMarket.abi,
      functionName: 'deposit',
      args: [outcome, amount],
      account: userAddress,
    })
    
    // Add buffer
    return gasEstimate + BigInt(Math.floor(Number(gasEstimate) * GAS_CONSTANTS.GAS_LIMIT_BUFFER))
  } catch (error) {
    console.warn('Failed to estimate deposit gas:', error)
    return GAS_CONSTANTS.MARKET_DEPOSIT
  }
}

// Estimate gas for claim
export async function estimateClaimGas(
  publicClient: any,
  userAddress: Address,
  marketAddress: Address
): Promise<bigint> {
  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: marketAddress,
      abi: CONTRACTS.ParimutuelMarket.abi,
      functionName: 'claim',
      account: userAddress,
    })
    
    // Add buffer
    return gasEstimate + BigInt(Math.floor(Number(gasEstimate) * GAS_CONSTANTS.GAS_LIMIT_BUFFER))
  } catch (error) {
    console.warn('Failed to estimate claim gas:', error)
    return GAS_CONSTANTS.MARKET_CLAIM
  }
}

// Generate gas estimates for different speeds
export function generateGasEstimates(
  gasLimit: bigint,
  baseGasPrice: bigint,
  maxFeePerGas?: bigint,
  maxPriorityFeePerGas?: bigint,
  isEIP1559: boolean = false
): GasEstimates {
  const estimates: Partial<GasEstimates> = {}
  
  for (const [speed, multiplier] of Object.entries(GAS_CONSTANTS.MULTIPLIERS)) {
    const speedKey = speed as GasSpeed
    
    if (isEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
      // EIP-1559 calculation
      const adjustedMaxFee = BigInt(Math.floor(Number(maxFeePerGas) * multiplier))
      const adjustedPriorityFee = BigInt(Math.floor(Number(maxPriorityFeePerGas) * multiplier))
      const totalCost = gasLimit * adjustedMaxFee
      
      estimates[speedKey] = {
        gasLimit,
        gasPrice: baseGasPrice,
        maxFeePerGas: adjustedMaxFee,
        maxPriorityFeePerGas: adjustedPriorityFee,
        totalCost,
        totalCostFormatted: formatEthAmount(totalCost),
        isEIP1559: true,
        speed: speedKey,
      }
    } else {
      // Legacy gas calculation
      const adjustedGasPrice = BigInt(Math.floor(Number(baseGasPrice) * multiplier))
      const totalCost = gasLimit * adjustedGasPrice
      
      estimates[speedKey] = {
        gasLimit,
        gasPrice: adjustedGasPrice,
        totalCost,
        totalCostFormatted: formatEthAmount(totalCost),
        isEIP1559: false,
        speed: speedKey,
      }
    }
  }
  
  return estimates as GasEstimates
}

// Hook for gas estimation
export function useGasEstimation() {
  const publicClient = usePublicClient()
  const { address: userAddress } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimateGas = useCallback(async (
    type: 'approval' | 'deposit' | 'claim',
    params: {
      tokenAddress?: Address
      marketAddress?: Address
      spenderAddress?: Address
      amount?: bigint
      outcome?: number
    }
  ): Promise<GasEstimates | null> => {
    if (!publicClient || !userAddress) {
      setError('Client not available')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get current gas prices
      const gasPrices = await getCurrentGasPrices(publicClient)
      
      // Estimate gas limit based on type
      let gasLimit: bigint
      
      switch (type) {
        case 'approval':
          if (!params.tokenAddress || !params.spenderAddress || !params.amount) {
            throw new Error('Missing parameters for approval estimation')
          }
          gasLimit = await estimateApprovalGas(
            publicClient,
            userAddress,
            params.tokenAddress,
            params.spenderAddress,
            params.amount
          )
          break
          
        case 'deposit':
          if (!params.marketAddress || params.outcome === undefined || !params.amount) {
            throw new Error('Missing parameters for deposit estimation')
          }
          gasLimit = await estimateDepositGas(
            publicClient,
            userAddress,
            params.marketAddress,
            params.outcome,
            params.amount
          )
          break
          
        case 'claim':
          if (!params.marketAddress) {
            throw new Error('Missing parameters for claim estimation')
          }
          gasLimit = await estimateClaimGas(
            publicClient,
            userAddress,
            params.marketAddress
          )
          break
          
        default:
          throw new Error(`Unknown gas estimation type: ${type}`)
      }
      
      // Generate estimates for different speeds
      const estimates = generateGasEstimates(
        gasLimit,
        gasPrices.gasPrice,
        gasPrices.maxFeePerGas,
        gasPrices.maxPriorityFeePerGas,
        gasPrices.isEIP1559
      )
      
      return estimates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gas estimation failed'
      setError(errorMessage)
      console.error('Gas estimation error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, userAddress])

  const estimateApproval = useCallback((
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ) => {
    return estimateGas('approval', { tokenAddress, spenderAddress, amount })
  }, [estimateGas])

  const estimateDeposit = useCallback((
    marketAddress: Address,
    outcome: number,
    amount: bigint
  ) => {
    return estimateGas('deposit', { marketAddress, outcome, amount })
  }, [estimateGas])

  const estimateClaim = useCallback((
    marketAddress: Address
  ) => {
    return estimateGas('claim', { marketAddress })
  }, [estimateGas])

  return {
    estimateGas,
    estimateApproval,
    estimateDeposit,
    estimateClaim,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}