/**
 * CPMM Trading Interface
 * Handles buy/sell trading for CPMM markets with slippage protection
 */

'use client'

import React, { useState, useMemo } from 'react'
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
  Settings,
  Info,
  Zap,
  ArrowUpDown
} from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { usePrivy } from '@privy-io/react-auth'
import { formatUnits, parseEther } from 'viem'
import { Market } from '@/types/market'
import { getMarketProbability, calculateCPMMBuyShares, calculateCPMMSellAmount } from '@/lib/pricing'
import { cn } from '@/lib/utils'

interface CPMMTradingInterfaceProps {
  market: Market
  trading: any // Trading hook result
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
  const [slippage, setSlippage] = useState(3) // 3% default slippage
  const [isTrading, setIsTrading] = useState(false)
  const { authenticated, login } = usePrivy()
  const { balance } = useWallet()

  // Calculate probabilities
  const yesProb = getMarketProbability(market)
  const noProb = 100 - yesProb

  // Calculate trade preview
  const tradePreview = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return null
    
    try {
      const reserveYes = market.reserveYes || '0'
      const reserveNo = market.reserveNo || '0'
      
      if (tradeType === 'buy') {
        const result = calculateCPMMBuyShares(
          selectedSide,
          parseEther(amount),
          BigInt(reserveYes),
          BigInt(reserveNo)
        )
        
        return {
          sharesOut: formatUnits(result.sharesOut, 18),
          priceImpact: result.priceImpact,
          effectivePrice: result.effectivePrice,
          type: 'buy' as const
        }
      } else {
        const result = calculateCPMMSellAmount(
          selectedSide,
          parseEther(amount),
          BigInt(reserveYes),
          BigInt(reserveNo)
        )
        
        return {
          amountOut: formatUnits(result.amountOut, 18),
          priceImpact: result.priceImpact,
          effectivePrice: result.effectivePrice,
          type: 'sell' as const
        }
      }
    } catch (error) {
      return null
    }
  }, [amount, selectedSide, tradeType, market.reserveYes, market.reserveNo])

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    try {
      setIsTrading(true)
      
      if (tradeType === 'buy') {
        // Calculate minimum shares with slippage protection
        const minSharesOut = tradePreview ? 
          (parseFloat(tradePreview.sharesOut) * (1 - slippage / 100)).toString() : 
          undefined
        
        if (selectedSide === 'YES') {
          await trading.buyYes(amount, minSharesOut)
        } else {
          await trading.buyNo(amount, minSharesOut)
        }
      } else {
        // Calculate minimum amount with slippage protection
        const minAmountOut = tradePreview ? 
          (parseFloat(tradePreview.amountOut) * (1 - slippage / 100)).toString() : 
          undefined
        
        if (selectedSide === 'YES') {
          await trading.sellYes(amount, minAmountOut)
        } else {
          await trading.sellNo(amount, minAmountOut)
        }
      }
      
      // Reset form on success
      setAmount('')
    } catch (error) {
      console.error('Trade failed:', error)
    } finally {
      setIsTrading(false)
    }
  }

  const canTrade = trading.canTrade && parseFloat(amount) > 0
  const canSell = trading.canSell && tradeType === 'sell'
  const hasInsufficientBalance = balance && tradeType === 'buy' && 
    parseFloat(amount) > parseFloat(formatUnits(balance, 18))

  // Get user's shares for selling
  const userShares = trading.position ? {
    yes: formatUnits(trading.position.sharesYes, 18),
    no: formatUnits(trading.position.sharesNo, 18)
  } : { yes: '0', no: '0' }

  const hasInsufficientShares = tradeType === 'sell' && 
    parseFloat(amount) > parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Trade Shares</CardTitle>
          <Badge variant="outline" className="text-blue-700 border-blue-200">
            CPMM AMM
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Trade Type Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Action</Label>
          <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Buy Shares
              </TabsTrigger>
              <TabsTrigger value="sell" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Sell Shares
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Outcome Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Outcome</Label>
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
            {tradeType === 'buy' ? 'Amount (USDC)' : 'Shares to Sell'}
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <span className="text-muted-foreground">
                {tradeType === 'buy' ? '$' : '#'}
              </span>
            </div>
          </div>
          
          {/* Balance/Shares Display */}
          <div className="flex items-center justify-between text-sm">
            {tradeType === 'buy' ? (
              <>
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-medium">
                  ${balance ? parseFloat(formatUnits(balance, 18)).toFixed(2) : '0.00'} USDC
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Your {selectedSide} shares:</span>
                <span className="font-medium">
                  {parseFloat(selectedSide === 'YES' ? userShares.yes : userShares.no).toFixed(4)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Slippage Tolerance
            </Label>
            <span className="text-sm font-medium">{slippage}%</span>
          </div>
          <Slider
            value={[slippage]}
            onValueChange={([value]) => setSlippage(value)}
            max={20}
            min={0.1}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.1%</span>
            <span>20%</span>
          </div>
        </div>

        {/* Trade Preview */}
        {tradePreview && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            {tradeType === 'buy' ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You pay:</span>
                  <span className="font-medium">${amount} USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You receive:</span>
                  <span className="font-medium text-green-600">
                    {parseFloat(tradePreview.sharesOut).toFixed(4)} {selectedSide} shares
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Effective price:</span>
                  <span className="font-medium">
                    ${tradePreview.effectivePrice.toFixed(4)} per share
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You sell:</span>
                  <span className="font-medium">{amount} {selectedSide} shares</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You receive:</span>
                  <span className="font-medium text-green-600">
                    ${parseFloat(tradePreview.amountOut).toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Effective price:</span>
                  <span className="font-medium">
                    ${tradePreview.effectivePrice.toFixed(4)} per share
                  </span>
                </div>
              </>
            )}
            
            {/* Price Impact Warning */}
            {tradePreview.priceImpact > 2 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                <AlertCircle className="h-3 w-3" />
                <span>High price impact: {tradePreview.priceImpact.toFixed(2)}%</span>
              </div>
            )}
            
            <Separator />
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              {slippage}% slippage tolerance applied. 3% fee included in calculation.
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {hasInsufficientBalance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Insufficient balance. You need ${amount} USDC to buy these shares.
            </AlertDescription>
          </Alert>
        )}

        {hasInsufficientShares && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Insufficient shares. You only have {selectedSide === 'YES' ? userShares.yes : userShares.no} {selectedSide} shares.
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
              onClick={handleTrade}
              disabled={
                !canTrade || 
                (tradeType === 'sell' && !canSell) ||
                hasInsufficientBalance || 
                hasInsufficientShares || 
                isTrading
              }
              className="w-full"
              size="lg"
            >
              {isTrading ? (
                <>Processing...</>
              ) : tradeType === 'buy' ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Buy {amount || '0'} USDC of {selectedSide}
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sell {amount || '0'} {selectedSide} Shares
                </>
              )}
            </Button>
          )}
        </div>

        {/* Current Position */}
        {trading.position && trading.position.totalShares > 0n && (
          <div className="pt-4">
            <Separator className="mb-4" />
            <div className="space-y-2">
              <h4 className="font-medium">Your Position</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">YES shares</div>
                  <div className="font-medium">{userShares.yes}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">NO shares</div>
                  <div className="font-medium">{userShares.no}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}