'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Wallet, 
  Trophy, 
  Plus, 
  TrendingUp,
  Home,
  Settings,
  HelpCircle
} from 'lucide-react'
import { Button } from '../ui/button'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
  isExternal?: boolean
}

// Main navigation items
export const mainNavigationItems: NavigationItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
    description: 'Dashboard and overview'
  },
  {
    name: 'Markets',
    href: '/markets',
    icon: BarChart3,
    description: 'Browse prediction markets'
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Wallet,
    description: 'Your positions and trades'
  },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy,
    description: 'Top traders and rankings'
  }
]

// Secondary navigation items
export const secondaryNavigationItems: NavigationItem[] = [
  {
    name: 'Create Market',
    href: '/create',
    icon: Plus,
    description: 'Start a new prediction market'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    description: 'Market insights and trends'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Account and preferences'
  },
  {
    name: 'Help',
    href: '/help',
    icon: HelpCircle,
    description: 'Support and documentation'
  }
]

interface NavigationProps {
  items?: NavigationItem[]
  className?: string
  variant?: 'default' | 'minimal' | 'sidebar'
  orientation?: 'horizontal' | 'vertical'
  showDescriptions?: boolean
  showIcons?: boolean
}

export function Navigation({
  items = mainNavigationItems,
  className,
  variant = 'default',
  orientation = 'horizontal',
  showDescriptions = false,
  showIcons = true
}: NavigationProps) {
  const pathname = usePathname()

  // Check if a navigation item is active
  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const baseClasses = orientation === 'horizontal' 
    ? "flex items-center space-x-1" 
    : "flex flex-col space-y-1"

  const itemClasses = (href: string) => {
    const base = orientation === 'horizontal'
      ? "flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
      : "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-out hover:translate-x-1 active:translate-x-0 w-full"
    
    if (variant === 'minimal') {
      return cn(
        base,
        isActiveRoute(href)
          ? "text-primary"
          : "text-muted-foreground hover:text-primary"
      )
    }

    if (variant === 'sidebar') {
      return cn(
        base,
        isActiveRoute(href)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
      )
    }

    return cn(
      base,
      isActiveRoute(href)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
    )
  }

  return (
    <nav className={cn(baseClasses, className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          target={item.isExternal ? '_blank' : undefined}
          rel={item.isExternal ? 'noopener noreferrer' : undefined}
          className={itemClasses(item.href)}
        >
          {showIcons && (
            <item.icon className="h-4 w-4 flex-shrink-0" />
          )}
          <div className={orientation === 'vertical' && showDescriptions ? "flex flex-col items-start" : ""}>
            <span className="flex items-center gap-2">
              {item.name}
              {item.badge && (
                <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
            </span>
            {showDescriptions && item.description && orientation === 'vertical' && (
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
        </Link>
      ))}
    </nav>
  )
}

// Specialized navigation components
export function MainNavigation(props: Omit<NavigationProps, 'items'>) {
  return <Navigation items={mainNavigationItems} {...props} />
}

export function SecondaryNavigation(props: Omit<NavigationProps, 'items'>) {
  return <Navigation items={secondaryNavigationItems} {...props} />
}

// Breadcrumb navigation
interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
  }>
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-muted-foreground">/</span>
          )}
          {item.href ? (
            <Link 
              href={item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// Quick actions navigation
export function QuickActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button asChild size="sm" variant="default">
        <Link href="/create">
          <Plus className="h-4 w-4 mr-2" />
          Create Market
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/portfolio">
          <Wallet className="h-4 w-4 mr-2" />
          Portfolio
        </Link>
      </Button>
    </div>
  )
}