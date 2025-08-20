'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarketGrid } from '@/components/markets/marketGrid'
import { useActiveMarkets, Market } from '@/hooks/useMarkets'
import { ArrowRight } from 'lucide-react'

// Mock data for demonstration (fallback)
const mockMarkets: Market[] = [
  {
    id: '1',
    title: 'Will Bitcoin reach $100,000 by end of 2024?',
    description: 'Predicting if Bitcoin (BTC) will reach or exceed $100,000 USD by December 31, 2024.',
    poolYes: '12500',
    poolNo: '8750',
    totalPool: '21250',
    resolved: false,
    cutoffTime: '1735689599',
    resolveTime: '1735693199',
    createdAt: '1705314600',
    creator: {
      id: '0x742d35Cc6634C0532925a3b8D3C2c2CE15c65a7A'
    }
  },
  {
    id: '2',
    title: 'Will Ethereum 2.0 staking rewards exceed 5% APY?',
    description: 'Will the annual percentage yield for Ethereum 2.0 staking exceed 5% for at least 30 consecutive days?',
    poolYes: '8900',
    poolNo: '15600',
    totalPool: '24500',
    resolved: false,
    cutoffTime: '1719792000',
    resolveTime: '1719795600',
    createdAt: '1705228500',
    creator: {
      id: '0x8ba1f109551bD432803012645Hac136c'
    }
  },
  {
    id: '3',
    title: 'Will a new AI model surpass GPT-4 in benchmarks by Q2 2024?',
    description: 'Will any AI model achieve higher scores than GPT-4 on standard benchmarks before July 1, 2024?',
    poolYes: '6750',
    poolNo: '4250',
    totalPool: '11000',
    resolved: false,
    cutoffTime: '1719792000',
    resolveTime: '1719795600',
    createdAt: '1705142400',
    creator: {
      id: '0x1234567890123456789012345678901234567890'
    }
  }
]

export function MarketsSection() {
  const router = useRouter()
  
  // Get only active (live) markets
  const { data: marketsData, loading: marketsLoading, error: marketsError } = useActiveMarkets(
    { first: 3 }
  )

  // TODO: Handle real GraphQL data structure when complex query is fixed

  // Use real data if available, fallback to filtered mock data (only live markets)
  // marketsData contains the markets array directly from the GraphQL query
  const markets = (marketsData?.markets && Array.isArray(marketsData.markets)) 
    ? marketsData.markets 
    : mockMarkets.filter(market => !market.resolved && !market.cancelled)

  // Ensure markets is always an array
  const safeMarkets = Array.isArray(markets) ? markets : []

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trending Markets
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover the most popular prediction markets and start trading
          </p>
        </div>
        
        
        <MarketGrid 
          markets={safeMarkets}
          loading={marketsLoading}
          error={marketsError?.message}
          onMarketClick={(market) => {
            // Navigate to market detail page
            router.push(`/markets/${market.id}`)
          }}
          onTrade={(market, outcome) => {
            // Navigate to market detail page and open trading sidebar
            router.push(`/markets/${market.id}?trade=${outcome.toLowerCase()}`)
          }}
        />

        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/markets">
              View All Markets
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}