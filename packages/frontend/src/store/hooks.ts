import { useStore } from './index'
import { useShallow } from 'zustand/react/shallow'

/**
 * Custom hooks for accessing store state with optimal re-renders
 */

// User hooks
export const useUser = () => useStore(useShallow((state) => state.user))
export const useUserAddress = () => useStore((state) => state.user.address)
export const useIsConnected = () => useStore((state) => state.user.isConnected)
export const useUserPreferences = () => useStore(useShallow((state) => state.user.preferences))

// Market hooks
export const useMarkets = () => useStore(useShallow((state) => state.markets))
export const useSelectedMarket = () => useStore((state) => state.selectedMarket)
export const useMarketFilters = () => useStore(useShallow((state) => state.marketFilters))
export const useMarketLoading = () => useStore((state) => state.marketLoading)

// UI hooks
export const useTheme = () => useStore((state) => state.ui.theme)
export const useSidebarCollapsed = () => useStore((state) => state.ui.sidebarCollapsed)
export const useModal = () => useStore((state) => state.ui.modal)
export const useNotifications = () => useStore(useShallow((state) => state.ui.notifications))
export const usePendingTransactions = () => useStore(useShallow((state) => state.ui.pendingTransactions))

// Trade hooks
export const useTradeForm = () => useStore(useShallow((state) => state.trade.tradeForm))
export const useIsTrading = () => useStore((state) => state.trade.isTrading)
export const useRecentTrades = () => useStore(useShallow((state) => state.trade.recentTrades))
export const useTradeError = () => useStore((state) => state.trade.tradeError)

// Combined selectors
export const useMarketById = (marketId: string) =>
  useStore((state) => state.markets.find((m) => m.id === marketId))

export const useActiveMarkets = () =>
  useStore(useShallow((state) => state.markets.filter((m: any) => !m.resolved)))

export const useResolvedMarkets = () =>
  useStore(useShallow((state) => state.markets.filter((m: any) => m.resolved)))

export const useFilteredMarkets = () =>
  useStore(useShallow((state) => {
    const { markets, marketFilters } = state
    let filtered = [...markets]
    
    // Apply status filter
    if (marketFilters.status === 'active') {
      filtered = filtered.filter((m) => !m.resolved)
    } else if (marketFilters.status === 'resolved') {
      filtered = filtered.filter((m) => m.resolved)
    }
    
    // Apply search filter
    if (marketFilters.searchQuery) {
      const query = marketFilters.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.question.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      )
    }
    
    // Apply category filter
    if (marketFilters.category) {
      // Implement category filtering based on your categorization logic
    }
    
    // Apply sorting
    switch (marketFilters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
      case 'volume':
        filtered.sort((a, b) => 
          parseFloat(b.totalVolume || '0') - parseFloat(a.totalVolume || '0')
        )
        break
      case 'expiring':
        filtered.sort((a, b) => {
          if (!a.expirationTime && !b.expirationTime) return 0
          if (!a.expirationTime) return 1
          if (!b.expirationTime) return -1
          return new Date(a.expirationTime).getTime() - new Date(b.expirationTime).getTime()
        })
        break
      case 'popular':
        filtered.sort((a, b) => 
          (b.totalTrades || 0) - (a.totalTrades || 0)
        )
        break
    }
    
    return filtered
  }))

// Notification helpers
export const useHasNotifications = () =>
  useStore((state) => state.ui.notifications.length > 0)

export const useHasPendingTransactions = () =>
  useStore((state) => state.ui.pendingTransactions.length > 0)

export const useLatestNotification = () =>
  useStore((state) => 
    state.ui.notifications.length > 0 
      ? state.ui.notifications[state.ui.notifications.length - 1]
      : null
  )