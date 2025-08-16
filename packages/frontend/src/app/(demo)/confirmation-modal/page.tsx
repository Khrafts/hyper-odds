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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { 
  TransactionConfirmationModal, 
  useTransactionConfirmation,
  type TransactionDetails 
} from '@/components/trading/transaction-confirmation-modal'
import { type GasEstimates } from '@/lib/gas'

export default function ConfirmationModalPage() {
  const [amount, setAmount] = useState('100')
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [marketTitle, setMarketTitle] = useState('Will ETH reach $5000 by end of 2024?')
  
  const {
    isOpen,
    details,
    isLoading,
    error,
    showConfirmation,
    hideConfirmation,
    setConfirmationLoading,
    setConfirmationError,
  } = useTransactionConfirmation()

  // Mock gas estimates
  const mockGasEstimates: GasEstimates = {
    slow: {
      gasLimit: 65000n,
      gasPrice: 20000000000n,
      totalCost: 1300000000000000n,
      totalCostFormatted: '0.0013 ETH',
      isEIP1559: false,
      speed: 'slow',
    },
    standard: {
      gasLimit: 65000n,
      gasPrice: 25000000000n,
      totalCost: 1625000000000000n,
      totalCostFormatted: '0.0016 ETH',
      isEIP1559: false,
      speed: 'standard',
    },
    fast: {
      gasLimit: 65000n,
      gasPrice: 30000000000n,
      totalCost: 1950000000000000n,
      totalCostFormatted: '0.0020 ETH',
      isEIP1559: false,
      speed: 'fast',
    },
    instant: {
      gasLimit: 65000n,
      gasPrice: 40000000000n,
      totalCost: 2600000000000000n,
      totalCostFormatted: '0.0026 ETH',
      isEIP1559: false,
      speed: 'instant',
    },
  }

  const testApprovalModal = () => {
    const details: TransactionDetails = {
      type: 'approval',
      amount,
      marketTitle,
      gasEstimates: mockGasEstimates,
      selectedGasSpeed: 'standard',
      userBalance: '1000.50',
    }
    showConfirmation(details)
  }

  const testDepositModal = () => {
    const details: TransactionDetails = {
      type: 'deposit',
      side: selectedSide,
      amount,
      marketTitle,
      currentProbability: selectedSide === 'YES' ? 65.2 : 34.8,
      newProbability: selectedSide === 'YES' ? 67.1 : 32.9,
      estimatedShares: (parseFloat(amount) * 1.2).toFixed(4),
      potentialReturn: {
        profit: parseFloat(amount) * 0.25,
        roi: 25.0,
      },
      gasEstimates: mockGasEstimates,
      selectedGasSpeed: 'standard',
      userBalance: '1000.50',
    }
    showConfirmation(details)
  }

  const testDepositWithApprovalModal = () => {
    const details: TransactionDetails = {
      type: 'deposit',
      side: selectedSide,
      amount,
      marketTitle,
      currentProbability: selectedSide === 'YES' ? 65.2 : 34.8,
      newProbability: selectedSide === 'YES' ? 67.1 : 32.9,
      estimatedShares: (parseFloat(amount) * 1.2).toFixed(4),
      potentialReturn: {
        profit: parseFloat(amount) * 0.25,
        roi: 25.0,
      },
      gasEstimates: mockGasEstimates,
      selectedGasSpeed: 'standard',
      needsApproval: true,
      userBalance: '1000.50',
    }
    showConfirmation(details)
  }

  const testClaimModal = () => {
    const details: TransactionDetails = {
      type: 'claim',
      amount: '250.75',
      marketTitle,
      gasEstimates: mockGasEstimates,
      selectedGasSpeed: 'standard',
      userBalance: '1000.50',
    }
    showConfirmation(details)
  }

  const testInsufficientBalanceModal = () => {
    const details: TransactionDetails = {
      type: 'deposit',
      side: selectedSide,
      amount: '2000', // More than balance
      marketTitle,
      currentProbability: selectedSide === 'YES' ? 65.2 : 34.8,
      newProbability: selectedSide === 'YES' ? 67.1 : 32.9,
      estimatedShares: '2400.0000',
      potentialReturn: {
        profit: 500,
        roi: 25.0,
      },
      gasEstimates: mockGasEstimates,
      selectedGasSpeed: 'standard',
      userBalance: '1000.50',
    }
    showConfirmation(details)
  }

  const simulateLoading = () => {
    setConfirmationLoading(true)
    setTimeout(() => {
      setConfirmationLoading(false)
      hideConfirmation()
    }, 3000)
  }

  const simulateError = () => {
    setConfirmationError('User rejected the transaction in their wallet')
  }

  const handleConfirm = () => {
    // Simulate different outcomes
    const random = Math.random()
    if (random < 0.3) {
      simulateError()
    } else if (random < 0.6) {
      simulateLoading()
    } else {
      hideConfirmation()
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaction Confirmation Modal Demo</h1>
        <p className="text-muted-foreground">
          Test the transaction confirmation modal with different scenarios and transaction types
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Modal Test Controls</CardTitle>
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

            <div>
              <Label htmlFor="marketTitle">Market Title</Label>
              <Input
                id="marketTitle"
                value={marketTitle}
                onChange={(e) => setMarketTitle(e.target.value)}
                placeholder="Market question..."
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={testApprovalModal}
                size="sm"
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Approval
              </Button>
              
              <Button
                onClick={testDepositModal}
                size="sm"
                variant="outline"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Test Deposit
              </Button>
              
              <Button
                onClick={testDepositWithApprovalModal}
                size="sm"
                variant="outline"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Deposit + Approval
              </Button>
              
              <Button
                onClick={testClaimModal}
                size="sm"
                variant="outline"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Test Claim
              </Button>
              
              <Button
                onClick={testInsufficientBalanceModal}
                size="sm"
                variant="destructive"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Balance
              </Button>
              
              <Button
                onClick={() => setConfirmationError(null)}
                size="sm"
                variant="ghost"
              >
                Clear Error
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal State */}
        <Card>
          <CardHeader>
            <CardTitle>Modal State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Open:</span>
                <Badge variant={isOpen ? 'default' : 'outline'} className="ml-2">
                  {isOpen ? 'True' : 'False'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Loading:</span>
                <Badge variant={isLoading ? 'destructive' : 'outline'} className="ml-2">
                  {isLoading ? 'True' : 'False'}
                </Badge>
              </div>
            </div>

            {details && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Current Details:</p>
                <div className="text-xs space-y-1">
                  <div>Type: <Badge variant="outline">{details.type}</Badge></div>
                  {details.side && <div>Side: <Badge variant="outline">{details.side}</Badge></div>}
                  {details.amount && <div>Amount: {details.amount} USDC</div>}
                  {details.needsApproval && <div>Needs Approval: Yes</div>}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Test Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={simulateLoading}
                  disabled={!isOpen}
                  size="sm"
                  variant="outline"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Simulate Loading
                </Button>
                
                <Button
                  onClick={simulateError}
                  disabled={!isOpen}
                  size="sm"
                  variant="outline"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Simulate Error
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Modal Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Transaction Types:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Approval: USDC spending approval</li>
                <li>• Deposit: YES/NO share purchase</li>
                <li>• Claim: Winning payout claims</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Gas fee estimation display</li>
                <li>• Transaction detail breakdown</li>
                <li>• Balance validation</li>
                <li>• Error handling and loading states</li>
                <li>• Probability impact calculation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Confirmation Modal */}
      {details && (
        <TransactionConfirmationModal
          open={isOpen}
          onOpenChange={hideConfirmation}
          onConfirm={handleConfirm}
          onCancel={hideConfirmation}
          details={details}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  )
}