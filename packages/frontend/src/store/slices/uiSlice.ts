import { StateCreator } from 'zustand'
import { AppStore } from '../index'

export type Theme = 'light' | 'dark' | 'system'
export type ModalType = 'trade' | 'create-market' | 'wallet' | 'settings' | null

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: number
}

export interface Modal {
  type: ModalType
  data?: any
}

export interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  modal: Modal | null
  notifications: Notification[]
  pendingTransactions: string[]
}

export interface UISlice {
  ui: UIState
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setModal: (type: ModalType, data?: any) => void
  closeModal: () => void
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  dismissNotification: (id: string) => void
  addPendingTransaction: (txHash: string) => void
  removePendingTransaction: (txHash: string) => void
}

const initialUIState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  modal: null,
  notifications: [],
  pendingTransactions: [],
}

export const createUISlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  UISlice
> = (set) => ({
  ui: initialUIState,
  
  setTheme: (theme) =>
    set((state) => {
      state.ui.theme = theme
      // Apply theme to document
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }
      }
    }),
  
  toggleSidebar: () =>
    set((state) => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed
    }),
  
  setModal: (type, data) =>
    set((state) => {
      state.ui.modal = type ? { type, data } : null
    }),
  
  closeModal: () =>
    set((state) => {
      state.ui.modal = null
    }),
  
  showNotification: (notification) =>
    set((state) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: Date.now(),
        duration: notification.duration ?? 5000,
      }
      
      state.ui.notifications.push(newNotification)
      
      // Auto-dismiss after duration
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          set((state) => {
            const index = state.ui.notifications.findIndex((n: Notification) => n.id === id)
            if (index !== -1) {
              state.ui.notifications.splice(index, 1)
            }
          })
        }, newNotification.duration)
      }
    }),
  
  dismissNotification: (id) =>
    set((state) => {
      const index = state.ui.notifications.findIndex((n: Notification) => n.id === id)
      if (index !== -1) {
        state.ui.notifications.splice(index, 1)
      }
    }),
  
  addPendingTransaction: (txHash) =>
    set((state) => {
      if (!state.ui.pendingTransactions.includes(txHash)) {
        state.ui.pendingTransactions.push(txHash)
      }
    }),
  
  removePendingTransaction: (txHash) =>
    set((state) => {
      const index = state.ui.pendingTransactions.indexOf(txHash)
      if (index !== -1) {
        state.ui.pendingTransactions.splice(index, 1)
      }
    }),
})