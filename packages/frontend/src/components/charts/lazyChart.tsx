'use client'

import React, { Suspense, lazy } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Lazy load chart components to reduce initial bundle size
const ProbabilityChart = lazy(() => 
  import('./probabilityChart').then(module => ({ default: module.ProbabilityChart }))
)

const MiniProbabilityChart = lazy(() => 
  import('./probabilityChart').then(module => ({ default: module.MiniProbabilityChart }))
)

// Loading skeleton for charts
function ChartSkeleton({ height = 300, mini = false }: { height?: number; mini?: boolean }) {
  if (mini) {
    return (
      <div style={{ height }} className="w-full">
        <Skeleton className="w-full h-full rounded" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="space-y-3">
          <Skeleton className="w-full h-full rounded" />
          <div className="flex justify-center gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Lazy-loaded probability chart wrapper
export interface LazyProbabilityChartProps {
  market?: any
  marketTitle?: string
  className?: string
  height?: number
  showVolume?: boolean
}

export function LazyProbabilityChart(props: LazyProbabilityChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <ProbabilityChart {...props} />
    </Suspense>
  )
}

// Lazy-loaded mini chart wrapper
export interface LazyMiniChartProps {
  market?: any
  height?: number
  className?: string
}

export function LazyMiniProbabilityChart(props: LazyMiniChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} mini />}>
      <MiniProbabilityChart {...props} />
    </Suspense>
  )
}