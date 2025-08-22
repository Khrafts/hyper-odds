'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarketsSection } from '@/components/marketsSection'
import { ClientOnly } from '@/components/clientOnly'
import { PageErrorBoundary } from '@/components/error'
import { useProtocolStats } from '@/hooks/useProtocolStats'
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

function StatsSection() {
  const { stats, loading, error } = useProtocolStats()

  if (error) {
    console.error('Failed to load protocol stats:', error)
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : stats.formattedTotalVolume}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '...' : stats.growthMetrics.volumeGrowth > 0 ? `+${stats.growthMetrics.volumeGrowth}% from last month` : 'All time volume'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : stats.activeMarkets}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '...' : `+${stats.growthMetrics.marketsThisWeek} new this week`}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : stats.totalTraders.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '...' : stats.growthMetrics.traderGrowth > 0 ? `+${stats.growthMetrics.traderGrowth}% this week` : 'Total traders'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Markets Resolved</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : stats.resolvedMarkets}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '...' : stats.resolutionRate > 0 ? `${stats.resolutionRate.toFixed(1)}% resolution rate` : 'Markets resolved'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function HomePage() {

  return (
    <PageErrorBoundary pageName="Home">
      <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="container mx-auto px-4 max-w-7xl">
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
        <div className="container mx-auto px-4 max-w-7xl">
          <ClientOnly fallback={
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">...</div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">...</div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">...</div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Markets Resolved</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">...</div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            </div>
          }>
            <StatsSection />
          </ClientOnly>
        </div>
      </section>

      {/* Featured Markets */}
      <ClientOnly fallback={
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
            <div className="text-center">Loading markets...</div>
          </div>
        </section>
      }>
        <MarketsSection />
      </ClientOnly>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-7xl">
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
        <div className="container mx-auto px-4 max-w-7xl">
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
    </PageErrorBoundary>
  )
}