'use client'

import { useEffect } from 'react'
import { performance } from '@/lib/performance'

interface PerformanceMonitorProps {
  children: React.ReactNode
  enabled?: boolean
}

export function PerformanceMonitor({ 
  children, 
  enabled = process.env.NODE_ENV === 'development' 
}: PerformanceMonitorProps) {
  useEffect(() => {
    if (!enabled) return

    // Mark initial load
    performance.mark('app-start')

    // Monitor Core Web Vitals
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(performance.reportWebVitals)
        getFID(performance.reportWebVitals)
        getFCP(performance.reportWebVitals)
        getLCP(performance.reportWebVitals)
        getTTFB(performance.reportWebVitals)
      }).catch(() => {
        // Gracefully handle if web-vitals is not available
        console.log('Web Vitals monitoring not available')
      })
    }

    // Log performance after initial render
    const timer = setTimeout(() => {
      performance.mark('app-ready')
      performance.measure('app-load-time', 'app-start', 'app-ready')
      
      const entries = performance.getEntries('measure')
      const loadTime = entries.find(entry => entry.name === 'app-load-time')
      
      if (loadTime) {
        console.log(`App loaded in ${loadTime.duration.toFixed(2)}ms`)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [enabled])

  return <>{children}</>
}

// Bundle size reporter for development
export function BundleSizeReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const reportBundleSize = () => {
      if (navigator.connection) {
        const connection = navigator.connection as any
        console.log('Network:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        })
      }

      // Report loaded resources
      const resources = performance.getEntries('resource')
      const totalSize = resources.reduce((sum, resource: any) => {
        return sum + (resource.transferSize || 0)
      }, 0)

      console.log(`Total resources loaded: ${(totalSize / 1024).toFixed(2)} KB`)
      
      // Group by type
      const byType = resources.reduce((acc: Record<string, number>, resource: any) => {
        const type = resource.name.split('.').pop() || 'unknown'
        acc[type] = (acc[type] || 0) + (resource.transferSize || 0)
        return acc
      }, {})

      console.table(
        Object.entries(byType).map(([type, size]) => ({
          type,
          size: `${(size / 1024).toFixed(2)} KB`
        }))
      )
    }

    const timer = setTimeout(reportBundleSize, 2000)
    return () => clearTimeout(timer)
  }, [])

  return null
}