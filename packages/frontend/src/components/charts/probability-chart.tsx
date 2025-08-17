'use client'

import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { PricePoint } from '@/types/market'
import { ComponentErrorBoundary } from '../error'

interface ProbabilityChartProps {
  data: PricePoint[]
  marketTitle?: string
  className?: string
  height?: number
  showVolume?: boolean
}

interface ChartDataPoint {
  timestamp: number
  yesPrice: number
  noPrice: number
  yesProbability: number
  noProbability: number
  volume: number
  formattedTime: string
}

export function ProbabilityChart({ 
  data, 
  marketTitle, 
  className,
  height = 300,
  showVolume = false
}: ProbabilityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate mock data for demonstration
      const now = Date.now()
      const mockData: ChartDataPoint[] = []
      
      for (let i = 24; i >= 0; i--) {
        const timestamp = now - (i * 60 * 60 * 1000) // Every hour for 24 hours
        const baseProb = 0.4 + Math.random() * 0.2 // Base probability between 40-60%
        const noise = (Math.random() - 0.5) * 0.1 // Add some noise
        const yesPrice = Math.max(0.1, Math.min(0.9, baseProb + noise))
        const noPrice = 1 - yesPrice
        
        mockData.push({
          timestamp,
          yesPrice,
          noPrice,
          yesProbability: yesPrice * 100,
          noProbability: noPrice * 100,
          volume: Math.random() * 10000,
          formattedTime: new Date(timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        })
      }
      
      return mockData
    }

    return data.map(point => {
      const timestamp = parseInt(point.timestamp) * 1000 // Convert to milliseconds
      const yesPrice = point.yesPrice
      const noPrice = point.noPrice
      const volume = parseFloat(point.volume || '0')
      
      return {
        timestamp,
        yesPrice,
        noPrice,
        yesProbability: yesPrice * 100,
        noProbability: noPrice * 100,
        volume,
        formattedTime: new Date(timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    })
  }, [data])

  const formatTooltip = (value: any, name: string) => {
    if (name === 'yesProbability') {
      return [`${value.toFixed(1)}%`, 'YES']
    }
    if (name === 'noProbability') {
      return [`${value.toFixed(1)}%`, 'NO']
    }
    if (name === 'volume') {
      return [`$${value.toLocaleString()}`, 'Volume']
    }
    return [value, name]
  }

  const formatXAxisTick = (tickItem: any, index: number) => {
    const dataPoint = chartData[index]
    if (!dataPoint) return ''
    
    // Show fewer labels on smaller screens
    if (chartData.length > 12 && index % 4 !== 0) return ''
    
    return dataPoint.formattedTime
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">
            {marketTitle ? `${marketTitle} - Probability` : 'Market Probability'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No chart data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ComponentErrorBoundary componentName="ProbabilityChart">
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">
            {marketTitle ? `${marketTitle} - Probability` : 'Market Probability'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {showVolume ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    stroke="#6B7280"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip 
                    formatter={formatTooltip}
                    labelFormatter={(label) => {
                      const point = chartData.find(d => d.timestamp === label)
                      return point ? new Date(point.timestamp).toLocaleString() : label
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    stroke="#6B7280"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#6B7280"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={formatTooltip}
                    labelFormatter={(label) => {
                      const point = chartData.find(d => d.timestamp === label)
                      return point ? new Date(point.timestamp).toLocaleString() : label
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="yesProbability" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="noProbability" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#EF4444' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span className="text-muted-foreground">YES</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-muted-foreground">NO</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  )
}

// Additional chart variants for different use cases

interface MiniProbabilityChartProps {
  data: PricePoint[]
  height?: number
  className?: string
}

export function MiniProbabilityChart({ data, height = 100, className }: MiniProbabilityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate simple mock data
      const mockData = []
      for (let i = 0; i < 10; i++) {
        const yesPrice = 0.4 + Math.random() * 0.2
        mockData.push({
          timestamp: Date.now() - (i * 3600000),
          yesProbability: yesPrice * 100,
          noProbability: (1 - yesPrice) * 100
        })
      }
      return mockData.reverse()
    }

    return data.map(point => ({
      timestamp: parseInt(point.timestamp) * 1000,
      yesProbability: point.yesPrice * 100,
      noProbability: point.noPrice * 100
    }))
  }, [data])

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Line 
            type="monotone" 
            dataKey="yesProbability" 
            stroke="#10B981" 
            strokeWidth={1.5}
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="noProbability" 
            stroke="#EF4444" 
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}