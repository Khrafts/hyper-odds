'use client'

import { toast } from 'sonner'
import { ExternalLink, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import type { Transaction } from '@/stores/use-trading-store'

export interface NotificationOptions {
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  description?: string
}

// Transaction notification helpers
export const transactionNotifications = {
  // Transaction started notifications
  approvalStarted: (amount: string) => {
    return toast.loading(`Approving ${amount} USDC...`, {
      description: 'Please confirm the transaction in your wallet',
      duration: Infinity,
    })
  },

  depositStarted: (side: 'YES' | 'NO', amount: string) => {
    return toast.loading(`Buying ${side} for ${amount} USDC...`, {
      description: 'Please confirm the transaction in your wallet',
      duration: Infinity,
    })
  },

  claimStarted: () => {
    return toast.loading('Claiming winnings...', {
      description: 'Please confirm the transaction in your wallet',
      duration: Infinity,
    })
  },

  // Transaction confirmed notifications
  approvalConfirmed: (amount: string, txHash: string, toastId?: string | number) => {
    const message = `Approved ${amount} USDC`
    
    if (toastId) {
      toast.success(message, {
        id: toastId,
        description: 'You can now proceed with your trade',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 5000,
      })
    } else {
      toast.success(message, {
        description: 'You can now proceed with your trade',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 5000,
      })
    }
  },

  depositConfirmed: (side: 'YES' | 'NO', amount: string, txHash: string, toastId?: string | number) => {
    const message = `Successfully bought ${side} for ${amount} USDC`
    
    if (toastId) {
      toast.success(message, {
        id: toastId,
        description: 'Your prediction has been recorded',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 5000,
      })
    } else {
      toast.success(message, {
        description: 'Your prediction has been recorded',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 5000,
      })
    }
  },

  claimConfirmed: (amount: string, txHash: string, toastId?: string | number) => {
    const message = `Claimed ${amount} USDC`
    
    if (toastId) {
      toast.success(message, {
        id: toastId,
        description: 'Winnings have been transferred to your wallet',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 8000,
      })
    } else {
      toast.success(message, {
        description: 'Winnings have been transferred to your wallet',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: 8000,
      })
    }
  },

  // Transaction failed notifications
  transactionFailed: (type: 'approval' | 'deposit' | 'claim', error: string, toastId?: string | number) => {
    const typeLabel = {
      approval: 'Approval',
      deposit: 'Trade',
      claim: 'Claim'
    }[type]

    const message = `${typeLabel} failed`
    
    if (toastId) {
      toast.error(message, {
        id: toastId,
        description: error,
        duration: 8000,
      })
    } else {
      toast.error(message, {
        description: error,
        duration: 8000,
      })
    }
  },

  // Transaction pending in mempool
  transactionPending: (type: 'approval' | 'deposit' | 'claim', txHash: string, toastId?: string | number) => {
    const typeLabel = {
      approval: 'Approval',
      deposit: 'Trade',
      claim: 'Claim'
    }[type]

    const message = `${typeLabel} submitted`
    
    if (toastId) {
      toast.loading(message, {
        id: toastId,
        description: 'Waiting for confirmation...',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: Infinity,
      })
    } else {
      return toast.loading(message, {
        description: 'Waiting for confirmation...',
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')
        },
        duration: Infinity,
      })
    }
  },

  // Generic transaction notifications based on transaction object
  fromTransaction: (transaction: Transaction, toastId?: string | number) => {
    const { type, status, side, amount, hash, error } = transaction

    switch (status) {
      case 'pending':
        if (type === 'approval') {
          return transactionNotifications.approvalStarted(amount || '0')
        } else if (type === 'deposit') {
          return transactionNotifications.depositStarted(side || 'YES', amount || '0')
        } else if (type === 'claim') {
          return transactionNotifications.claimStarted()
        }
        break

      case 'confirming':
        if (hash) {
          return transactionNotifications.transactionPending(type, hash, toastId)
        }
        break

      case 'success':
        if (hash) {
          if (type === 'approval') {
            transactionNotifications.approvalConfirmed(amount || '0', hash, toastId)
          } else if (type === 'deposit') {
            transactionNotifications.depositConfirmed(side || 'YES', amount || '0', hash, toastId)
          } else if (type === 'claim') {
            transactionNotifications.claimConfirmed(amount || '0', hash, toastId)
          }
        }
        break

      case 'failed':
        transactionNotifications.transactionFailed(type, error || 'Unknown error', toastId)
        break
    }
  }
}

// General notification helpers
export const notifications = {
  success: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 4000,
    })
  },

  error: (message: string, options?: NotificationOptions) => {
    return toast.error(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 6000,
    })
  },

  info: (message: string, options?: NotificationOptions) => {
    return toast.info(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 4000,
    })
  },

  warning: (message: string, options?: NotificationOptions) => {
    return toast.warning(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 5000,
    })
  },

  loading: (message: string, options?: NotificationOptions) => {
    return toast.loading(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || Infinity,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: {
      loading?: NotificationOptions
      success?: NotificationOptions
      error?: NotificationOptions
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    })
  }
}

// Market-specific notifications
export const marketNotifications = {
  marketResolved: (marketTitle: string, winningOutcome: 'YES' | 'NO') => {
    return notifications.info(`Market Resolved: ${marketTitle}`, {
      description: `Winning outcome: ${winningOutcome}`,
      duration: 8000,
    })
  },

  marketExpired: (marketTitle: string) => {
    return notifications.warning(`Market Expired: ${marketTitle}`, {
      description: 'Trading has ended for this market',
      duration: 6000,
    })
  },

  insufficientBalance: (required: string, available: string) => {
    return notifications.error('Insufficient USDC Balance', {
      description: `Required: ${required} USDC, Available: ${available} USDC`,
      duration: 5000,
    })
  },

  walletNotConnected: () => {
    return notifications.warning('Wallet Not Connected', {
      description: 'Please connect your wallet to continue',
      duration: 4000,
    })
  },

  networkError: () => {
    return notifications.error('Network Error', {
      description: 'Please check your connection and try again',
      duration: 5000,
    })
  }
}

// Connection notifications
export const connectionNotifications = {
  walletConnected: (address: string) => {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
    return notifications.success('Wallet Connected', {
      description: `Connected to ${shortAddress}`,
      duration: 3000,
    })
  },

  walletDisconnected: () => {
    return notifications.info('Wallet Disconnected', {
      duration: 3000,
    })
  },

  networkSwitched: (networkName: string) => {
    return notifications.info(`Switched to ${networkName}`, {
      duration: 3000,
    })
  },

  wrongNetwork: (expectedNetwork: string) => {
    return notifications.warning('Wrong Network', {
      description: `Please switch to ${expectedNetwork}`,
      duration: 6000,
    })
  }
}

// Export toast directly for custom usage
export { toast }