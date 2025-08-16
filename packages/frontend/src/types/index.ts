/**
 * Central type exports
 */

// Re-export market types
export * from './market'

// Re-export contract types  
export * from './contracts'

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type AsyncResult<T> = Promise<T>

// API response types
export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
    totalCount: number
  }
}

// Form types
export interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Modal types
export type ModalType = 
  | 'trade'
  | 'create-market'
  | 'resolve-market'
  | 'wallet-connect'
  | 'settings'
  | 'share'
  | 'confirm'

export interface ModalState {
  type: ModalType | null
  data?: any
  onClose?: () => void
  onConfirm?: (data?: any) => void
}

// Toast/notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Wallet types
export interface WalletState {
  address?: string
  ensName?: string
  avatar?: string
  balance?: string
  isConnecting: boolean
  isConnected: boolean
  chain?: {
    id: number
    name: string
  }
}

// Filter types
export interface FilterOption<T = string> {
  value: T
  label: string
  icon?: React.ComponentType
  count?: number
}

// Sort types
export interface SortOption<T = string> {
  value: T
  label: string
  direction: 'asc' | 'desc'
}

// Search types
export interface SearchState {
  query: string
  isSearching: boolean
  results: any[]
  filters: Record<string, any>
}

// Chart types
export interface ChartDataPoint {
  x: number | string | Date
  y: number
  label?: string
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: 'line' | 'bar' | 'area'
}

// Table types
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T) => React.ReactNode
}

export interface TableState<T> {
  data: T[]
  columns: TableColumn<T>[]
  sorting?: {
    key: string
    direction: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
  selection?: Set<string | number>
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: number
  stack?: string
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: AppError | null
  state: LoadingState
}

// Date/Time types
export type TimeFrame = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all'

export interface DateRange {
  start: Date | string
  end: Date | string
}

// Number formatting
export interface NumberFormat {
  decimals?: number
  prefix?: string
  suffix?: string
  thousandsSeparator?: string
  decimalSeparator?: string
}

// Validation types
export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  message?: string
}

export type ValidationRules<T> = Partial<Record<keyof T, ValidationRule[]>>

// Event types
export interface AppEvent<T = any> {
  type: string
  payload?: T
  timestamp: number
  source?: string
}

// Settings types
export interface UserSettings {
  theme: Theme
  notifications: {
    trades: boolean
    markets: boolean
    prices: boolean
  }
  display: {
    currency: 'USD' | 'ETH'
    compactNumbers: boolean
    animations: boolean
  }
  trading: {
    defaultSlippage: number
    expertMode: boolean
    autoSign: boolean
  }
}

// Analytics types
export interface AnalyticsEvent {
  category: string
  action: string
  label?: string
  value?: number
  metadata?: Record<string, any>
}