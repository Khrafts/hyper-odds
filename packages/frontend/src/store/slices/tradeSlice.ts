import { StateCreator } from 'zustand'
import { AppStore } from '../index'

export type TradeOutcome = 'YES' | 'NO'
export type TradeType = 'buy' | 'sell'

export interface TradeFormData {
  marketId: string | null
  outcome: TradeOutcome | null
  type: TradeType
  amount: string
  shares: string
  maxSlippage: number
  estimatedShares?: string
  estimatedCost?: string
  priceImpact?: number
}

export interface RecentTrade {
  id: string
  marketId: string
  marketQuestion: string
  outcome: TradeOutcome
  type: TradeType
  amount: string
  shares: string
  timestamp: number
  txHash: string
  status: 'pending' | 'confirmed' | 'failed'
}

export interface TradeState {
  tradeForm: TradeFormData
  isTrading: boolean
  recentTrades: RecentTrade[]
  tradeError: string | null
}

export interface TradeSlice {
  trade: TradeState
  setTradeForm: (form: Partial<TradeFormData>) => void
  clearTradeForm: () => void
  setTrading: (isTrading: boolean) => void
  setTradeError: (error: string | null) => void
  addRecentTrade: (trade: RecentTrade) => void
  updateRecentTrade: (id: string, updates: Partial<RecentTrade>) => void
  clearRecentTrades: () => void
}

const initialTradeForm: TradeFormData = {
  marketId: null,
  outcome: null,
  type: 'buy',
  amount: '',
  shares: '',
  maxSlippage: 0.5,
}

export const createTradeSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  TradeSlice
> = (set) => ({
  trade: {
    tradeForm: initialTradeForm,
    isTrading: false,
    recentTrades: [],
    tradeError: null,
  },
  
  setTradeForm: (form) =>
    set((state) => {
      Object.assign(state.trade.tradeForm, form)
    }),
  
  clearTradeForm: () =>
    set((state) => {
      state.trade.tradeForm = initialTradeForm
    }),
  
  setTrading: (isTrading) =>
    set((state) => {
      state.trade.isTrading = isTrading
    }),
  
  setTradeError: (error) =>
    set((state) => {
      state.trade.tradeError = error
    }),
  
  addRecentTrade: (trade) =>
    set((state) => {
      // Keep only last 10 trades
      state.trade.recentTrades.unshift(trade)
      if (state.trade.recentTrades.length > 10) {
        state.trade.recentTrades.pop()
      }
    }),
  
  updateRecentTrade: (id, updates) =>
    set((state) => {
      const index = state.trade.recentTrades.findIndex((t: RecentTrade) => t.id === id)
      if (index !== -1) {
        Object.assign(state.trade.recentTrades[index], updates)
      }
    }),
  
  clearRecentTrades: () =>
    set((state) => {
      state.trade.recentTrades = []
    }),
})