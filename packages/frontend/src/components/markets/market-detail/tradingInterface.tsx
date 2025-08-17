'use client'

import React, { useState, useMemo, useCallback } from 'react'
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
  Calculator,
  ArrowRight,
  Info,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { Market } from '@/hooks/useMarkets'
import { cn } from '@/lib/utils'
import { 
  validateTradingAmount, 
  validateMarketState,
  TradingSide,
  tradingFormSchema,
  type TradingFormData 
} from '@/lib/validations/trading'
import { useTradingHooks } from '@/hooks/useTradingHooks'
import { GasFeeDisplay, GasFeeInline } from '@/components/trading/gasFeeDisplay'
import { 
  TransactionConfirmationModal, 
  useTransactionConfirmation,
  type TransactionDetails 
} from '@/components/trading/transactionConfirmationModal'

interface TradingInterfaceProps {
  market: Market
  onTrade?: (side: 'YES' | 'NO', amount: string) => Promise<void>
  disabled?: boolean
}

export function TradingInterface({ market, onTrade, disabled = false }: TradingInterfaceProps) {
  const { address, isConnected } = useAccount()
  
  // Use trading hooks for contract integration
  const {
    deposit,
    approveUSDC,
    approveAndDeposit,
    needsApproval,
    tradingState,
    usdcBalance,
    formattedBalance,
    formattedPoolNo,
    formattedPoolYes,
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
  } = useTradingHooks(market.id as `0x${string}`)
  
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [slippage, setSlippage] = useState(1) // 1% default slippage

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

  // Update gas estimates when amount or side changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && isConnected) {
      // Estimate gas for approval if needed
      if (needsApproval(amount)) {
        updateApprovalGasEstimate(amount)
      }
      // Estimate gas for deposit
      updateDepositGasEstimate(selectedSide, amount)
    }
  }, [amount, selectedSide, isConnected, needsApproval, updateApprovalGasEstimate, updateDepositGasEstimate])

  // Calculate current probabilities from real contract pool values
  const { yesProb, noProb } = useMemo(() => {
    const yesPool = parseFloat(formattedPoolYes || '0')
    const noPool = parseFloat(formattedPoolNo || '0')
    const total = yesPool + noPool
    
    if (total === 0) {
      return { yesProb: 50, noProb: 50 }
    }
    
    return {
      yesProb: (noPool / total) * 100, // Inverse for CPMM
      noProb: (yesPool / total) * 100
    }
  }, [formattedPoolYes, formattedPoolNo])

  // Calculate estimated shares and potential payout
  const estimatedShares = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0'
    
    const depositAmount = parseFloat(amount)
    const selectedPool = selectedSide === 'YES' 
      ? parseFloat(market.poolYes || '0')
      : parseFloat(market.poolNo || '0')
    const oppositePool = selectedSide === 'YES'
      ? parseFloat(market.poolNo || '0')
      : parseFloat(market.poolYes || '0')
    
    if (selectedPool === 0 || oppositePool === 0) return '0'
    
    // CPMM formula: shares = oppositePool - (selectedPool * oppositePool) / (selectedPool + depositAmount)
    const k = selectedPool * oppositePool
    const newSelectedPool = selectedPool + depositAmount
    const newOppositePool = k / newSelectedPool
    const shares = oppositePool - newOppositePool
    
    return shares.toFixed(4)
  }, [amount, selectedSide, market.poolYes, market.poolNo])

  // Calculate potential return
  const potentialReturn = useMemo(() => {
    const shares = parseFloat(estimatedShares)
    const investment = parseFloat(amount || '0')
    
    if (investment === 0) return { profit: 0, roi: 0 }
    
    const profit = shares - investment
    const roi = (profit / investment) * 100
    
    return { profit, roi }
  }, [estimatedShares, amount])

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
      return (newNoPool / total) * 100
    } else {
      return (newYesPool / total) * 100
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
        const firstError = result.error.errors[0]
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
    if (!validation.isValid) return
    
    setError(null)
    
    // Determine transaction type and show confirmation modal
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
    }
    
    showConfirmation(transactionDetails)
  }, [
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
    showConfirmation
  ])

  const handleConfirmTransaction = useCallback(async () => {
    if (!validation.isValid || !confirmationDetails) return
    
    setConfirmationLoading(true)
    setConfirmationError(null)
    
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
      
      hideConfirmation()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setConfirmationError(errorMessage)
      setError(errorMessage)
    } finally {
      setConfirmationLoading(false)
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
    setConfirmationError
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
            <Badge variant="outline" className="font-normal">
              <Wallet className="h-3 w-3 mr-1" />
              {balanceInUSDC.toFixed(2)} USDC
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Market Probabilities */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectedSide === 'YES' 
                ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                : "border-border hover:border-green-500/50"
            )}
            onClick={() => setSelectedSide('YES')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">YES</span>
              <CheckCircle className={cn(
                "h-4 w-4",
                selectedSide === 'YES' ? "text-green-500" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {yesProb.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Current probability
            </div>
          </div>
          
          <div 
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectedSide === 'NO' 
                ? "border-red-500 bg-red-50 dark:bg-red-950/30" 
                : "border-border hover:border-red-500/50"
            )}
            onClick={() => setSelectedSide('NO')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">NO</span>
              <XCircle className={cn(
                "h-4 w-4",
                selectedSide === 'NO' ? "text-red-500" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {noProb.toFixed(1)}%
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
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled || tradingState.isLoading || !isConnected}
              className="text-lg"
              step="1"
              min="1"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {quickAmounts.map((quickAmount) => (
              <Button
                key={quickAmount}
                variant="outline"
                size="sm"
                onClick={() => setAmount(quickAmount.toString())}
                disabled={disabled || tradingState.isLoading || !isConnected || quickAmount > balanceInUSDC}
                className="flex-1"
              >
                {quickAmount} USDC
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount(balanceInUSDC.toString())}
              disabled={disabled || tradingState.isLoading || !isConnected || balanceInUSDC === 0}
              className="flex-1"
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Shares</span>
                <span className="font-medium">{estimatedShares}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Price per Share</span>
                <span className="font-medium">
                  {(parseFloat(amount) / parseFloat(estimatedShares)).toFixed(4)} USDC
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Potential Return</span>
                <span className={cn(
                  "font-medium",
                  potentialReturn.profit > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {potentialReturn.profit > 0 ? '+' : ''}{potentialReturn.profit.toFixed(2)} USDC
                  ({potentialReturn.roi > 0 ? '+' : ''}{potentialReturn.roi.toFixed(1)}%)
                </span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New {selectedSide} Probability</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {selectedSide === 'YES' ? yesProb.toFixed(1) : noProb.toFixed(1)}%
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
          </>
        )}

        {/* Gas Fee Display */}
        {amount && parseFloat(amount) > 0 && isConnected && (
          <>
            <Separator />
            <GasFeeDisplay
              gasEstimates={needsApproval(amount) ? gasEstimates.approval : gasEstimates.deposit}
              selectedSpeed={selectedGasSpeed}
              onSpeedChange={setSelectedGasSpeed}
              isLoading={isGasLoading}
              error={gasError}
              onRefresh={() => {
                clearGasError()
                if (needsApproval(amount)) {
                  updateApprovalGasEstimate(amount)
                } else {
                  updateDepositGasEstimate(selectedSide, amount)
                }
              }}
              transactionType={needsApproval(amount) ? 'approval' : 'deposit'}
              compact={true}
            />
          </>
        )}

        {/* Advanced Settings */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
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
                  onValueChange={([value]) => setSlippage(value)}
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

        {/* Error/Warning Messages */}
        {(error || tradingState.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || tradingState.error?.message}
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

        {/* Gas Fee Inline Display */}
        {amount && parseFloat(amount) > 0 && isConnected && validation.isValid && (
          <GasFeeInline
            gasEstimates={needsApproval(amount) ? gasEstimates.approval : gasEstimates.deposit}
            selectedSpeed={selectedGasSpeed}
            transactionType={needsApproval(amount) ? 'approval' : 'deposit'}
            className="justify-center"
          />
        )}

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!validation.isValid || tradingState.isLoading || disabled}
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
            'You will receive shares that can be redeemed for 1 USDC each if your prediction is correct'
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
          details={confirmationDetails}
          isLoading={isConfirmationLoading}
          error={confirmationError}
        />
      )}
    </Card>
  )
}