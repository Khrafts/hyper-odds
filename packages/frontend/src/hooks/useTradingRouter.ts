/**
 * Trading router hook that selects appropriate trading hook based on market type
 */

import { Address } from 'viem'
import { useParimutuelTrading } from './useParimutuelTrading'
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
      canTrade: false,
      canClaim: false,
      canSell: false,
      marketState: null,
      position: null,
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
  
  // Default to Parimutuel
  return {
    marketType: 'PARIMUTUEL' as const,
    isLoading: parimutuelHook.isLoadingMarket || parimutuelHook.isLoadingPosition,
    error: null,
    
    // Parimutuel functions
    deposit: parimutuelHook.deposit,
    depositYes: parimutuelHook.depositYes,
    depositNo: parimutuelHook.depositNo,
    claimWinnings: parimutuelHook.claimWinnings,
    
    // Helpers
    canTrade: parimutuelHook.canTrade,
    canClaim: parimutuelHook.canClaim,
    canSell: false, // Parimutuel doesn't support selling
    
    // State
    marketState: parimutuelHook.marketState,
    position: parimutuelHook.position,
    
    // Loading states
    isProcessingDeposit: parimutuelHook.isLoading,
    isProcessingClaim: parimutuelHook.isProcessingClaim,
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