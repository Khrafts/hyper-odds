'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  DollarSign,
  Fuel,
  Clock,
  AlertTriangle,
  Info,
  ArrowRight,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GasFeeInline } from './gasFeeDisplay'
import { type GasEstimates, type GasSpeed } from '@/lib/gas'

export interface TransactionDetails {
  type: 'approval' | 'deposit' | 'claim'
  side?: 'YES' | 'NO'
  amount?: string
  marketTitle?: string
  currentProbability?: number
  newProbability?: number
  estimatedShares?: string
  potentialReturn?: {
    profit: number
    roi: number
  }
  gasEstimates?: GasEstimates
  selectedGasSpeed?: GasSpeed
  needsApproval?: boolean
  userBalance?: string
}

interface TransactionConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  details: TransactionDetails
  isLoading?: boolean
  error?: string | null
}

export function TransactionConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  details,
  isLoading = false,
  error,
}: TransactionConfirmationModalProps) {
  const {
    type,
    side,
    amount,
    marketTitle,
    currentProbability,
    newProbability,
    estimatedShares,
    potentialReturn,
    gasEstimates,
    selectedGasSpeed = 'standard',
    needsApproval,
    userBalance,
  } = details

  const getTransactionIcon = () => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-6 w-6 text-blue-500" />
      case 'deposit':
        return side === 'YES' 
          ? <TrendingUp className="h-6 w-6 text-green-500" />
          : <TrendingDown className="h-6 w-6 text-red-500" />
      case 'claim':
        return <DollarSign className="h-6 w-6 text-yellow-500" />
    }
  }

  const getTransactionTitle = () => {
    switch (type) {
      case 'approval':
        return 'Approve USDC Spending'
      case 'deposit':
        return `Buy ${side} Shares`
      case 'claim':
        return 'Claim Winnings'
    }
  }

  const getTransactionDescription = () => {
    switch (type) {
      case 'approval':
        return `Allow the market contract to spend up to ${amount} USDC from your wallet. This is required before making a prediction.`
      case 'deposit':
        return `Stake ${amount} USDC on ${side}. You'll receive ${estimatedShares} effective shares based on time multiplier.`
      case 'claim':
        return 'Claim your winnings from resolved markets. This will transfer your payout to your wallet.'
    }
  }

  const isValidTransaction = amount && parseFloat(amount) > 0 && (!userBalance || parseFloat(amount) <= parseFloat(userBalance))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getTransactionIcon()}
            {getTransactionTitle()}
          </DialogTitle>
          <DialogDescription>
            {getTransactionDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Market Information */}
          {marketTitle && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium mb-1">Market</div>
              <div className="text-sm text-muted-foreground">{marketTitle}</div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="space-y-3">
            {type === 'approval' && amount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approval Amount</span>
                <span className="font-medium">{amount} USDC</span>
              </div>
            )}

            {type === 'deposit' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Investment</span>
                  <span className="font-medium">{amount} USDC</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Side</span>
                  <Badge variant={side === 'YES' ? 'default' : 'destructive'}>
                    {side}
                  </Badge>
                </div>

                {estimatedShares && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Shares</span>
                    <span className="font-medium">{estimatedShares}</span>
                  </div>
                )}

                {currentProbability !== undefined && newProbability !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{side} Probability</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {currentProbability.toFixed(1)}%
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">
                        {newProbability.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {potentialReturn && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Potential Return</span>
                    <span className={cn(
                      "font-medium",
                      potentialReturn.profit > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {potentialReturn.profit > 0 ? '+' : ''}{potentialReturn.profit.toFixed(2)} USDC
                      ({potentialReturn.roi > 0 ? '+' : ''}{potentialReturn.roi.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </>
            )}

            {userBalance && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Balance</span>
                <span className="font-medium">{parseFloat(userBalance).toFixed(2)} USDC</span>
              </div>
            )}

            {/* Gas Fee */}
            {gasEstimates && selectedGasSpeed && (
              <>
                <Separator />
                <GasFeeInline
                  gasEstimates={gasEstimates}
                  selectedSpeed={selectedGasSpeed}
                  transactionType={type}
                />
              </>
            )}
          </div>

          {/* Warnings and Info */}
          {needsApproval && type === 'deposit' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This transaction requires USDC approval first. You'll need to confirm two transactions.
              </AlertDescription>
            </Alert>
          )}

          {!isValidTransaction && amount && userBalance && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need at least {amount} USDC to complete this transaction.
              </AlertDescription>
            </Alert>
          )}

          {type === 'deposit' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Parimutuel market: If you win, you receive your deposit plus your proportional share of the losing side's pool. If you lose, you receive nothing.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || !isValidTransaction}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing confirmation modal state
export function useTransactionConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [details, setDetails] = React.useState<TransactionDetails | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const showConfirmation = React.useCallback((transactionDetails: TransactionDetails) => {
    setDetails(transactionDetails)
    setError(null)
    setIsOpen(true)
  }, [])

  const hideConfirmation = React.useCallback(() => {
    setIsOpen(false)
    setIsLoading(false)
    setError(null)
    // Small delay before clearing details to allow for exit animation
    setTimeout(() => setDetails(null), 200)
  }, [])

  const setConfirmationLoading = React.useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const setConfirmationError = React.useCallback((error: string | null) => {
    setError(error)
  }, [])

  return {
    isOpen,
    details,
    isLoading,
    error,
    showConfirmation,
    hideConfirmation,
    setConfirmationLoading,
    setConfirmationError,
  }
}