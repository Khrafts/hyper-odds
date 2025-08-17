'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SSRSafeConnectButton, SSRSafeSimpleConnectButton } from '../web3/connectButton'
import { Button } from '../ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { Badge } from '../ui/badge'
import { 
  Menu, 
  Settings, 
  TrendingUp, 
  Plus,
  Moon,
  Sun,
  X,
  BarChart3,
  Trophy,
  Wallet,
  HelpCircle,
  ChevronDown
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

// Navigation items configuration
const navigationItems = [
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

export function Header() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if a navigation item is active
  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">HyperOdds</span>
          <Badge variant="secondary" className="text-xs ml-2">Beta</Badge>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActiveRoute(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Create Market Button */}
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link href="/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Market
            </Link>
          </Button>

          {/* Help */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/help">
              <HelpCircle className="h-4 w-4" />
            </Link>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/settings/account">Account Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/notifications">Notifications</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/trading">Trading Preferences</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/docs">Documentation</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/support">Support</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Wallet Connect */}
          <SSRSafeConnectButton 
            size="sm" 
            variant="outline" 
            showBalance={true}
            showChain={true}
          />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-3">
            {/* Navigation Links */}
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full",
                    isActiveRoute(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Button asChild size="sm" className="w-full justify-start">
                <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Market
                </Link>
              </Button>

              <SSRSafeSimpleConnectButton className="w-full justify-start" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full justify-start"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="w-full justify-start"
              >
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="w-full justify-start"
              >
                <Link href="/help" onClick={() => setMobileMenuOpen(false)}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help & Support
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}