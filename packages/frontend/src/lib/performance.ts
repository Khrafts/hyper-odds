import React from 'react'

/**
 * Performance optimization utilities
 */

// Lazy loading utility for heavy components
export function createLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(factory)
}

// Intersection Observer hook for lazy loading content
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)

  React.useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(elementRef.current)

    return () => observer.disconnect()
  }, [elementRef, options])

  return isIntersecting
}

// Debounced callback for performance optimization
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  // Update the callback ref when callback changes
  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

// Memory-efficient scroll handler
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = React.useState<'up' | 'down' | null>(null)
  const lastScrollY = React.useRef(0)

  React.useEffect(() => {
    let ticking = false

    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      if (Math.abs(scrollY - lastScrollY.current) < 5) {
        ticking = false
        return
      }

      setScrollDirection(scrollY > lastScrollY.current ? 'down' : 'up')
      lastScrollY.current = scrollY > 0 ? scrollY : 0
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollDirection
}

// Performance monitoring utilities
export const performance = {
  // Mark performance timing
  mark(name: string) {
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(name)
    }
  },

  // Measure performance between marks
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window !== 'undefined' && window.performance?.measure) {
      window.performance.measure(name, startMark, endMark)
    }
  },

  // Get performance entries
  getEntries(type?: string) {
    if (typeof window !== 'undefined' && window.performance?.getEntriesByType) {
      return type 
        ? window.performance.getEntriesByType(type)
        : window.performance.getEntries()
    }
    return []
  },

  // Report Core Web Vitals
  reportWebVitals(metric: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', metric)
    }
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }
}

// Bundle size optimization helpers
export const bundleOptimizations = {
  // Dynamic import with error handling
  dynamicImport: async <T>(factory: () => Promise<T>): Promise<T | null> => {
    try {
      return await factory()
    } catch (error) {
      console.error('Dynamic import failed:', error)
      return null
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: string, type?: string) => {
    if (typeof document === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    if (type) link.type = type
    
    document.head.appendChild(link)
  },

  // Prefetch resources for future navigation
  prefetchResource: (href: string) => {
    if (typeof document === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    
    document.head.appendChild(link)
  }
}

// Image optimization helpers
export const imageOptimizations = {
  // Generate srcSet for responsive images
  generateSrcSet: (src: string, sizes: number[]) => {
    return sizes
      .map(size => `${src}?w=${size} ${size}w`)
      .join(', ')
  },

  // Optimal image sizes for different breakpoints
  breakpointSizes: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  },

  // Common aspect ratios
  aspectRatios: {
    square: '1:1',
    landscape: '16:9',
    portrait: '3:4',
    wide: '21:9'
  }
}

// React performance optimizations
export const reactOptimizations = {
  // Memoized component wrapper
  memo: <P extends object>(Component: React.ComponentType<P>) => {
    return React.memo(Component)
  },

  // Stable callback reference
  useStableCallback: <T extends (...args: any[]) => any>(callback: T): T => {
    const callbackRef = React.useRef(callback)
    
    React.useEffect(() => {
      callbackRef.current = callback
    })

    return React.useCallback(
      ((...args) => callbackRef.current(...args)) as T,
      []
    )
  },

  // Memoized value with dependency comparison
  useStableMemo: <T>(factory: () => T, deps: React.DependencyList): T => {
    return React.useMemo(factory, deps)
  }
}

