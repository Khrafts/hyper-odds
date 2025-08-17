'use client'

import React from 'react'
import { ProbabilityChart, MiniProbabilityChart } from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricePoint } from '@/types/market'

function generateMockPriceData(): PricePoint[] {
  const data: PricePoint[] = []
  const now = Date.now() / 1000 // Convert to seconds
  
  for (let i = 48; i >= 0; i--) {
    const timestamp = (now - (i * 3600)).toString() // Every hour for 48 hours
    
    // Create trending data - start at 40% YES, trending up to 75%
    const progress = (48 - i) / 48
    const baseYesPrice = 0.4 + (progress * 0.35) // 40% to 75%
    
    // Add some realistic noise
    const noise = (Math.random() - 0.5) * 0.05
    const yesPrice = Math.max(0.1, Math.min(0.9, baseYesPrice + noise))
    const noPrice = 1 - yesPrice
    
    // Generate volume data
    const baseVolume = 50000 + (progress * 100000) // Increasing volume over time
    const volumeNoise = (Math.random() - 0.5) * 20000
    const volume = Math.max(10000, baseVolume + volumeNoise).toString()
    
    data.push({
      timestamp,
      yesPrice,
      noPrice,
      volume
    })
  }
  
  return data
}

export default function ChartDemoPage() {
  const mockData = generateMockPriceData()
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Chart Component Demo</h1>
        <p className="text-muted-foreground">
          Showcasing the probability chart components with live mock data
        </p>
      </div>

      {/* Full Size Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Full Size Probability Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ProbabilityChart
            data={mockData}
            marketTitle="Will Bitcoin reach $100,000 by December 31, 2024?"
            height={400}
          />
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Chart with Volume Display</CardTitle>
        </CardHeader>
        <CardContent>
          <ProbabilityChart
            data={mockData}
            marketTitle="Trading Volume Over Time"
            height={300}
            showVolume={true}
          />
        </CardContent>
      </Card>

      {/* Mini Charts Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Mini Chart Variations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium">Compact Chart</h3>
              <MiniProbabilityChart data={mockData} height={120} />
              <p className="text-sm text-muted-foreground">Perfect for cards</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Tiny Chart</h3>
              <MiniProbabilityChart data={mockData} height={80} />
              <p className="text-sm text-muted-foreground">Ultra compact</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Standard Mini</h3>
              <MiniProbabilityChart data={mockData} height={100} />
              <p className="text-sm text-muted-foreground">Default size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Features Demo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Different Heights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Tall Chart (500px)</h4>
              <ProbabilityChart
                data={mockData}
                height={200}
                className="mb-4"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Short Chart (200px)</h4>
              <ProbabilityChart
                data={mockData}
                height={150}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chart States</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">With Data</h4>
              <MiniProbabilityChart data={mockData.slice(0, 10)} height={120} />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Empty State</h4>
              <ProbabilityChart
                data={[]}
                height={120}
                marketTitle="No Data Available"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hover over the chart lines to see detailed tooltips with timestamps and probabilities.
              The chart is fully responsive and works on all screen sizes.
            </p>
            
            <ProbabilityChart
              data={mockData}
              marketTitle="Interactive Chart - Hover to explore"
              height={350}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-green-600">Current YES</div>
                <div>{(mockData[mockData.length - 1]?.yesPrice * 100 || 0).toFixed(1)}%</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">Current NO</div>
                <div>{(mockData[mockData.length - 1]?.noPrice * 100 || 0).toFixed(1)}%</div>
              </div>
              <div>
                <div className="font-semibold">Data Points</div>
                <div>{mockData.length}</div>
              </div>
              <div>
                <div className="font-semibold">Time Range</div>
                <div>48 hours</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <a href="/demo">← Back to Demo Home</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/markets">View Live Markets →</a>
        </Button>
      </div>
    </div>
  )
}