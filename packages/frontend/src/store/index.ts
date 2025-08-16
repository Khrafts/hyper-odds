import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { createUserSlice, UserSlice } from './slices/userSlice'
import { createMarketSlice, MarketSlice } from './slices/marketSlice'
import { createUISlice, UISlice } from './slices/uiSlice'
import { createTradeSlice, TradeSlice } from './slices/tradeSlice'

/**
 * Main application store combining all slices
 */
export type AppStore = UserSlice & MarketSlice & UISlice & TradeSlice

export const useStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer(
        persist(
          (...args) => ({
            ...createUserSlice(...args),
            ...createMarketSlice(...args),
            ...createUISlice(...args),
            ...createTradeSlice(...args),
          }),
          {
            name: 'hyperodds-store',
            partialize: (state) => ({
              // Only persist certain parts of the state
              user: {
                preferences: state.user.preferences,
              },
              ui: {
                theme: state.ui.theme,
                sidebarCollapsed: state.ui.sidebarCollapsed,
              },
            }),
          }
        )
      )
    ),
    {
      name: 'HyperOdds Store',
    }
  )
)

// Selectors
export const selectUser = (state: AppStore) => state.user
export const selectMarkets = (state: AppStore) => state.markets
export const selectUI = (state: AppStore) => state.ui
export const selectTrade = (state: AppStore) => state.trade

// Actions hooks
export const useUserActions = () => {
  const setUser = useStore((state) => state.setUser)
  const clearUser = useStore((state) => state.clearUser)
  const updatePreferences = useStore((state) => state.updatePreferences)
  
  return { setUser, clearUser, updatePreferences }
}

export const useMarketActions = () => {
  const setMarkets = useStore((state) => state.setMarkets)
  const addMarket = useStore((state) => state.addMarket)
  const updateMarket = useStore((state) => state.updateMarket)
  const setSelectedMarket = useStore((state) => state.setSelectedMarket)
  const clearSelectedMarket = useStore((state) => state.clearSelectedMarket)
  
  return { setMarkets, addMarket, updateMarket, setSelectedMarket, clearSelectedMarket }
}

export const useUIActions = () => {
  const setTheme = useStore((state) => state.setTheme)
  const toggleSidebar = useStore((state) => state.toggleSidebar)
  const setModal = useStore((state) => state.setModal)
  const closeModal = useStore((state) => state.closeModal)
  const showNotification = useStore((state) => state.showNotification)
  const dismissNotification = useStore((state) => state.dismissNotification)
  
  return { setTheme, toggleSidebar, setModal, closeModal, showNotification, dismissNotification }
}

export const useTradeActions = () => {
  const setTradeForm = useStore((state) => state.setTradeForm)
  const clearTradeForm = useStore((state) => state.clearTradeForm)
  const setTrading = useStore((state) => state.setTrading)
  const addRecentTrade = useStore((state) => state.addRecentTrade)
  
  return { setTradeForm, clearTradeForm, setTrading, addRecentTrade }
}