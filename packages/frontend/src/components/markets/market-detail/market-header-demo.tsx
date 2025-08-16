'use client'

import React from 'react'
import { MarketHeader } from './market-header'
import { Market } from '@/hooks/useMarkets'

// Sample market data for testing
const sampleMarket: Market = {
  id: '0x1234567890abcdef',
  title: 'Will Bitcoin reach $100,000 by December 31, 2024?',
  description: 'This market resolves to YES if Bitcoin (BTC) trades at or above $100,000 USD on any major exchange (Coinbase, Binance, Kraken) at any point before 11:59 PM UTC on December 31, 2024. Otherwise, it resolves to NO.',
  poolYes: '750000', // 750K USD
  poolNo: '250000',  // 250K USD  
  totalPool: '1000000', // 1M USD
  resolved: false,
  winningOutcome: undefined,
  cutoffTime: String(Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000)),
  resolveTime: '',
  createdAt: String(Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000)),
  creator: {
    id: '0xabcdef1234567890abcdef1234567890abcdef12'
  }
}

const resolvedMarket: Market = {
  ...sampleMarket,
  id: '0x9876543210fedcba',
  title: 'Did Ethereum upgrade to Proof-of-Stake in 2022?',
  description: 'This market resolved to YES when Ethereum successfully completed "The Merge" upgrade on September 15, 2022.',
  resolved: true,
  winningOutcome: 1,
  cutoffTime: String(Math.floor(new Date('2022-12-31T23:59:59Z').getTime() / 1000)),
  resolveTime: String(Math.floor(new Date('2022-09-15T06:42:42Z').getTime() / 1000)),
  createdAt: String(Math.floor(new Date('2022-01-01T00:00:00Z').getTime() / 1000)),
}

const expiredMarket: Market = {
  ...sampleMarket,
  id: '0xfedcba0987654321',
  title: 'Will the 2024 Olympics be held in Paris?',
  description: 'This market asks whether the 2024 Summer Olympic Games will be held in Paris, France as originally planned.',
  cutoffTime: String(Math.floor(new Date('2024-07-01T00:00:00Z').getTime() / 1000)),
  createdAt: String(Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000)),
}

export function MarketHeaderDemo() {
  const [selectedMarket, setSelectedMarket] = React.useState<'active' | 'resolved' | 'expired'>('active')

  const getCurrentMarket = () => {
    switch (selectedMarket) {
      case 'resolved':
        return resolvedMarket
      case 'expired':
        return expiredMarket
      default:
        return sampleMarket
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Market Header Demo</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMarket('active')}
            className={`px-3 py-1 rounded text-sm ${
              selectedMarket === 'active' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Active Market
          </button>
          <button
            onClick={() => setSelectedMarket('resolved')}
            className={`px-3 py-1 rounded text-sm ${
              selectedMarket === 'resolved' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Resolved Market
          </button>
          <button
            onClick={() => setSelectedMarket('expired')}
            className={`px-3 py-1 rounded text-sm ${
              selectedMarket === 'expired' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Expired Market
          </button>
        </div>
      </div>

      <MarketHeader
        market={getCurrentMarket()}
        onShare={() => alert('Share functionality')}
        onBookmark={() => alert('Bookmark functionality')}
        onReport={() => alert('Report functionality')}
      />
    </div>
  )
}