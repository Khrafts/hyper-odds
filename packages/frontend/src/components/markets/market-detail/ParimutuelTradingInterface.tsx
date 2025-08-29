/**
 * Parimutuel Trading Interface
 * Handles deposit-only trading for Parimutuel markets
 */

'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { formatUnits, parseUnits } from 'viem'
import { Market } from '@/types/market'
import { getMarketProbability } from '@/lib/pricing'
import { cn } from '@/lib/utils'

interface ParimutuelTradingInterfaceProps {
  market: Market
  trading: any // Trading hook result
  className?: string
}

export function ParimutuelTradingInterface({ 
  market, 
  trading, 
  className 
}: ParimutuelTradingInterfaceProps) {
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const { authenticated, login } = usePrivy()

  // Calculate probabilities
  const yesProb = getMarketProbability(market)
  const noProb = 100 - yesProb

  // Calculate potential payout for Parimutuel
  const potentialPayout = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return 0
    
    const deposit = parseFloat(amount)
    const currentYesPool = parseFloat(market.poolYes || '0')
    const currentNoPool = parseFloat(market.poolNo || '0')
    
    if (selectedSide === 'YES') {
      const newYesPool = currentYesPool + deposit
      // Payout = (your deposit / total yes pool) * (total no pool + fee)
      // Simplified calculation for display
      const potentialReturn = deposit + (deposit / newYesPool) * currentNoPool * 0.95 // 5% fee
      return potentialReturn
    } else {
      const newNoPool = currentNoPool + deposit
      const potentialReturn = deposit + (deposit / newNoPool) * currentYesPool * 0.95 // 5% fee
      return potentialReturn
    }
  }, [amount, selectedSide, market.poolYes, market.poolNo])

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    console.log('=== UI handleDeposit called ===')
    console.log('Selected side:', selectedSide)
    console.log('Amount:', amount)
    console.log('Trading object:', trading)
    
    try {
      setIsDepositing(true)
      
      console.log('Calling deposit function...')
      const result = selectedSide === 'YES' 
        ? await trading.depositYes(amount)
        : await trading.depositNo(amount)
      
      console.log('Deposit result:', result)
      
      // If approval is needed, the transaction will continue automatically
      // when approval is confirmed via the transaction state handlers
      
    } catch (error) {
      console.error('=== UI Deposit Error ===')
      console.error('UI Deposit failed:', error)
      // Error state is handled by the hook and displayed via trading.error
    } finally {
      setIsDepositing(false)
    }
  }

  // Reset form when transaction is successful
  React.useEffect(() => {
    if (trading.lastSuccessHash) {
      setAmount('')
      setIsDepositing(false)
    }
  }, [trading.lastSuccessHash])

  // Simplified approach with direct transactions
  // No need for complex approval continuation logic

  const canTrade = trading.canTrade && parseFloat(amount) > 0
  const hasInsufficientBalance = trading.balance && parseFloat(amount) > parseFloat(formatUnits(trading.balance, 6))
  
  // Check if approval is needed
  const needsApproval = trading.allowance !== undefined && parseFloat(amount) > 0 && 
    trading.allowance < parseUnits(amount, 6) // USDC has 6 decimals

  // Check if market is expired
  const isExpired = market.cutoffTime && 
    new Date(parseInt(market.cutoffTime) * 1000) < new Date()

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Place Bet</CardTitle>
          <Badge variant="outline" className="text-purple-700 border-purple-200">
            Parimutuel Pool
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Market Status */}
        {market.resolved && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This market has been resolved. Winner: {market.winningOutcome === 1 ? 'YES' : 'NO'}
            </AlertDescription>
          </Alert>
        )}
        
        {isExpired && !market.resolved && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This market has expired and is no longer accepting bets.
            </AlertDescription>
          </Alert>
        )}

        {/* Outcome Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Choose Outcome</Label>
          <Tabs value={selectedSide} onValueChange={(value) => setSelectedSide(value as 'YES' | 'NO')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="YES" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                YES {yesProb.toFixed(1)}%
              </TabsTrigger>
              <TabsTrigger value="NO" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                NO {noProb.toFixed(1)}%
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Amount Input */}
        <div className="space-y-4">
          <Label htmlFor="amount" className="text-base font-medium">
            Bet Amount (USDC)
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8"
              disabled={isExpired || market.resolved}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <span className="text-muted-foreground">$</span>
            </div>
          </div>
          
          {trading.balance && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-medium">
                ${parseFloat(formatUnits(trading.balance, 6)).toFixed(2)} USDC
              </span>
            </div>
          )}
        </div>

        {/* Potential Payout */}
        {amount && parseFloat(amount) > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your bet:</span>
              <span className="font-medium">${amount} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Potential return:</span>
              <span className="font-medium text-green-600">
                ${potentialPayout.toFixed(2)} USDC
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Potential profit:</span>
              <span className={cn(
                "font-medium",
                potentialPayout > parseFloat(amount) ? "text-green-600" : "text-red-600"
              )}>
                ${(potentialPayout - parseFloat(amount)).toFixed(2)} USDC
              </span>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Payouts depend on final pool distributions. 5% fee applies to winnings.
            </div>
          </div>
        )}

        {/* Transaction State Alerts */}
        {trading.isWaitingApproval && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Step 1 of 2: Waiting for USDC approval transaction to confirm...
              <br />
              <span className="text-sm text-blue-600">
                This allows the router to spend your USDC tokens for betting.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {trading.isLoading && !trading.isWaitingApproval && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {trading.isApprovalSuccess ? 
                'Step 2 of 2: Processing your bet transaction...' : 
                'Processing your bet transaction...'
              }
            </AlertDescription>
          </Alert>
        )}

        {trading.isTransactionSuccess && trading.lastSuccessHash && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Transaction successful!{' '}
              <a 
                href={`https://sepolia.arbiscan.io/tx/${trading.lastSuccessHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                View on Arbiscan
              </a>
            </AlertDescription>
          </Alert>
        )}

        {(trading.error || trading.writeError || trading.receiptError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {trading.error || 
               (trading.writeError && `Write Error: ${trading.writeError.message}`) || 
               (trading.receiptError && `Receipt Error: ${trading.receiptError.message}`) || 
               'An unknown error occurred'}
            </AlertDescription>
          </Alert>
        )}

        {/* Approval Information for First-Time Users */}
        {needsApproval && !trading.isWaitingApproval && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>First-time setup required:</strong> You'll need to approve USDC spending before placing bets. 
              This is a one-time transaction that allows the smart contract to use your tokens.
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {hasInsufficientBalance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Insufficient balance. You need ${amount} USDC to place this bet.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!authenticated ? (
            <Button onClick={login} className="w-full" size="lg">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet to Trade
            </Button>
          ) : (
            <Button
              onClick={handleDeposit}
              disabled={!canTrade || hasInsufficientBalance || trading.isLoading || trading.isWaitingApproval || isExpired || market.resolved}
              className="w-full"
              size="lg"
            >
              {trading.isWaitingApproval ? (
                <>Waiting for Approval...</>
              ) : trading.isLoading ? (
                <>Processing Bet...</>
              ) : isDepositing ? (
                <>Initiating...</>
              ) : needsApproval ? (
                <>Approve & Place ${amount || '0'} Bet on {selectedSide}</>
              ) : (
                <>Place ${amount || '0'} Bet on {selectedSide}</>
              )}
            </Button>
          )}
        </div>

        {/* Current Position */}
        {trading.position && trading.position.totalStake > 0n && (
          <div className="pt-4">
            <Separator className="mb-4" />
            <div className="space-y-2">
              <h4 className="font-medium">Your Position</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">YES bets</div>
                  <div className="font-medium">
                    ${parseFloat(formatUnits(trading.position.stakeYes, 6)).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">NO bets</div>
                  <div className="font-medium">
                    ${parseFloat(formatUnits(trading.position.stakeNo, 6)).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {market.resolved && trading.canClaim && (
                <Button
                  onClick={trading.claimWinnings}
                  disabled={trading.isProcessingClaim}
                  className="w-full mt-4"
                  variant="outline"
                >
                  {trading.isProcessingClaim ? 'Claiming...' : 'Claim Winnings'}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}