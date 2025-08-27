/**
 * Trading router hook that selects appropriate trading hook based on market type
 */

import { Address } from 'viem'
import { useParimutuelTrading } from './useParimutuelTrading'
import { useParimutuelTradingDirect } from './useParimutuelTradingDirect'
import { useParimutuelTradingFixed } from './useParimutuelTradingFixed'
import { useCPMMTrading } from './useCPMMTrading'
import { getMarketType } from '@/lib/web3/contracts'
import type { Market } from '@/types/market'

/**
 * Universal trading hook that routes to appropriate implementation
 */
export function useTradingRouter(
  market: Pick<Market, 'id' | 'marketType' | 'reserveYes' | 'poolYes'> | null,
  userAddress?: Address
) {
  const marketAddress = market?.id as Address | undefined
  const marketType = market ? getMarketType(market) : 'PARIMUTUEL'
  
  // Use appropriate hook based on market type
  const parimutuelHook = useParimutuelTrading(
    marketAddress || '0x0' as Address,
    userAddress
  )
  
  // Direct hook for testing
  const parimutuelDirectHook = useParimutuelTradingDirect(
    marketAddress || '0x0' as Address
  )
  
  // Fixed hook with proper wagmi connection
  const parimutuelFixedHook = useParimutuelTradingFixed(
    marketAddress || '0x0' as Address
  )
  
  const cpmmHook = useCPMMTrading(
    marketAddress || '0x0' as Address,
    userAddress
  )
  
  // Return appropriate hook based on market type
  if (!market || !marketAddress) {
    return {
      marketType: 'PARIMUTUEL' as const,
      isLoading: false,
      error: 'No market selected',
      // Stub functions
      deposit: async () => {},
      buyShares: async () => {},
      sellShares: async () => {},
      claimWinnings: async () => {},
      approveToken: async () => {},
      continueAfterApproval: async () => {},
      reset: () => {},
      allowance: 0n,
      hash: undefined,
      lastSuccessHash: undefined,
      canTrade: false,
      canClaim: false,
      canSell: false,
      marketState: null,
      position: null,
      isProcessingDeposit: false,
      isWaitingApproval: false,
      isProcessingClaim: false,
      isSuccess: false,
      isApprovalSuccess: false,
      isTransactionSuccess: false,
      isError: false,
      receiptError: null,
    }
  }
  
  if (marketType === 'CPMM') {
    return {
      marketType: 'CPMM' as const,
      isLoading: cpmmHook.isLoadingMarket || cpmmHook.isLoadingPosition,
      error: null,
      
      // CPMM functions
      buyShares: cpmmHook.buyShares,
      buyYes: cpmmHook.buyYes,
      buyNo: cpmmHook.buyNo,
      sellShares: cpmmHook.sellShares,
      sellYes: cpmmHook.sellYes,
      sellNo: cpmmHook.sellNo,
      claimWinnings: cpmmHook.claimWinnings,
      
      // Helpers
      canTrade: cpmmHook.canTrade,
      canSell: cpmmHook.canSell,
      canClaim: false, // CPMM doesn't have claim in same way
      
      // State
      marketState: cpmmHook.marketState,
      position: cpmmHook.position,
      
      // Loading states
      isProcessingBuy: cpmmHook.isProcessingBuy,
      isProcessingSell: cpmmHook.isProcessingSell,
      isProcessingClaim: cpmmHook.isProcessingClaim,
    }
  }
  
  // Default to Parimutuel (using fixed hook)
  return {
    marketType: 'PARIMUTUEL' as const,
    isLoading: parimutuelFixedHook.isLoading,
    error: parimutuelFixedHook.error,
    
    // Parimutuel functions (fixed)
    deposit: parimutuelFixedHook.deposit,
    depositYes: parimutuelFixedHook.depositYes,
    depositNo: parimutuelFixedHook.depositNo,
    // claimWinnings: parimutuelHook.claimWinnings, // TODO: implement in direct hook
    // approveToken: parimutuelHook.approveToken, // Not needed with direct hook
    // continueAfterApproval: parimutuelHook.continueAfterApproval, // Not needed
    // reset: parimutuelHook.reset, // Not needed
    
    // Token state
    allowance: parimutuelFixedHook.allowance,
    balance: parimutuelFixedHook.balance,
    
    // Transaction hashes
    // hash: parimutuelHook.hash, // Not available in fixed hook yet
    lastSuccessHash: parimutuelFixedHook.lastSuccessHash,
    
    // Helpers
    canTrade: parimutuelFixedHook.canTrade,
    // canClaim: parimutuelHook.canClaim, // TODO: implement
    canSell: false, // Parimutuel doesn't support selling
    
    // State (TODO: implement in fixed hook)
    // marketState: parimutuelHook.marketState,
    // position: parimutuelHook.position,
    
    // Loading states
    isProcessingDeposit: parimutuelFixedHook.isLoading,
    isWaitingApproval: parimutuelFixedHook.isWaitingApproval,
    // isProcessingClaim: parimutuelHook.isProcessingClaim,
    
    // Success states (simplified)
    isSuccess: false, // TODO: implement
    isApprovalSuccess: false, // TODO: implement
    isTransactionSuccess: !!parimutuelFixedHook.lastSuccessHash,
    
    // Error states
    isError: !!parimutuelFixedHook.error,
    // receiptError: parimutuelHook.receiptError,
    // writeError: parimutuelHook.writeError,
  }
}

/**
 * Type guards for market type checking
 */
export function isParimutuelMarket(
  market: Pick<Market, 'marketType' | 'reserveYes' | 'poolYes'>
): boolean {
  return getMarketType(market) === 'PARIMUTUEL'
}

export function isCPMMMarket(
  market: Pick<Market, 'marketType' | 'reserveYes' | 'poolYes'>
): boolean {
  return getMarketType(market) === 'CPMM'
}