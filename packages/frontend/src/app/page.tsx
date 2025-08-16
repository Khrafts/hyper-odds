'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarketGrid } from '@/components/markets/market-grid'
import { Market } from '@/types'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowRight,
  Zap,
  Shield,
  Globe
} from 'lucide-react'

// Mock data for demonstration
const mockMarkets: Market[] = [
  {
    id: '1',
    marketId: '1',
    question: 'Will Bitcoin reach $100,000 by end of 2024?',
    description: 'Predicting if Bitcoin (BTC) will reach or exceed $100,000 USD by December 31, 2024.',
    poolYes: '12500',
    poolNo: '8750',
    totalVolume: '45230',
    totalTrades: 89,
    resolved: false,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:22:00Z',
    expirationTime: '2024-12-31T23:59:59Z',
    creator: {
      id: '1',
      address: '0x742d35Cc6634C0532925a3b8D3C2c2CE15c65a7A'
    },
    category: 'Cryptocurrency'
  },
  {
    id: '2',
    marketId: '2',
    question: 'Will Ethereum 2.0 staking rewards exceed 5% APY?',
    description: 'Will the annual percentage yield for Ethereum 2.0 staking exceed 5% for at least 30 consecutive days?',
    poolYes: '8900',
    poolNo: '15600',
    totalVolume: '32100',
    totalTrades: 67,
    resolved: false,
    status: 'active',
    createdAt: '2024-01-14T08:15:00Z',
    updatedAt: '2024-01-16T16:45:00Z',
    expirationTime: '2024-06-30T23:59:59Z',
    creator: {
      id: '2',
      address: '0x8ba1f109551bD432803012645Hac136c'
    },
    category: 'DeFi'
  },
  {
    id: '3',
    marketId: '3',
    question: 'Will a new AI model surpass GPT-4 in benchmarks by Q2 2024?',
    description: 'Will any AI model achieve higher scores than GPT-4 on standard benchmarks before July 1, 2024?',
    poolYes: '6750',
    poolNo: '4250',
    totalVolume: '18900',
    totalTrades: 45,
    resolved: false,
    status: 'active',
    createdAt: '2024-01-13T12:00:00Z',
    updatedAt: '2024-01-16T09:30:00Z',
    expirationTime: '2024-07-01T00:00:00Z',
    creator: {
      id: '3',
      address: '0x1234567890123456789012345678901234567890'
    },
    category: 'Technology'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              🚀 Now in Beta
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Trade on the Future with{' '}
              <span className="text-primary">Prediction Markets</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              HyperOdds brings transparent, decentralized prediction markets to Hyperliquid. 
              Bet on real-world events, earn from your insights, and help price the future.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg">
                <Link href="/markets">
                  Explore Markets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/create">Create Market</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24">
        <div className="container px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2.4M</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">127</div>
                <p className="text-xs text-muted-foreground">
                  +3 new today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8,429</div>
                <p className="text-xs text-muted-foreground">
                  +18% this week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Markets Resolved</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">342</div>
                <p className="text-xs text-muted-foreground">
                  98.2% accuracy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trending Markets
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover the most popular prediction markets and start trading
            </p>
          </div>
          
          <MarketGrid 
            markets={mockMarkets}
            onMarketClick={(market) => {
              // Navigation will be implemented later
              console.log('Navigate to market:', market.id)
            }}
            onTrade={(market, outcome) => {
              // Trading modal will be implemented later
              console.log('Trade on market:', market.id, 'outcome:', outcome)
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

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose HyperOdds?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built on cutting-edge technology for the ultimate prediction market experience
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Built on Hyperliquid for instant settlements and low fees
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Secure & Audited</CardTitle>
                <CardDescription>
                  Smart contracts audited by leading security firms
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <Globe className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Global Markets</CardTitle>
                <CardDescription>
                  Trade on events from crypto, sports, politics, and more
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-primary">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Start Trading?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join thousands of traders making predictions and earning rewards
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link href="/markets">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}