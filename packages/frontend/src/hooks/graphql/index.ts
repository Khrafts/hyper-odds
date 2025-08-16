/**
 * GraphQL hooks exports
 */

// Market hooks
export {
  useMarkets,
  useMarket,
  useActiveMarkets,
  useResolvedMarkets,
  useCreateMarket,
  useMarketUpdates,
} from './useMarkets'

// Trade hooks
export {
  useRecentTrades,
  useMarketTrades,
  useUserTrades,
  useBuyShares,
  useSellShares,
  useClaimWinnings,
  useTradeSubscription,
} from './useTrades'

// Position hooks
export {
  useUserPositions,
  useMarketPositions,
  usePosition,
  useActivePositions,
  usePositionValue,
} from './usePositions'

// User hooks
export {
  useUser,
  useUserByAddress,
  useTopTraders,
  useUserStats,
  useCurrentUser,
} from './useUsers'