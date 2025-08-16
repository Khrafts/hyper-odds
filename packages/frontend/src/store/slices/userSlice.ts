import { StateCreator } from 'zustand'
import { AppStore } from '../index'

export interface UserPreferences {
  defaultSlippage: number
  autoConnect: boolean
  notifications: {
    trades: boolean
    markets: boolean
    positions: boolean
  }
  display: {
    showUSD: boolean
    compactView: boolean
  }
}

export interface UserState {
  address: string | null
  ensName: string | null
  balance: string
  isConnected: boolean
  preferences: UserPreferences
}

export interface UserSlice {
  user: UserState
  setUser: (user: Partial<UserState>) => void
  clearUser: () => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
}

const initialUserState: UserState = {
  address: null,
  ensName: null,
  balance: '0',
  isConnected: false,
  preferences: {
    defaultSlippage: 0.5,
    autoConnect: true,
    notifications: {
      trades: true,
      markets: true,
      positions: true,
    },
    display: {
      showUSD: true,
      compactView: false,
    },
  },
}

export const createUserSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  UserSlice
> = (set) => ({
  user: initialUserState,
  
  setUser: (userData) =>
    set((state) => {
      Object.assign(state.user, userData)
    }),
  
  clearUser: () =>
    set((state) => {
      state.user = initialUserState
    }),
  
  updatePreferences: (preferences) =>
    set((state) => {
      Object.assign(state.user.preferences, preferences)
    }),
})