'use client'

import { PageErrorBoundary } from '@/components/error'
import { MarketHeaderDemo } from '@/components/markets/market-detail/market-header-demo'

export default function DemoPage() {
  return (
    <PageErrorBoundary pageName="Demo">
      <div className="container mx-auto px-4 py-8">
        <MarketHeaderDemo />
      </div>
    </PageErrorBoundary>
  )
}