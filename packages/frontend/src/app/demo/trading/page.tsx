'use client'

import React, { useState } from 'react'
import { PageErrorBoundary } from '@/components/error'
import { TradingInterface } from '@/components/markets/market-detail/tradingInterface'
import { MarketHeader } from '@/components/markets/market-detail/marketHeader'
import { Market } from '@/hooks/useMarkets'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Sample markets for testing
const activeMarket: Market = {
  id: '0x1234567890abcdef',
  title: 'Will Bitcoin reach $100,000 by December 31, 2025?',
  description: 'This market resolves to YES if Bitcoin (BTC) trades at or above $100,000 USD on any major exchange at any point before 11:59 PM UTC on December 31, 2025.',
  poolYes: '750000',
  poolNo: '250000',
  totalPool: '1000000',
  resolved: false,
  winningOutcome: undefined,
  cutoffTime: String(Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000)),
  resolveTime: '',
  createdAt: String(Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000)),
  creator: {
    id: '0xabcdef1234567890abcdef1234567890abcdef12'
  }
}

const balancedMarket: Market = {
  ...activeMarket,
  id: '0x2345678901bcdefg',
  title: 'Will SpaceX successfully land humans on Mars by 2030?',
  description: 'This market resolves to YES if SpaceX successfully lands at least one human on Mars who survives for at least 24 hours on the surface.',
  poolYes: '500000',
  poolNo: '500000',
  totalPool: '1000000',
}

const skewedMarket: Market = {
  ...activeMarket,
  id: '0x3456789012cdefgh',
  title: 'Will GPT-5 be released in 2025?',
  description: 'This market resolves to YES if OpenAI officially releases GPT-5 to the public in any form during 2025.',
  poolYes: '900000',
  poolNo: '100000',
  totalPool: '1000000',
}

export default function TradingDemoPage() {
  const [selectedMarket, setSelectedMarket] = useState<'active' | 'balanced' | 'skewed'>('active')
  const [lastTrade, setLastTrade] = useState<{ side: string; amount: string } | null>(null)

  const getCurrentMarket = () => {
    switch (selectedMarket) {
      case 'balanced':
        return balancedMarket
      case 'skewed':
        return skewedMarket
      default:
        return activeMarket
    }
  }

  const handleTrade = async (side: 'YES' | 'NO', amount: string) => {
    console.log(`Demo Trade: ${side} for ${amount} USDC`)
    setLastTrade({ side, amount })
    
    // Simulate transaction delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Demo trade executed successfully')
        alert(`Demo Trade Executed!\n\nSide: ${side}\nAmount: ${amount} USDC\n\nThis is a demo - no real transaction was made.`)
        resolve()
      }, 2000)
    })
  }

  return (
    <PageErrorBoundary pageName="Trading Demo">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/demo">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Demo
            </Link>
          </Button>
        </div>

        {/* Demo Controls */}
        <div className="mb-8 p-4 border rounded-lg bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">Trading Interface Demo</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Test the trading interface with different market conditions. No real transactions will be made.
          </p>
          
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setSelectedMarket('active')}
              variant={selectedMarket === 'active' ? 'default' : 'outline'}
              size="sm"
            >
              75/25 Market
            </Button>
            <Button
              onClick={() => setSelectedMarket('balanced')}
              variant={selectedMarket === 'balanced' ? 'default' : 'outline'}
              size="sm"
            >
              50/50 Market
            </Button>
            <Button
              onClick={() => setSelectedMarket('skewed')}
              variant={selectedMarket === 'skewed' ? 'default' : 'outline'}
              size="sm"
            >
              90/10 Market
            </Button>
          </div>

          {lastTrade && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                Last Demo Trade: {lastTrade.side} for {lastTrade.amount} USDC
              </p>
            </div>
          )}
        </div>

        {/* Market Header */}
        <div className="mb-6">
          <MarketHeader
            market={getCurrentMarket()}
            onShare={() => alert('Share functionality (demo)')}
            onBookmark={() => alert('Bookmark functionality (demo)')}
            onReport={() => alert('Report functionality (demo)')}
          />
        </div>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TradingInterface
              market={getCurrentMarket()}
              onTrade={handleTrade}
            />
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Demo Features</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Real-time probability calculations</li>
                <li>• CPMM share estimation</li>
                <li>• Potential return calculations</li>
                <li>• Input validation</li>
                <li>• Quick amount buttons</li>
                <li>• Slippage protection settings</li>
                <li>• Responsive design</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Try These Actions</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>1. Switch between YES/NO sides</li>
                <li>2. Enter different amounts</li>
                <li>3. Use quick amount buttons</li>
                <li>4. View payout calculations</li>
                <li>5. Toggle advanced settings</li>
                <li>6. Test with different markets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  )
}