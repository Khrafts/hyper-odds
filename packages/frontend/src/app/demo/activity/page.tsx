'use client'

import React from 'react'
import { ActivityFeed, MiniActivityFeed } from '@/components/markets/market-detail/activityFeed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ActivityDemoPage() {
  const handleRefresh = () => {
    console.log('Refreshing activity feed...')
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Activity Feed Demo</h1>
        <p className="text-muted-foreground">
          Showcasing the activity feed components with mock trade data
        </p>
      </div>

      {/* Full Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Full Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            marketId="demo-market"
            onRefresh={handleRefresh}
            maxHeight={500}
          />
        </CardContent>
      </Card>

      {/* Activity Feed without filters */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed (No Filters)</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            marketId="demo-market-2"
            showFilters={false}
            maxHeight={300}
          />
        </CardContent>
      </Card>

      {/* Loading State */}
      <Card>
        <CardHeader>
          <CardTitle>Loading State</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            marketId="loading-demo"
            loading={true}
          />
        </CardContent>
      </Card>

      {/* Mini Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mini Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Compact version for market cards
            </p>
            <MiniActivityFeed 
              trades={[]} // Will use mock data
              maxItems={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mini Activity Feed (3 items)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Even more compact version
            </p>
            <MiniActivityFeed 
              trades={[]} // Will use mock data
              maxItems={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Different Heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tall Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              marketId="tall-demo"
              maxHeight={600}
              showFilters={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compact Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              marketId="compact-demo"
              maxHeight={250}
              showFilters={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <a href="/demo">← Back to Demo Home</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/demo/chart">View Chart Demo →</a>
        </Button>
      </div>
    </div>
  )
}