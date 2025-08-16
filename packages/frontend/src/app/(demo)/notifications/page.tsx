'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { 
  notifications, 
  transactionNotifications, 
  marketNotifications,
  connectionNotifications,
  toast 
} from '@/lib/notifications'

export default function NotificationsPage() {
  const [amount, setAmount] = useState('100')
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [marketTitle, setMarketTitle] = useState('Will ETH reach $5000 by end of 2024?')

  // Test transaction notifications
  const testApprovalFlow = async () => {
    // Step 1: Show approval started
    const toastId = transactionNotifications.approvalStarted(amount)
    
    // Step 2: After 2 seconds, show pending
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.transactionPending('approval', mockTxHash, toastId)
    }, 2000)
    
    // Step 3: After 5 seconds, show confirmed
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.approvalConfirmed(amount, mockTxHash, toastId)
    }, 5000)
  }

  const testDepositFlow = async () => {
    // Step 1: Show deposit started
    const toastId = transactionNotifications.depositStarted(selectedSide, amount)
    
    // Step 2: After 2 seconds, show pending
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.transactionPending('deposit', mockTxHash, toastId)
    }, 2000)
    
    // Step 3: After 6 seconds, show confirmed
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.depositConfirmed(selectedSide, amount, mockTxHash, toastId)
    }, 6000)
  }

  const testClaimFlow = async () => {
    // Step 1: Show claim started
    const toastId = transactionNotifications.claimStarted()
    
    // Step 2: After 2 seconds, show pending
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.transactionPending('claim', mockTxHash, toastId)
    }, 2000)
    
    // Step 3: After 4 seconds, show confirmed
    setTimeout(() => {
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      transactionNotifications.claimConfirmed(amount, mockTxHash, toastId)
    }, 4000)
  }

  const testFailedTransaction = () => {
    const toastId = transactionNotifications.approvalStarted(amount)
    
    setTimeout(() => {
      transactionNotifications.transactionFailed('approval', 'User rejected the request', toastId)
    }, 2000)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification System Demo</h1>
        <p className="text-muted-foreground">
          Test the Sonner-based notification system for all app interactions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transaction Notifications
            </CardTitle>
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
              <Button onClick={testApprovalFlow} size="sm" variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Approval
              </Button>
              
              <Button onClick={testDepositFlow} size="sm" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Test Deposit
              </Button>
              
              <Button onClick={testClaimFlow} size="sm" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Test Claim
              </Button>
              
              <Button onClick={testFailedTransaction} size="sm" variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Test Failure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* General Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              General Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => notifications.success('Operation completed successfully!')} 
                size="sm" 
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Success
              </Button>
              
              <Button 
                onClick={() => notifications.error('Something went wrong', {
                  description: 'Please try again later'
                })} 
                size="sm" 
                variant="outline"
              >
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Error
              </Button>
              
              <Button 
                onClick={() => notifications.info('New market available', {
                  description: 'Check out the latest prediction market'
                })} 
                size="sm" 
                variant="outline"
              >
                <Info className="h-4 w-4 mr-2 text-blue-500" />
                Info
              </Button>
              
              <Button 
                onClick={() => notifications.warning('High gas fees detected', {
                  description: 'Consider waiting for lower fees'
                })} 
                size="sm" 
                variant="outline"
              >
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                Warning
              </Button>
              
              <Button 
                onClick={() => {
                  const promise = new Promise((resolve) => 
                    setTimeout(resolve, 3000)
                  )
                  notifications.promise(promise, {
                    loading: 'Loading data...',
                    success: 'Data loaded successfully!',
                    error: 'Failed to load data'
                  })
                }} 
                size="sm" 
                variant="outline"
                className="col-span-2"
              >
                <Clock className="h-4 w-4 mr-2" />
                Test Promise
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Market Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="marketTitle">Market Title</Label>
              <Input
                id="marketTitle"
                value={marketTitle}
                onChange={(e) => setMarketTitle(e.target.value)}
                placeholder="Market question..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => marketNotifications.marketResolved(marketTitle, 'YES')} 
                size="sm" 
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                YES Resolved
              </Button>
              
              <Button 
                onClick={() => marketNotifications.marketResolved(marketTitle, 'NO')} 
                size="sm" 
                variant="outline"
              >
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                NO Resolved
              </Button>
              
              <Button 
                onClick={() => marketNotifications.marketExpired(marketTitle)} 
                size="sm" 
                variant="outline"
              >
                <Clock className="h-4 w-4 mr-2" />
                Market Expired
              </Button>
              
              <Button 
                onClick={() => marketNotifications.insufficientBalance('500', '250')} 
                size="sm" 
                variant="outline"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Low Balance
              </Button>
              
              <Button 
                onClick={() => marketNotifications.walletNotConnected()} 
                size="sm" 
                variant="outline"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Not Connected
              </Button>
              
              <Button 
                onClick={() => marketNotifications.networkError()} 
                size="sm" 
                variant="outline"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Network Error
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Connection Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => connectionNotifications.walletConnected('0x1234567890abcdef1234567890abcdef12345678')} 
                size="sm" 
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Connected
              </Button>
              
              <Button 
                onClick={() => connectionNotifications.walletDisconnected()} 
                size="sm" 
                variant="outline"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Disconnected
              </Button>
              
              <Button 
                onClick={() => connectionNotifications.networkSwitched('Arbitrum Sepolia')} 
                size="sm" 
                variant="outline"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Network Switch
              </Button>
              
              <Button 
                onClick={() => connectionNotifications.wrongNetwork('Arbitrum One')} 
                size="sm" 
                variant="outline"
              >
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                Wrong Network
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Toast Examples */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Custom Toast Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => toast('Simple message')} 
              variant="outline"
            >
              Simple Toast
            </Button>
            
            <Button 
              onClick={() => toast('Custom toast', {
                description: 'This is a custom description',
                action: {
                  label: 'Action',
                  onClick: () => console.log('Action clicked')
                }
              })} 
              variant="outline"
            >
              With Action
            </Button>
            
            <Button 
              onClick={() => toast('Rich content', {
                description: 'This toast will stay for 10 seconds',
                duration: 10000
              })} 
              variant="outline"
            >
              Long Duration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}