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
} from './use-markets'

// Trade hooks
export {
  useRecentTrades,
  useMarketTrades,
  useUserTrades,
  useBuyShares,
  useSellShares,
  useClaimWinnings,
  useTradeSubscription,
} from './use-trades'

// Position hooks
export {
  useUserPositions,
  useMarketPositions,
  usePosition,
  useActivePositions,
  usePositionValue,
} from './use-positions'

// User hooks
export {
  useUser,
  useUserByAddress,
  useTopTraders,
  useUserStats,
  useCurrentUser,
} from './use-users'