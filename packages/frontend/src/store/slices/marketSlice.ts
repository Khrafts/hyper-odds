import { StateCreator } from 'zustand'
import { AppStore } from '../index'

export interface Market {
  id: string
  marketId: string
  question: string
  description?: string
  poolYes: string
  poolNo: string
  resolved: boolean
  resolvedOutcome?: 'YES' | 'NO' | 'INVALID'
  expirationTime?: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    address: string
  }
  totalVolume?: string
  totalTrades?: number
}

export interface MarketFilters {
  status: 'all' | 'active' | 'resolved'
  category?: string
  sortBy: 'newest' | 'volume' | 'expiring' | 'popular'
  searchQuery?: string
}

export interface MarketState {
  markets: Market[]
  selectedMarket: Market | null
  filters: MarketFilters
  loading: boolean
  error: string | null
  lastUpdated: number
}

export interface MarketSlice {
  markets: Market[]
  selectedMarket: Market | null
  marketFilters: MarketFilters
  marketLoading: boolean
  marketError: string | null
  setMarkets: (markets: Market[]) => void
  addMarket: (market: Market) => void
  updateMarket: (marketId: string, updates: Partial<Market>) => void
  setSelectedMarket: (market: Market | null) => void
  clearSelectedMarket: () => void
  setMarketFilters: (filters: Partial<MarketFilters>) => void
  setMarketLoading: (loading: boolean) => void
  setMarketError: (error: string | null) => void
}

const initialMarketFilters: MarketFilters = {
  status: 'all',
  sortBy: 'newest',
}

export const createMarketSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  MarketSlice
> = (set) => ({
  markets: [],
  selectedMarket: null,
  marketFilters: initialMarketFilters,
  marketLoading: false,
  marketError: null,
  
  setMarkets: (markets) =>
    set((state) => {
      state.markets = markets
    }),
  
  addMarket: (market) =>
    set((state) => {
      state.markets.push(market)
    }),
  
  updateMarket: (marketId, updates) =>
    set((state) => {
      const index = state.markets.findIndex((m: Market) => m.id === marketId)
      if (index !== -1) {
        Object.assign(state.markets[index], updates)
        if (state.selectedMarket?.id === marketId) {
          Object.assign(state.selectedMarket, updates)
        }
      }
    }),
  
  setSelectedMarket: (market) =>
    set((state) => {
      state.selectedMarket = market
    }),
  
  clearSelectedMarket: () =>
    set((state) => {
      state.selectedMarket = null
    }),
  
  setMarketFilters: (filters) =>
    set((state) => {
      Object.assign(state.marketFilters, filters)
    }),
  
  setMarketLoading: (loading) =>
    set((state) => {
      state.marketLoading = loading
    }),
  
  setMarketError: (error) =>
    set((state) => {
      state.marketError = error
    }),
})