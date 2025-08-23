'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { usePrivy } from '@privy-io/react-auth'
import { formatUnits } from 'viem'
import { Market } from '@/hooks/useMarkets'
import { calculateMarketProbabilities } from '@/lib/probability'
import { cn } from '@/lib/utils'
import { 
  validateTradingAmount, 
  validateMarketState,
  TradingSide,
  tradingFormSchema,
  type TradingFormData 
} from '@/lib/validations/trading'
import { useTradingHooks } from '@/hooks/useTradingHooks'
import { 
  TransactionConfirmationModal, 
  useTransactionConfirmation,
  type TransactionDetails 
} from '@/components/trading/transactionConfirmationModal'

interface TradingInterfaceProps {
  market: Market
  yesDisplay: string
  noDisplay: string
  yesProb: number
  noProb: number
  onTrade?: (side: 'YES' | 'NO', amount: string) => Promise<void>
  onTransactionSuccess?: () => Promise<void>
  disabled?: boolean
}

export function TradingInterface({ market, yesDisplay, noDisplay, yesProb, noProb, onTrade, onTransactionSuccess, disabled = false }: TradingInterfaceProps) {
  const { address, isConnected } = useWallet()
  const { login } = usePrivy()
  
  // Use trading hooks for contract integration
  const {
    deposit,
    approveUSDC,
    approveAndDeposit,
    needsApproval,
    tradingState,
    usdcBalance,
    formattedBalance,
    resetTradingState,
    // Gas estimation
    gasEstimates,
    selectedGasSpeed,
    setSelectedGasSpeed,
    updateApprovalGasEstimate,
    updateDepositGasEstimate,
    getCurrentGasEstimate,
    isGasLoading,
    gasError,
    clearGasError,
    // Balance refresh
    refetchContractData,
  } = useTradingHooks(market.id as `0x${string}`)
  
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [slippage, setSlippage] = useState(1) // 1% default slippage
  const [showTooltip, setShowTooltip] = useState(false)
  const [isTransactionAttempting, setIsTransactionAttempting] = useState(false)

  // Helper to clear errors on user interaction
  const clearErrorsOnInteraction = useCallback(() => {
    console.log('Clearing errors on interaction:', { error, tradingStateError: tradingState.error?.message })
    
    // Always clear local error on interaction
    if (error) {
      console.log('Clearing local error:', error)
      setError(null)
    }
    
    // Clear trading state error if it's a user cancellation or any error state
    if (tradingState.error || tradingState.isError) {
      console.log('Clearing trading state error')
      resetTradingState()
    }
    
    // Reset transaction attempting flag
    setIsTransactionAttempting(false)
  }, [error, tradingState.error?.message, tradingState.isError]) // Remove resetTradingState from dependencies

  // Helper function to clean up error messages
  const cleanErrorMessage = useCallback((errorMessage: string) => {
    if (!errorMessage) return 'Unknown error'
    
    // Check for user rejection patterns
    if (errorMessage.toLowerCase().includes('user rejected') || 
        errorMessage.toLowerCase().includes('user denied') ||
        errorMessage.toLowerCase().includes('user cancelled')) {
      return 'Transaction cancelled'
    }
    
    // Handle common error patterns
    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient funds'
    }
    if (errorMessage.includes('gas')) {
      return 'Gas estimation failed'
    }
    if (errorMessage.includes('network')) {
      return 'Network error'
    }
    
    // Remove technical details
    const cleanMessage = errorMessage
      .split('Request Arguments:')[0]
      .split('Contract Call:')[0]
      .split('Docs:')[0]
      .split('Details:')[0]
      .split('Version:')[0]
      .replace(/\n.*$/s, '') // Remove everything after first newline
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // Return clean message or fallback
    return cleanMessage && cleanMessage.length <= 50 ? cleanMessage : 'Transaction failed'
  }, [])

  // Transaction confirmation modal
  const {
    isOpen: isConfirmationOpen,
    details: confirmationDetails,
    isLoading: isConfirmationLoading,
    error: confirmationError,
    showConfirmation,
    hideConfirmation,
    setConfirmationLoading,
    setConfirmationError,
  } = useTransactionConfirmation()

  // Gas estimation is now done lazily when user clicks trade button to prevent excessive RPC calls

  // Call success callback when transaction completes
  useEffect(() => {
    if (tradingState.isSuccess && tradingState.stage === 'completed' && onTransactionSuccess) {
      onTransactionSuccess()
    }
  }, [tradingState.isSuccess, tradingState.stage, onTransactionSuccess])

  // Auto-clear user cancellation errors after a short delay
  useEffect(() => {
    if (tradingState.error?.message && 
        (tradingState.error.message.toLowerCase().includes('cancelled') ||
         tradingState.error.message.toLowerCase().includes('rejected'))) {
      const timer = setTimeout(() => {
        resetTradingState()
        setError(null)
        hideConfirmation()
      }, 3000) // Clear after 3 seconds
      
      return () => clearTimeout(timer)
    }
  }, [tradingState.error?.message]) // Only depend on the error message, not the functions

  // Clear errors when component mounts (e.g., when sidebar reopens)
  useEffect(() => {
    // Clear any lingering cancellation errors when component mounts
    if (tradingState.error?.message && 
        (tradingState.error.message.toLowerCase().includes('cancelled') ||
         tradingState.error.message.toLowerCase().includes('rejected'))) {
      resetTradingState()
      setError(null)
    }
  }, []) // Only run on mount - no dependencies to avoid infinite loop

  // Periodic balance refresh to prevent stale data
  useEffect(() => {
    if (!isConnected || !refetchContractData) return

    // Refresh balance every 30 seconds when trading interface is open
    const interval = setInterval(() => {
      refetchContractData()
    }, 30000) // 30 seconds

    // Also refresh when the component mounts
    refetchContractData()

    return () => clearInterval(interval)
  }, [isConnected, refetchContractData])

  // Refresh balance when user reconnects or addresses change
  useEffect(() => {
    if (isConnected && refetchContractData) {
      refetchContractData()
    }
  }, [isConnected, address, refetchContractData])

  // Use probability values passed as props for consistency across all components

  // Calculate time multiplier based on contract logic
  const timeMultiplier = useMemo(() => {
    const now = Date.now() / 1000 // Current time in seconds
    const cutoffTime = parseInt(market.cutoffTime || '0')
    const createdAt = parseInt(market.createdAt || '0')
    
    // Use timeDecayBps from market data (fetched from indexer/contract)
    const timeDecayBps = market.timeDecayBps || 2000 // Default 20% spread if not available
    
    if (timeDecayBps === 0) return 1.0 // No decay
    
    const timeRemaining = cutoffTime > now ? cutoffTime - now : 0
    const totalMarketTime = cutoffTime - createdAt
    
    if (totalMarketTime === 0) return 1.0 // Prevent division by zero
    
    const timeRatio = Math.min(timeRemaining / totalMarketTime, 1.0)
    
    // Contract formula from ParimutuelMarketImplementation.sol:
    // multiplier = 10000 - halfSpread + (timeRatio * timeDecayBps) / 10000
    const halfSpread = timeDecayBps / 2
    const multiplierBps = 10000 - halfSpread + (timeRatio * timeDecayBps) / 10000
    
    // Convert from basis points to decimal
    return multiplierBps / 10000
  }, [market.cutoffTime, market.createdAt])

  // Calculate effective shares (what you actually get)
  const estimatedShares = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0'
    
    const depositAmount = parseFloat(amount)
    
    // Parimutuel: base shares = deposit amount, but effective shares are modified by time multiplier
    // For payout calculations, effective shares matter
    const effectiveShares = depositAmount * timeMultiplier
    return effectiveShares.toFixed(4)
  }, [amount, timeMultiplier])

  // Calculate price per share based on time multiplier
  const pricePerShare = useMemo(() => {
    if (timeMultiplier === 0) return 1.0
    // Price per effective share = 1 / timeMultiplier
    // If timeMultiplier < 1 (late entry), you pay more per effective share
    // If timeMultiplier > 1 (early entry), you pay less per effective share
    return 1 / timeMultiplier
  }, [timeMultiplier])

  // Calculate potential return based on effective shares (contract logic)
  const potentialReturn = useMemo(() => {
    const investment = parseFloat(amount || '0')
    
    if (investment === 0) return { profit: 0, roi: 0 }
    
    const yesPool = parseFloat(market.poolYes || '0')
    const noPool = parseFloat(market.poolNo || '0')
    
    // Calculate your effective shares with time multiplier
    const yourEffectiveShares = investment * timeMultiplier
    
    // After your deposit, estimate total effective shares for your side
    // Note: We can't know exact effective shares of existing holders without their timestamps,
    // so we approximate by assuming average time multiplier of 1.0 for existing pools
    const existingYesEffectiveShares = yesPool * 1.0 // Approximate
    const existingNoEffectiveShares = noPool * 1.0 // Approximate
    
    const totalYesEffectiveShares = selectedSide === 'YES' 
      ? existingYesEffectiveShares + yourEffectiveShares 
      : existingYesEffectiveShares
    const totalNoEffectiveShares = selectedSide === 'NO'
      ? existingNoEffectiveShares + yourEffectiveShares
      : existingNoEffectiveShares
    
    // After deposit, calculate losing and winning pools (raw USDC)
    const newYesPool = selectedSide === 'YES' ? yesPool + investment : yesPool
    const newNoPool = selectedSide === 'NO' ? noPool + investment : noPool
    
    const losingPool = selectedSide === 'YES' ? newNoPool : newYesPool
    const totalWinningEffectiveShares = selectedSide === 'YES' ? totalYesEffectiveShares : totalNoEffectiveShares
    
    if (totalWinningEffectiveShares === 0) return { profit: 0, roi: 0 }
    
    // Contract logic: payout = userActualStake + (availableWinnings * userEffectiveStake) / totalWinningEffectiveStakes
    const feeRate = 0.05 // 5% fee on losing pool
    const availableWinnings = losingPool * (1 - feeRate)
    const winningsShare = (availableWinnings * yourEffectiveShares) / totalWinningEffectiveShares
    
    // Total payout = your original investment back + your share of winnings
    const totalPayout = investment + winningsShare
    const profit = totalPayout - investment
    const roi = (profit / investment) * 100
    
    return { profit, roi }
  }, [amount, selectedSide, market.poolYes, market.poolNo, timeMultiplier])

  // Calculate new probability after trade
  const newProbability = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return selectedSide === 'YES' ? yesProb : noProb
    }
    
    const depositAmount = parseFloat(amount)
    const yesPool = parseFloat(market.poolYes || '0')
    const noPool = parseFloat(market.poolNo || '0')
    
    const newYesPool = selectedSide === 'YES' 
      ? yesPool + depositAmount 
      : yesPool
    const newNoPool = selectedSide === 'NO'
      ? noPool + depositAmount
      : noPool
    
    const total = newYesPool + newNoPool
    
    if (selectedSide === 'YES') {
      return (newYesPool / total) * 100
    } else {
      return (newNoPool / total) * 100
    }
  }, [amount, selectedSide, market.poolYes, market.poolNo, yesProb, noProb])

  // Comprehensive validation using validation schemas
  const validation = useMemo(() => {
    if (!isConnected) {
      return { isValid: false, message: 'Connect wallet to trade', type: 'wallet' as const }
    }
    
    if (!amount || amount.trim() === '') {
      return { isValid: false, message: 'Enter an amount', type: 'amount' as const }
    }
    
    // Validate market state
    const marketState = validateMarketState(market)
    if (!marketState.canTrade) {
      return { 
        isValid: false, 
        message: marketState.reason || 'Cannot trade on this market', 
        type: 'market' as const 
      }
    }
    
    // Validate trading amount
    const amountValidation = validateTradingAmount(
      amount,
      usdcBalance,
      '1', // min amount
      '1000000'   // max amount
    )
    
    if (!amountValidation.isValid) {
      return { 
        isValid: false, 
        message: amountValidation.error || 'Invalid amount', 
        type: 'amount' as const 
      }
    }
    
    // Validate form data structure
    try {
      const formData: TradingFormData = {
        side: selectedSide as TradingSide,
        amount: amount,
        slippage: slippage
      }
      
      const result = tradingFormSchema.safeParse(formData)
      if (!result.success) {
        const firstError = result.error.issues[0]
        return { 
          isValid: false, 
          message: firstError.message, 
          type: 'validation' as const 
        }
      }
    } catch (err) {
      return { 
        isValid: false, 
        message: 'Invalid form data', 
        type: 'validation' as const 
      }
    }
    
    return { isValid: true, message: null, type: null }
  }, [amount, usdcBalance, isConnected, market, selectedSide, slippage])

  const handleTrade = useCallback(async () => {
    // If wallet is not connected, trigger login
    if (!isConnected) {
      try {
        login()
        return
      } catch (error) {
        setError('Failed to connect wallet. Please try again.')
        return
      }
    }

    if (!validation.isValid) return
    
    setError(null)
    clearGasError()
    
    // Show confirmation modal immediately with gas estimation in progress
    const transactionType = needsApproval(amount) ? 'approval' : 'deposit'
    const transactionDetails: TransactionDetails = {
      type: transactionType,
      side: selectedSide,
      amount,
      marketTitle: market.title,
      currentProbability: selectedSide === 'YES' ? yesProb : noProb,
      newProbability: newProbability,
      estimatedShares,
      potentialReturn,
      gasEstimates: transactionType === 'approval' ? gasEstimates.approval : gasEstimates.deposit,
      selectedGasSpeed,
      needsApproval: needsApproval(amount),
      userBalance: formattedBalance,
      // Gas estimation functions
      isGasLoading,
      gasError,
      onGasSpeedChange: setSelectedGasSpeed,
      onGasRefresh: () => {
        clearGasError()
        if (needsApproval(amount)) {
          updateApprovalGasEstimate(amount)
        } else {
          updateDepositGasEstimate(selectedSide, amount)
        }
      },
      clearGasError,
    }
    
    showConfirmation(transactionDetails)
    
    // Trigger gas estimation after showing modal (will update the displayed estimates)
    if (amount && parseFloat(amount) > 0) {
      if (needsApproval(amount)) {
        updateApprovalGasEstimate(amount)
      } else {
        updateDepositGasEstimate(selectedSide, amount)
      }
    }
  }, [
    isConnected,
    login,
    validation.isValid, 
    needsApproval, 
    amount, 
    selectedSide, 
    market.title, 
    yesProb, 
    noProb, 
    newProbability, 
    estimatedShares, 
    potentialReturn,
    gasEstimates,
    selectedGasSpeed,
    formattedBalance,
    showConfirmation,
    clearGasError,
    updateApprovalGasEstimate,
    updateDepositGasEstimate,
    isGasLoading,
    gasError,
    clearErrorsOnInteraction
  ])

  const handleConfirmTransaction = useCallback(async () => {
    if (!validation.isValid || !confirmationDetails || isTransactionAttempting) return
    
    setIsTransactionAttempting(true)
    setConfirmationLoading(true)
    setConfirmationError(null)
    
    // Create a timeout to prevent getting stuck
    const timeoutId = setTimeout(() => {
      setConfirmationLoading(false)
      setConfirmationError('Transaction timed out. Please try again.')
      setIsTransactionAttempting(false)
      resetTradingState()
    }, 60000) // 60 second timeout
    
    try {
      // Use real contract integration
      if (needsApproval(amount)) {
        // Two-step process: approve then deposit
        await approveUSDC(amount)
        // User will need to click again after approval to deposit
      } else {
        // Direct deposit
        await deposit(selectedSide, amount)
        setAmount('')
      }
      
      // Also call the optional onTrade callback for demo/testing
      if (onTrade) {
        await onTrade(selectedSide, amount)
      }
      
      clearTimeout(timeoutId)
      hideConfirmation()
    } catch (err) {
      clearTimeout(timeoutId)
      
      // Handle different types of errors
      const error = err as Error
      const isUserRejection = error?.message?.toLowerCase().includes('user rejected') || 
                              error?.message?.toLowerCase().includes('user denied') ||
                              error?.message?.toLowerCase().includes('user cancelled') ||
                              error?.name === 'UserRejectedRequestError'
      
      // Clean up error message - remove technical details
      let cleanErrorMessage = 'Transaction failed'
      if (isUserRejection) {
        cleanErrorMessage = 'Transaction cancelled'
        console.log('User rejected transaction, cleaning up immediately')
        
        // Immediately reset state and close modal on user rejection to prevent retries
        resetTradingState()
        hideConfirmation()
        setError('Transaction cancelled')
        
        // Force cleanup of any pending states
        clearTimeout(timeoutId)
        setConfirmationLoading(false)
        setConfirmationError(null)
        setIsTransactionAttempting(false)
        
        return // Exit early to prevent further processing
      } else if (error?.message) {
        // Extract only the main error message, remove technical details
        const message = error.message
        if (message.includes('insufficient funds')) {
          cleanErrorMessage = 'Insufficient funds'
        } else if (message.includes('gas')) {
          cleanErrorMessage = 'Gas estimation failed'
        } else if (message.includes('network')) {
          cleanErrorMessage = 'Network error'
        } else {
          // Take only the first part before technical details
          const firstPart = message.split('Request Arguments:')[0]
                                  .split('Contract Call:')[0]
                                  .split('Docs:')[0]
                                  .split('Details:')[0]
                                  .split('Version:')[0]
                                  .trim()
          
          // Clean up common patterns
          cleanErrorMessage = firstPart
            .replace(/\n.*$/s, '') // Remove everything after first newline
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          // Fallback if still too long or empty
          if (!cleanErrorMessage || cleanErrorMessage.length > 50) {
            cleanErrorMessage = 'Transaction failed'
          }
        }
      }
      
      setConfirmationError(cleanErrorMessage)
      setError(cleanErrorMessage)
    } finally {
      clearTimeout(timeoutId)
      setConfirmationLoading(false)
      setIsTransactionAttempting(false)
    }
  }, [
    validation.isValid,
    confirmationDetails,
    needsApproval,
    amount,
    approveUSDC,
    deposit,
    selectedSide,
    onTrade,
    hideConfirmation,
    setConfirmationLoading,
    setConfirmationError,
    resetTradingState,
    cleanErrorMessage,
    isTransactionAttempting
  ])

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000]
  const balanceInUSDC = parseFloat(formattedBalance || '0')

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trade Prediction
          </span>
          {isConnected && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                <Wallet className="h-3 w-3 mr-1" />
                {balanceInUSDC.toFixed(2)} USDC
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchContractData?.()}
                className="h-6 w-6 p-0"
                title="Refresh balance"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Market Probabilities */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-out transform",
              selectedSide === 'YES' 
                ? "border-green-500 bg-green-50 dark:bg-green-950/30 scale-[1.02]" 
                : "border-border hover:border-green-500/50 hover:scale-[1.01] active:scale-[0.99]"
            )}
            onClick={() => {
              setSelectedSide('YES')
              clearErrorsOnInteraction()
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">YES</span>
              <CheckCircle className={cn(
                "h-4 w-4",
                selectedSide === 'YES' ? "text-green-500" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {yesDisplay}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Current probability
            </div>
          </div>
          
          <div 
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-out transform",
              selectedSide === 'NO' 
                ? "border-red-500 bg-red-50 dark:bg-red-950/30 scale-[1.02]" 
                : "border-border hover:border-red-500/50 hover:scale-[1.01] active:scale-[0.99]"
            )}
            onClick={() => {
              setSelectedSide('NO')
              clearErrorsOnInteraction()
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">NO</span>
              <XCircle className={cn(
                "h-4 w-4",
                selectedSide === 'NO' ? "text-red-500" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {noDisplay}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Current probability
            </div>
          </div>
        </div>

        <Separator />

        {/* Trade Input */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount" className="flex items-center justify-between mb-2">
              <span>Amount (USDC)</span>
              <span className="text-xs text-muted-foreground">
                Max: {balanceInUSDC.toFixed(2)} USDC
              </span>
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                clearErrorsOnInteraction()
              }}
              disabled={disabled || tradingState.isLoading || !isConnected}
              className="text-lg"
              step="1"
              min="1"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((quickAmount) => (
              <Button
                key={quickAmount}
                variant="outline"
                size="sm"
                onClick={() => {
                  setAmount(quickAmount.toString())
                  clearErrorsOnInteraction()
                }}
                disabled={disabled || tradingState.isLoading || !isConnected || quickAmount > balanceInUSDC}
                className="text-xs"
              >
                {quickAmount >= 1000 ? `${quickAmount/1000}K` : quickAmount}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAmount(balanceInUSDC.toString())
                clearErrorsOnInteraction()
              }}
              disabled={disabled || tradingState.isLoading || !isConnected || balanceInUSDC === 0}
              className="text-xs"
            >
              Max
            </Button>
          </div>
        </div>

        {/* Estimated Outcome */}
        {amount && parseFloat(amount) > 0 && (
          <>
            <Separator />
            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium">
                Trade Summary
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="relative">
                  <div className="text-muted-foreground flex items-center gap-1">
                    Effective Shares
                    <div className="relative">
                      <Info 
                        className="h-3 w-3 cursor-help" 
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                      />
                      {showTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-medium mb-1">
                            {amount} USDC × {timeMultiplier.toFixed(2)} time multiplier = {estimatedShares} effective shares
                          </div>
                          <div className="text-gray-300">
                            Early entry gets bonus multiplier, late entry gets penalty. These determine your share of winnings.
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="font-medium">{estimatedShares}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Your Share of Winning Pool</div>
                  <div className="font-medium text-blue-600">
                    {(() => {
                      const investment = parseFloat(amount || '0')
                      if (investment === 0) return '0.0%'
                      
                      const yourEffectiveShares = investment * timeMultiplier
                      const yesPool = parseFloat(market.poolYes || '0')
                      const noPool = parseFloat(market.poolNo || '0')
                      
                      // Note: We can't know the exact effective shares of existing holders
                      // without their deposit timestamps, so this is an approximation
                      // assuming average time multiplier of 1.0 for existing pools
                      const existingWinningPoolEffectiveShares = selectedSide === 'YES' ? yesPool * 1.0 : noPool * 1.0
                      
                      const totalWinningEffectiveShares = existingWinningPoolEffectiveShares + yourEffectiveShares
                      
                      const sharePercentage = (yourEffectiveShares / totalWinningEffectiveShares) * 100
                      return `~${sharePercentage.toFixed(1)}%`
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Approximation - exact share depends on other holders' entry times
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Potential Return</span>
                  <span className={cn(
                    "font-medium",
                    potentialReturn.profit > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {potentialReturn.profit > 0 ? '+' : ''}{potentialReturn.profit.toFixed(2)} USDC
                    <span className="text-xs ml-1">
                      ({potentialReturn.roi > 0 ? '+' : ''}{potentialReturn.roi.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New {selectedSide} Probability</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {selectedSide === 'YES' ? yesDisplay : noDisplay}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className={cn(
                      "font-medium",
                      newProbability > (selectedSide === 'YES' ? yesProb : noProb)
                        ? "text-green-600"
                        : "text-red-600"
                    )}>
                      {newProbability.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Advanced Settings */}
        <div className="space-y-4">
          <button
            onClick={() => {
              setShowAdvanced(!showAdvanced)
              clearErrorsOnInteraction()
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {showAdvanced ? 'Hide' : 'Show'} advanced settings
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div>
                <Label className="text-sm mb-2">
                  Max Slippage: {slippage}%
                </Label>
                <Slider
                  value={[slippage]}
                  onValueChange={([value]) => {
                    setSlippage(value)
                    clearErrorsOnInteraction()
                  }}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your transaction will revert if the price changes unfavorably by more than this percentage
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {tradingState.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Transaction successful! {tradingState.stage === 'approval' && 'You can now proceed with the deposit.'}
              {tradingState.txHash && (
                <div className="mt-1">
                  <a 
                    href={`https://sepolia.arbiscan.io/tx/${tradingState.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                  >
                    View on Explorer
                  </a>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State with Cancel Option */}
        {tradingState.isLoading && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {tradingState.stage === 'approval' ? 'Approving USDC...' : 'Processing transaction...'}
                  <br />
                  <span className="text-xs text-muted-foreground mt-1">
                    Please confirm in your wallet. If stuck, try cancelling below.
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetTradingState()
                    hideConfirmation()
                    setError(null)
                  }}
                  className="ml-4 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error/Warning Messages */}
        {(error || tradingState.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {cleanErrorMessage(error || tradingState.error?.message || '')}
            </AlertDescription>
          </Alert>
        )}
        
        {!validation.isValid && validation.message && !error && (
          <Alert variant={validation.type === 'wallet' ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.message}
              {validation.type === 'amount' && amount && (
                <div className="mt-2 text-xs text-muted-foreground">
                  • Minimum: 1 USDC
                  • Maximum: 1,000,000 USDC  
                  • Balance: {balanceInUSDC.toFixed(2)} USDC
                </div>
              )}
              {validation.type === 'market' && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Check market status and trading conditions
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}


        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={
            (!validation.isValid && isConnected) || // Only disable for validation errors when connected
            tradingState.isLoading || 
            disabled
          }
          className="w-full h-12 text-lg"
          variant={selectedSide === 'YES' ? 'default' : 'destructive'}
        >
          {tradingState.isLoading ? (
            tradingState.stage === 'approval' ? 'Approving USDC...' : 'Processing Transaction...'
          ) : !isConnected ? (
            'Connect Wallet'
          ) : needsApproval(amount) ? (
            `Approve ${amount || '0'} USDC`
          ) : (
            `Buy ${selectedSide} for ${amount || '0'} USDC`
          )}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-center text-muted-foreground">
          {market.resolved ? (
            'This market has been resolved'
          ) : market.cutoffTime && new Date(parseInt(market.cutoffTime) * 1000) < new Date() ? (
            'Trading has ended for this market'
          ) : (
            'If your prediction wins, you get your deposit back plus your share of the losing pool (minus fees)'
          )}
        </p>
      </CardContent>

      {/* Transaction Confirmation Modal */}
      {confirmationDetails && (
        <TransactionConfirmationModal
          open={isConfirmationOpen}
          onOpenChange={hideConfirmation}
          onConfirm={handleConfirmTransaction}
          onCancel={hideConfirmation}
          details={{
            ...confirmationDetails,
            // Update with current gas estimates and loading state
            gasEstimates: confirmationDetails.type === 'approval' ? gasEstimates.approval : gasEstimates.deposit,
            isGasLoading,
            gasError,
          }}
          isLoading={isConfirmationLoading}
          error={confirmationError}
        />
      )}
    </Card>
  )
}