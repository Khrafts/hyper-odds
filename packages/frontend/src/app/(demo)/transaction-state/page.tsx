'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { useTradingStore, useTransactionsByMarket, useTradingStateFor } from '@/stores/useTradingStore'
import { TransactionHistory, TransactionStatus } from '@/components/trading/transactionHistory'
import { cn } from '@/lib/utils'

export default function TransactionStatePage() {
  const [testMarketId] = useState('0x89b371a0a56713C3E660C9eFCe659853c755dDF9')
  const [amount, setAmount] = useState('100')
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [mounted, setMounted] = useState(false)
  
  // Ensure client-side only to prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const {
    addTransaction,
    updateTransaction,
    setTradingState,
    clearError,
    startApproval,
    startDeposit,
    startClaim,
    completeTransaction,
    failTransaction,
    setOptimisticBalance,
    setOptimisticPools,
    clearOptimisticUpdates,
    clearOldTransactions,
    tradingState,
    transactions,
    marketStates
  } = useTradingStore()
  
  const marketTransactions = useTransactionsByMarket(testMarketId)
  const marketTradingState = useTradingStateFor(testMarketId)
  
  if (!mounted) {
    return <div>Loading...</div>
  }
  
  // Simulate transaction flows
  const simulateApproval = async () => {
    const txId = startApproval(testMarketId, amount)
    
    // Simulate pending state
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      updateTransaction(txId, { 
        hash: mockTxHash, 
        status: 'confirming' 
      })
      
      // Simulate confirmation after delay
      setTimeout(() => {
        completeTransaction(mockTxHash, Math.floor(Math.random() * 1000000), '21000')
      }, 2000)
    }, 1000)
  }
  
  const simulateDeposit = async () => {
    const txId = startDeposit(testMarketId, selectedSide, amount)
    
    // Simulate pending state
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      updateTransaction(txId, { 
        hash: mockTxHash, 
        status: 'confirming' 
      })
      
      // Simulate confirmation after delay
      setTimeout(() => {
        completeTransaction(mockTxHash, Math.floor(Math.random() * 1000000), '45000')
      }, 3000)
    }, 1000)
  }
  
  const simulateClaim = async () => {
    const txId = startClaim(testMarketId)
    
    // Simulate pending state
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      updateTransaction(txId, { 
        hash: mockTxHash, 
        status: 'confirming' 
      })
      
      // Simulate confirmation after delay
      setTimeout(() => {
        completeTransaction(mockTxHash, Math.floor(Math.random() * 1000000), '30000')
      }, 2500)
    }, 1000)
  }
  
  const simulateFailedTransaction = () => {
    const txId = addTransaction({
      type: 'deposit',
      marketId: testMarketId,
      side: selectedSide,
      amount: amount,
      status: 'pending',
    })
    
    setTimeout(() => {
      updateTransaction(txId, {
        status: 'failed',
        error: 'Insufficient USDC balance for transaction'
      })
      failTransaction('Insufficient USDC balance for transaction')
    }, 1500)
  }
  
  const testOptimisticUpdates = () => {
    setOptimisticBalance(testMarketId, '5000.50')
    setOptimisticPools(testMarketId, '2500.25', '2500.25')
    
    // Clear after delay
    setTimeout(() => {
      clearOptimisticUpdates(testMarketId)
    }, 5000)
  }
  
  const clearAllTransactions = () => {
    Object.keys(transactions).forEach(txId => {
      if (transactions[txId].marketId === testMarketId) {
        updateTransaction(txId, { status: 'success' })
      }
    })
    clearOldTransactions(0) // Clear all transactions
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaction State Management Demo</h1>
        <p className="text-muted-foreground">
          Test the Zustand-based transaction state management system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (USDC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Side</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant={selectedSide === 'YES' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSide('YES')}
                      className="flex-1"
                    >
                      YES
                    </Button>
                    <Button
                      variant={selectedSide === 'NO' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSide('NO')}
                      className="flex-1"
                    >
                      NO
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={simulateApproval}
                  disabled={tradingState.isLoading}
                  variant="outline"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Approval
                </Button>
                
                <Button
                  onClick={simulateDeposit}
                  disabled={tradingState.isLoading}
                  variant="outline"
                  size="sm"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Test Deposit
                </Button>
                
                <Button
                  onClick={simulateClaim}
                  disabled={tradingState.isLoading}
                  variant="outline"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Test Claim
                </Button>
                
                <Button
                  onClick={simulateFailedTransaction}
                  disabled={tradingState.isLoading}
                  variant="destructive"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Test Failure
                </Button>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={testOptimisticUpdates}
                  variant="secondary"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Optimistic
                </Button>
                
                <Button
                  onClick={clearAllTransactions}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current State */}
          <Card>
            <CardHeader>
              <CardTitle>Current Trading State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Loading:</span>
                  <Badge variant={tradingState.isLoading ? 'destructive' : 'outline'} className="ml-2">
                    {tradingState.isLoading ? 'True' : 'False'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Stage:</span>
                  <Badge variant="outline" className="ml-2">
                    {tradingState.stage}
                  </Badge>
                </div>
              </div>
              
              {tradingState.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {tradingState.error}
                  </p>
                  <Button
                    onClick={clearError}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-600"
                  >
                    Clear Error
                  </Button>
                </div>
              )}
              
              {tradingState.currentTransaction && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium mb-1">Current Transaction</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Type: {tradingState.currentTransaction.type}</div>
                    <div>Status: {tradingState.currentTransaction.status}</div>
                    {tradingState.currentTransaction.hash && (
                      <div className="font-mono">Hash: {tradingState.currentTransaction.hash.slice(0, 10)}...</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market State */}
          <Card>
            <CardHeader>
              <CardTitle>Market State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimistic Balance:</span>
                  <span>{marketStates[testMarketId]?.optimisticBalance || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimistic YES Pool:</span>
                  <span>{marketStates[testMarketId]?.optimisticPoolYes || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimistic NO Pool:</span>
                  <span>{marketStates[testMarketId]?.optimisticPoolNo || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Update:</span>
                  <span>
                    {marketStates[testMarketId]?.lastUpdateTimestamp 
                      ? new Date(marketStates[testMarketId].lastUpdateTimestamp).toLocaleTimeString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History and Status */}
        <div className="space-y-6">
          <TransactionStatus marketId={testMarketId} />
          
          <TransactionHistory 
            marketId={testMarketId} 
            showAll={true}
          />
          
          {/* Store Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Store Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(transactions).length}
                  </div>
                  <div className="text-muted-foreground">Total Transactions</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {marketTransactions.length}
                  </div>
                  <div className="text-muted-foreground">Market Transactions</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {marketTransactions.filter(tx => tx.status === 'pending' || tx.status === 'confirming').length}
                  </div>
                  <div className="text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {marketTransactions.filter(tx => tx.status === 'failed').length}
                  </div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}