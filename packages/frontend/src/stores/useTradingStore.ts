'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Address } from 'viem'
import { transactionNotifications } from '@/lib/notifications'

// Transaction types
export interface Transaction {
  id: string
  hash?: string
  type: 'approval' | 'deposit' | 'claim'
  marketId: string
  side?: 'YES' | 'NO'
  amount?: string
  status: 'pending' | 'confirming' | 'success' | 'failed'
  timestamp: number
  error?: string
  blockNumber?: number
  gasUsed?: string
  confirmations?: number
  toastId?: string | number // Track associated toast notification
}

export interface TradingState {
  isLoading: boolean
  error: string | null
  currentTransaction: Transaction | null
  stage: 'idle' | 'approval' | 'deposit' | 'claim' | 'completed'
}

export interface MarketState {
  optimisticBalance: string | null
  optimisticPoolYes: string | null
  optimisticPoolNo: string | null
  lastUpdateTimestamp: number
}

interface TradingStore {
  // Transaction state
  transactions: Record<string, Transaction>
  tradingState: TradingState
  
  // Market optimistic state
  marketStates: Record<string, MarketState>
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => string
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  setTradingState: (state: Partial<TradingState>) => void
  clearError: () => void
  
  // Optimistic updates
  setOptimisticBalance: (marketId: string, balance: string) => void
  setOptimisticPools: (marketId: string, poolYes: string, poolNo: string) => void
  clearOptimisticUpdates: (marketId: string) => void
  
  // Transaction management
  startApproval: (marketId: string, amount: string) => string
  startDeposit: (marketId: string, side: 'YES' | 'NO', amount: string) => string
  startClaim: (marketId: string) => string
  completeTransaction: (txHash: string, blockNumber?: number, gasUsed?: string) => void
  failTransaction: (error: string) => void
  
  // Getters
  getTransactionsByMarket: (marketId: string) => Transaction[]
  getLatestTransactionByType: (marketId: string, type: Transaction['type']) => Transaction | null
  isTransactionPending: (marketId: string, type?: Transaction['type']) => boolean
  
  // Cleanup
  clearOldTransactions: (olderThanHours?: number) => void
}

export const useTradingStore = create<TradingStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        transactions: {},
        tradingState: {
          isLoading: false,
          error: null,
          currentTransaction: null,
          stage: 'idle',
        },
        marketStates: {},

        // Transaction management
        addTransaction: (transaction) => {
          const id = `${transaction.type}-${transaction.marketId}-${Date.now()}`
          const fullTransaction: Transaction = {
            ...transaction,
            id,
            timestamp: Date.now(),
          }
          
          // Show initial notification and store toast ID
          const toastId = transactionNotifications.fromTransaction(fullTransaction)
          if (toastId) {
            fullTransaction.toastId = toastId
          }
          
          set((state) => ({
            transactions: {
              ...state.transactions,
              [id]: fullTransaction,
            },
            tradingState: {
              ...state.tradingState,
              currentTransaction: fullTransaction,
            },
          }))
          
          return id
        },

        updateTransaction: (id, updates) => {
          set((state) => {
            const transaction = state.transactions[id]
            if (!transaction) return state

            const updatedTransaction = { ...transaction, ...updates }
            
            // Update notification based on new status
            if (updates.status && updates.status !== transaction.status) {
              transactionNotifications.fromTransaction(updatedTransaction, transaction.toastId)
            }
            
            return {
              transactions: {
                ...state.transactions,
                [id]: updatedTransaction,
              },
              tradingState: state.tradingState.currentTransaction?.id === id
                ? { ...state.tradingState, currentTransaction: updatedTransaction }
                : state.tradingState,
            }
          })
        },

        setTradingState: (newState) => {
          set((state) => ({
            tradingState: {
              ...state.tradingState,
              ...newState,
            },
          }))
        },

        clearError: () => {
          set((state) => ({
            tradingState: {
              ...state.tradingState,
              error: null,
            },
          }))
        },

        // Optimistic updates
        setOptimisticBalance: (marketId, balance) => {
          set((state) => ({
            marketStates: {
              ...state.marketStates,
              [marketId]: {
                ...state.marketStates[marketId],
                optimisticBalance: balance,
                lastUpdateTimestamp: Date.now(),
              },
            },
          }))
        },

        setOptimisticPools: (marketId, poolYes, poolNo) => {
          set((state) => ({
            marketStates: {
              ...state.marketStates,
              [marketId]: {
                ...state.marketStates[marketId],
                optimisticPoolYes: poolYes,
                optimisticPoolNo: poolNo,
                lastUpdateTimestamp: Date.now(),
              },
            },
          }))
        },

        clearOptimisticUpdates: (marketId) => {
          set((state) => ({
            marketStates: {
              ...state.marketStates,
              [marketId]: {
                optimisticBalance: null,
                optimisticPoolYes: null,
                optimisticPoolNo: null,
                lastUpdateTimestamp: Date.now(),
              },
            },
          }))
        },

        // High-level transaction flows
        startApproval: (marketId, amount) => {
          const id = get().addTransaction({
            type: 'approval',
            marketId,
            amount,
            status: 'pending',
          })

          get().setTradingState({
            isLoading: true,
            error: null,
            stage: 'approval',
          })

          return id
        },

        startDeposit: (marketId, side, amount) => {
          const id = get().addTransaction({
            type: 'deposit',
            marketId,
            side,
            amount,
            status: 'pending',
          })

          get().setTradingState({
            isLoading: true,
            error: null,
            stage: 'deposit',
          })

          // Apply optimistic updates
          const currentState = get().marketStates[marketId]
          if (currentState?.optimisticPoolYes && currentState?.optimisticPoolNo) {
            const poolYes = parseFloat(currentState.optimisticPoolYes)
            const poolNo = parseFloat(currentState.optimisticPoolNo)
            const depositAmount = parseFloat(amount)

            const newPoolYes = side === 'YES' ? poolYes + depositAmount : poolYes
            const newPoolNo = side === 'NO' ? poolNo + depositAmount : poolNo

            get().setOptimisticPools(marketId, newPoolYes.toString(), newPoolNo.toString())
          }

          return id
        },

        startClaim: (marketId) => {
          const id = get().addTransaction({
            type: 'claim',
            marketId,
            status: 'pending',
          })

          get().setTradingState({
            isLoading: true,
            error: null,
            stage: 'claim',
          })

          return id
        },

        completeTransaction: (txHash, blockNumber, gasUsed) => {
          const { currentTransaction } = get().tradingState
          if (!currentTransaction) return

          get().updateTransaction(currentTransaction.id, {
            hash: txHash,
            status: 'success',
            blockNumber,
            gasUsed,
            confirmations: 1,
          })

          get().setTradingState({
            isLoading: false,
            error: null,
            stage: 'completed',
          })

          // Clear optimistic updates after successful transaction
          if (currentTransaction.marketId) {
            // Wait a bit before clearing to allow real data to update
            setTimeout(() => {
              get().clearOptimisticUpdates(currentTransaction.marketId)
            }, 2000)
          }
        },

        failTransaction: (error) => {
          const { currentTransaction } = get().tradingState
          if (!currentTransaction) return

          get().updateTransaction(currentTransaction.id, {
            status: 'failed',
            error,
          })

          get().setTradingState({
            isLoading: false,
            error,
            stage: 'idle',
          })

          // Clear optimistic updates on failure
          if (currentTransaction.marketId) {
            get().clearOptimisticUpdates(currentTransaction.marketId)
          }
        },

        // Getters
        getTransactionsByMarket: (marketId) => {
          return Object.values(get().transactions)
            .filter((tx) => tx.marketId === marketId)
            .sort((a, b) => b.timestamp - a.timestamp)
        },

        getLatestTransactionByType: (marketId, type) => {
          return Object.values(get().transactions)
            .filter((tx) => tx.marketId === marketId && tx.type === type)
            .sort((a, b) => b.timestamp - a.timestamp)[0] || null
        },

        isTransactionPending: (marketId, type) => {
          const transactions = Object.values(get().transactions)
          return transactions.some((tx) => 
            tx.marketId === marketId &&
            (type ? tx.type === type : true) &&
            (tx.status === 'pending' || tx.status === 'confirming')
          )
        },

        // Cleanup
        clearOldTransactions: (olderThanHours = 24) => {
          const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000)
          
          set((state) => {
            const filteredTransactions: Record<string, Transaction> = {}
            
            Object.entries(state.transactions).forEach(([id, tx]) => {
              if (tx.timestamp > cutoff || tx.status === 'pending' || tx.status === 'confirming') {
                filteredTransactions[id] = tx
              }
            })

            return {
              transactions: filteredTransactions,
            }
          })
        },
      }),
      {
        name: 'trading-store',
        partialize: (state) => ({
          transactions: state.transactions,
          marketStates: state.marketStates,
        }),
        version: 1,
        skipHydration: true, // Prevent SSR hydration issues
      }
    ),
    {
      name: 'trading-store',
    }
  )
)

// Selectors for better performance
export const useTransactionsByMarket = (marketId: string) =>
  useTradingStore((state) => state.getTransactionsByMarket(marketId))

export const useTradingStateFor = (marketId: string) =>
  useTradingStore((state) => ({
    isLoading: state.tradingState.isLoading,
    error: state.tradingState.error,
    stage: state.tradingState.stage,
    currentTransaction: state.tradingState.currentTransaction?.marketId === marketId 
      ? state.tradingState.currentTransaction 
      : null,
    isPending: state.isTransactionPending(marketId),
  }))

export const useOptimisticMarketState = (marketId: string) =>
  useTradingStore((state) => state.marketStates[marketId] || {
    optimisticBalance: null,
    optimisticPoolYes: null,
    optimisticPoolNo: null,
    lastUpdateTimestamp: 0,
  })