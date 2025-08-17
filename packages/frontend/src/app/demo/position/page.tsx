'use client'

import React from 'react'
import { PositionCard, PositionCardsList } from '@/components/portfolio/positionCard'
import { UserPosition } from '@/types/user'
import { PageErrorBoundary } from '@/components/error'
import { ClientOnly } from '@/components/clientOnly'

// Mock position data for testing
const mockPositions: UserPosition[] = [
  {
    id: '1',
    marketId: 'market1',
    userId: 'user1',
    outcome: 'YES',
    shares: '100',
    totalInvested: '85.50',
    currentValue: '92.30',
    unrealizedPnl: '6.80',
    pnlPercent: 7.95,
    isActive: true,
    canClaim: false,
    claimableAmount: null,
    firstTradeAt: '2024-01-15T10:30:00Z',
    lastTradeAt: '2024-01-20T14:45:00Z',
    market: {
      id: 'market1',
      question: 'Will Bitcoin reach $100,000 by end of 2024?',
      description: 'This market resolves to YES if Bitcoin (BTC/USD) reaches or exceeds $100,000 at any point before January 1, 2025.',
      category: 'Crypto',
      endTime: '2024-12-31T23:59:59Z',
      resolved: false,
      outcome: null
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z'
  },
  {
    id: '2',
    marketId: 'market2',
    userId: 'user1',
    outcome: 'NO',
    shares: '50',
    totalInvested: '42.75',
    currentValue: '38.20',
    unrealizedPnl: '-4.55',
    pnlPercent: -10.64,
    isActive: true,
    canClaim: false,
    claimableAmount: null,
    firstTradeAt: '2024-01-10T09:15:00Z',
    lastTradeAt: '2024-01-18T16:20:00Z',
    market: {
      id: 'market2',
      question: 'Will Tesla stock price exceed $300 by March 2024?',
      description: 'This market resolves based on Tesla Inc. (TSLA) closing price on any trading day.',
      category: 'Stocks',
      endTime: '2024-03-31T23:59:59Z',
      resolved: false,
      outcome: null
    },
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T16:20:00Z'
  },
  {
    id: '3',
    marketId: 'market3',
    userId: 'user1',
    outcome: 'YES',
    shares: '200',
    totalInvested: '120.00',
    currentValue: '150.00',
    unrealizedPnl: '30.00',
    pnlPercent: 25.0,
    isActive: false,
    canClaim: true,
    claimableAmount: '150.00',
    firstTradeAt: '2024-01-05T11:00:00Z',
    lastTradeAt: '2024-01-25T12:30:00Z',
    market: {
      id: 'market3',
      question: 'Will the 2024 Super Bowl have over 58.5 total points?',
      description: 'Market resolves based on the official combined score of both teams.',
      category: 'Sports',
      endTime: '2024-02-11T23:59:59Z',
      resolved: true,
      outcome: 'YES'
    },
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-25T12:30:00Z'
  }
]

function PositionDemoPageContent() {
  const handleClaim = async (position: UserPosition) => {
    console.log('Claiming position:', position.id)
    // Mock claim functionality
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert(`Claimed $${position.claimableAmount} for position ${position.id}`)
  }

  const handleSell = async (position: UserPosition, shares: string) => {
    console.log('Selling position:', position.id, 'shares:', shares)
    // Mock sell functionality
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert(`Sold ${shares} shares of position ${position.id}`)
  }

  return (
    <PageErrorBoundary pageName="Position Demo">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Position Card Demo</h1>
          <p className="text-muted-foreground">
            Testing the PositionCard component with various states
          </p>
        </div>

        {/* Individual Position Cards */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Individual Position Cards</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockPositions.map((position, index) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onClaim={() => handleClaim(position)}
                  onSell={(shares) => handleSell(position, shares)}
                />
              ))}
            </div>
          </div>

          {/* Compact Position Cards */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Compact Position Cards</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockPositions.map((position, index) => (
                <PositionCard
                  key={`compact-${position.id}`}
                  position={position}
                  onClaim={() => handleClaim(position)}
                  onSell={(shares) => handleSell(position, shares)}
                  compact={true}
                />
              ))}
            </div>
          </div>

          {/* Position Cards List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Position Cards List</h2>
            <PositionCardsList
              positions={mockPositions}
              onClaim={handleClaim}
              onSell={handleSell}
            />
          </div>

          {/* Loading State */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Loading State</h2>
            <PositionCardsList
              positions={[]}
              loading={true}
            />
          </div>

          {/* Empty State */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Empty State</h2>
            <PositionCardsList
              positions={[]}
              loading={false}
              emptyMessage="No positions to display"
            />
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  )
}

export default function PositionDemoPage() {
  return (
    <ClientOnly>
      <PositionDemoPageContent />
    </ClientOnly>
  )
}