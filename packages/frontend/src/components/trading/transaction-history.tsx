'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  ArrowUp, 
  ArrowDown,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { useTransactionsByMarket, useTradingStore } from '@/stores/use-trading-store'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/stores/use-trading-store'

interface TransactionHistoryProps {
  marketId: string
  showAll?: boolean
  maxItems?: number
}

export function TransactionHistory({ 
  marketId, 
  showAll = false, 
  maxItems = 5 
}: TransactionHistoryProps) {
  const transactions = useTransactionsByMarket(marketId)
  const { clearOldTransactions } = useTradingStore()
  
  const displayTransactions = showAll 
    ? transactions 
    : transactions.slice(0, maxItems)

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'confirming':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'confirming':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }

  const getTypeIcon = (type: Transaction['type'], side?: 'YES' | 'NO') => {
    switch (type) {
      case 'approval':
        return <ArrowUp className="h-4 w-4 text-blue-500" />
      case 'deposit':
        return side === 'YES' 
          ? <TrendingUp className="h-4 w-4 text-green-500" />
          : <TrendingDown className="h-4 w-4 text-red-500" />
      case 'claim':
        return <DollarSign className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTypeLabel = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'approval':
        return 'USDC Approval'
      case 'deposit':
        return `Buy ${transaction.side || 'Unknown'}`
      case 'claim':
        return 'Claim Winnings'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">
              Your trading activity will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            {transactions.length > maxItems && !showAll && (
              <Badge variant="outline" className="text-xs">
                +{transactions.length - maxItems} more
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearOldTransactions(1)}
              className="text-xs"
            >
              Clear Old
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayTransactions.map((transaction, index) => (
          <div key={transaction.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.type, transaction.side)}
                  {getStatusIcon(transaction.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getTypeLabel(transaction)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getStatusColor(transaction.status))}
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTimestamp(transaction.timestamp)}</span>
                    {transaction.amount && (
                      <>
                        <span>•</span>
                        <span>{transaction.amount} USDC</span>
                      </>
                    )}
                    {transaction.confirmations && (
                      <>
                        <span>•</span>
                        <span>{transaction.confirmations} confirmations</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {transaction.hash && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${transaction.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Arbiscan"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            
            {transaction.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {transaction.error}
                </p>
              </div>
            )}
            
            {transaction.gasUsed && (
              <div className="mt-1 text-xs text-muted-foreground">
                Gas used: {transaction.gasUsed}
              </div>
            )}
            
            {index < displayTransactions.length - 1 && (
              <Separator className="mt-3" />
            )}
          </div>
        ))}
        
        {!showAll && transactions.length > maxItems && (
          <>
            <Separator />
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                View All {transactions.length} Transactions
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for trading interface
export function TransactionStatus({ marketId }: { marketId: string }) {
  const transactions = useTransactionsByMarket(marketId)
  const latestTransaction = transactions[0]
  
  if (!latestTransaction || latestTransaction.status === 'success') {
    return null
  }
  
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        {getStatusIcon(latestTransaction.status)}
        <span className="text-sm font-medium">
          {getTypeLabel(latestTransaction)}
        </span>
      </div>
      <Badge 
        variant="outline" 
        className={cn("text-xs", getStatusColor(latestTransaction.status))}
      >
        {latestTransaction.status}
      </Badge>
      {latestTransaction.hash && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-6 w-6 p-0 ml-auto"
        >
          <a
            href={`https://sepolia.arbiscan.io/tx/${latestTransaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  )
}

// Helper functions extracted to avoid duplication
function getStatusIcon(status: Transaction['status']) {
  switch (status) {
    case 'pending':
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    case 'confirming':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
  }
}

function getStatusColor(status: Transaction['status']) {
  switch (status) {
    case 'pending':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'confirming':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
}

function getTypeLabel(transaction: Transaction) {
  switch (transaction.type) {
    case 'approval':
      return 'USDC Approval'
    case 'deposit':
      return `Buy ${transaction.side || 'Unknown'}`
    case 'claim':
      return 'Claim Winnings'
  }
}