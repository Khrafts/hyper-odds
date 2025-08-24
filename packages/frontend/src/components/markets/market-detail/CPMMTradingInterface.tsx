/**
 * Clean CPMM Trading Interface
 * Intuitive buy/sell interface for CPMM markets with clear trade previews
 */

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
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  ArrowDown,
  Settings,
  Info
} from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { usePrivy } from '@privy-io/react-auth'
import { formatEther, parseEther } from 'viem'
import { Market } from '@/types/market'
import { 
  calculateCPMMBuyShares, 
  calculateCPMMSellAmount
} from '@/lib/pricing'
import { cn } from '@/lib/utils'

interface CPMMTradingInterfaceProps {
  market: Market
  trading: any
  className?: string
}

export function CPMMTradingInterface({ 
  market, 
  trading, 
  className 
}: CPMMTradingInterfaceProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(2)
  const [showSlippage, setShowSlippage] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { authenticated, login } = usePrivy()
  const wallet = useWallet()
  const balance = wallet.balance

  // Get market reserves
  const reserveYes = BigInt(market.reserveYes || '0')
  const reserveNo = BigInt(market.reserveNo || '0')
  const totalReserves = reserveYes + reserveNo

  // Calculate current probabilities
  const currentProbabilities = useMemo(() => {
    if (totalReserves === 0n) return { yes: 50, no: 50 }
    
    // CPMM: P(YES) = reserveNo / total (counter-intuitive but correct)
    const yesProb = Number((reserveNo * 100n) / totalReserves)
    return { yes: yesProb, no: 100 - yesProb }
  }, [reserveYes, reserveNo, totalReserves])

  // Get user position
  const userShares = useMemo(() => {
    if (!trading.position) return { yes: '0', no: '0' }
    return {
      yes: formatEther(trading.position.sharesYes || 0n),
      no: formatEther(trading.position.sharesNo || 0n)
    }
  }, [trading.position])

  // Calculate trade preview
  const tradePreview = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || totalReserves === 0n) return null
    
    try {
      const amountBigInt = parseEther(amount)
      
      if (tradeType === 'buy') {
        const result = calculateCPMMBuyShares(
          selectedSide,
          amountBigInt,
          reserveYes,
          reserveNo
        )
        
        return {
          type: 'buy' as const,
          input: amount,
          inputLabel: 'USDC',
          output: formatEther(result.sharesOut),
          outputLabel: `${selectedSide} shares`,
          priceImpact: result.priceImpact,
          effectivePrice: result.effectivePrice,
          fee: '3%'
        }
      } else {
        // Check if user has enough shares
        const availableShares = parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no)
        if (parseFloat(amount) > availableShares) {
          throw new Error('Insufficient shares')
        }
        
        const result = calculateCPMMSellAmount(
          selectedSide,
          amountBigInt,
          reserveYes,
          reserveNo
        )
        
        return {
          type: 'sell' as const,
          input: amount,
          inputLabel: `${selectedSide} shares`,
          output: formatEther(result.amountOut),
          outputLabel: 'USDC',
          priceImpact: result.priceImpact,
          effectivePrice: result.effectivePrice,
          fee: '3%'
        }
      }
    } catch (error) {
      console.error('Trade preview error:', error)
      return null
    }
  }, [amount, selectedSide, tradeType, reserveYes, reserveNo, totalReserves, userShares])

  // Validation
  const validation = useMemo(() => {
    if (!authenticated) {
      return { isValid: false, message: 'Connect wallet to trade' }
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return { isValid: false, message: 'Enter an amount' }
    }
    
    if (totalReserves === 0n) {
      return { isValid: false, message: 'No liquidity available' }
    }
    
    if (tradeType === 'buy') {
      const userBalance = balance ? parseFloat(formatEther(balance)) : 0
      if (parseFloat(amount) > userBalance) {
        return { isValid: false, message: `Insufficient balance` }
      }
      if (parseFloat(amount) < 1) {
        return { isValid: false, message: 'Minimum: 1 USDC' }
      }
    } else {
      const availableShares = parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no)
      if (parseFloat(amount) > availableShares) {
        return { isValid: false, message: `Insufficient ${selectedSide} shares` }
      }
    }
    
    if (tradePreview && tradePreview.priceImpact > 90) {
      return { isValid: false, message: 'Price impact too high' }
    }
    
    return { isValid: true, message: null }
  }, [authenticated, amount, tradeType, balance, totalReserves, selectedSide, userShares, tradePreview])

  // Handle trade
  const handleTrade = useCallback(async () => {
    if (!validation.isValid || !tradePreview) {
      if (!authenticated) {
        login()
        return
      }
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      if (tradeType === 'buy') {
        const minOut = (parseFloat(tradePreview.output) * (1 - slippage / 100)).toString()
        if (selectedSide === 'YES') {
          await trading.buyYes(amount, minOut)
        } else {
          await trading.buyNo(amount, minOut)
        }
      } else {
        const minOut = (parseFloat(tradePreview.output) * (1 - slippage / 100)).toString()
        if (selectedSide === 'YES') {
          await trading.sellYes(amount, minOut)
        } else {
          await trading.sellNo(amount, minOut)
        }
      }
      
      setAmount('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transaction failed')
    } finally {
      setIsProcessing(false)
    }
  }, [validation, tradePreview, tradeType, selectedSide, amount, slippage, trading, authenticated, login])

  // Quick amounts
  const quickAmounts = useMemo(() => {
    if (tradeType === 'buy') {
      const userBalance = balance ? parseFloat(formatEther(balance)) : 0
      return [25, 50, 100, 250].filter(amt => amt <= userBalance)
    } else {
      const shares = parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no)
      if (shares === 0) return []
      return [
        { label: '25%', value: (shares * 0.25).toFixed(4) },
        { label: '50%', value: (shares * 0.5).toFixed(4) },
        { label: '75%', value: (shares * 0.75).toFixed(4) },
        { label: 'Max', value: shares.toFixed(4) }
      ]
    }
  }, [tradeType, balance, selectedSide, userShares])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Trade</CardTitle>
          <Badge variant="outline" className="text-blue-600">CPMM</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Buy/Sell Tabs */}
        <Tabs value={tradeType} onValueChange={(value) => {
          setTradeType(value as 'buy' | 'sell')
          setAmount('')
          setError(null)
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="text-green-600 data-[state=active]:bg-green-50">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-red-600 data-[state=active]:bg-red-50">
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-6">
            <BuyInterface
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              amount={amount}
              onAmountChange={setAmount}
              quickAmounts={quickAmounts}
              balance={balance}
              probabilities={currentProbabilities}
              userShares={userShares}
            />
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-6">
            <SellInterface
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              amount={amount}
              onAmountChange={setAmount}
              quickAmounts={quickAmounts}
              probabilities={currentProbabilities}
              userShares={userShares}
            />
          </TabsContent>
        </Tabs>

        {/* Trade Preview */}
        {tradePreview && (
          <>
            <div className="flex items-center justify-center py-2">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">You receive:</span>
                <span className="font-medium">
                  {parseFloat(tradePreview.output).toFixed(tradeType === 'buy' ? 4 : 2)} {tradePreview.outputLabel}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price impact:</span>
                <span className={cn(
                  "font-medium",
                  tradePreview.priceImpact > 5 ? "text-red-500" :
                  tradePreview.priceImpact > 2 ? "text-amber-500" : "text-green-500"
                )}>
                  {tradePreview.priceImpact.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trading fee:</span>
                <span className="font-medium">{tradePreview.fee}</span>
              </div>
              
              {/* High impact warning */}
              {tradePreview.priceImpact > 5 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    High price impact! Consider reducing your trade size.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        {/* Slippage Settings */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSlippage(!showSlippage)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3 w-3" />
            Slippage: {slippage}%
          </button>
          {showSlippage && (
            <div className="flex items-center gap-2">
              {[0.5, 1, 2, 5].map((value) => (
                <Button
                  key={value}
                  variant={slippage === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlippage(value)}
                  className="h-7 px-2 text-xs"
                >
                  {value}%
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {!validation.isValid && validation.message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!validation.isValid || isProcessing || !tradePreview}
          className={cn(
            "w-full h-12 text-base font-medium",
            tradeType === 'sell' && "bg-red-600 hover:bg-red-700"
          )}
          size="lg"
        >
          {!authenticated ? (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </>
          ) : isProcessing ? (
            "Processing..."
          ) : (
            `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedSide}`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// Buy Interface Component
function BuyInterface({ 
  selectedSide, 
  onSideChange, 
  amount, 
  onAmountChange, 
  quickAmounts, 
  balance, 
  probabilities,
  userShares 
}: {
  selectedSide: 'YES' | 'NO'
  onSideChange: (side: 'YES' | 'NO') => void
  amount: string
  onAmountChange: (amount: string) => void
  quickAmounts: number[]
  balance: any
  probabilities: { yes: number; no: number }
  userShares: { yes: string; no: string }
}) {
  return (
    <>
      {/* Outcome Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Choose Outcome</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSideChange('YES')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedSide === 'YES'
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-border hover:border-green-200"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-700">YES</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-green-600">
              {probabilities.yes.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${(probabilities.yes / 100).toFixed(3)} per share
            </div>
          </button>
          
          <button
            onClick={() => onSideChange('NO')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedSide === 'NO'
                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                : "border-border hover:border-red-200"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-red-700">NO</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-lg font-bold text-red-600">
              {probabilities.no.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${(probabilities.no / 100).toFixed(3)} per share
            </div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">You Pay</Label>
          <span className="text-xs text-muted-foreground">
            Balance: ${balance ? parseFloat(formatEther(balance)).toFixed(2) : '0.00'}
          </span>
        </div>
        
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="text-lg h-14 pl-4 pr-16"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <span className="text-sm font-medium text-muted-foreground">USDC</span>
          </div>
        </div>
        
        {/* Quick amounts */}
        <div className="flex gap-2">
          {quickAmounts.map((amt) => (
            <Button
              key={amt}
              variant="outline"
              size="sm"
              onClick={() => onAmountChange(amt.toString())}
              className="text-xs"
            >
              ${amt}
            </Button>
          ))}
        </div>
      </div>
    </>
  )
}

// Sell Interface Component  
function SellInterface({ 
  selectedSide, 
  onSideChange, 
  amount, 
  onAmountChange, 
  quickAmounts, 
  probabilities,
  userShares 
}: {
  selectedSide: 'YES' | 'NO'
  onSideChange: (side: 'YES' | 'NO') => void
  amount: string
  onAmountChange: (amount: string) => void
  quickAmounts: any[]
  probabilities: { yes: number; no: number }
  userShares: { yes: string; no: string }
}) {
  return (
    <>
      {/* Outcome Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Sell Shares</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSideChange('YES')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedSide === 'YES'
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-border hover:border-green-200"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-700">YES</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm font-medium">
              {parseFloat(userShares.yes).toFixed(4)} shares
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ≈ ${(parseFloat(userShares.yes) * probabilities.yes / 100).toFixed(2)} value
            </div>
          </button>
          
          <button
            onClick={() => onSideChange('NO')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedSide === 'NO'
                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                : "border-border hover:border-red-200"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-red-700">NO</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm font-medium">
              {parseFloat(userShares.no).toFixed(4)} shares
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ≈ ${(parseFloat(userShares.no) * probabilities.no / 100).toFixed(2)} value
            </div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">You Sell</Label>
          <span className="text-xs text-muted-foreground">
            Available: {parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no).toFixed(4)}
          </span>
        </div>
        
        <div className="relative">
          <Input
            type="number"
            placeholder="0.0000"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="text-lg h-14 pl-4 pr-20"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <span className="text-sm font-medium text-muted-foreground">{selectedSide}</span>
          </div>
        </div>
        
        {/* Quick amounts */}
        <div className="flex gap-2">
          {quickAmounts.map((item) => (
            <Button
              key={item.label}
              variant="outline"
              size="sm"
              onClick={() => onAmountChange(item.value)}
              className="text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </>
  )
}