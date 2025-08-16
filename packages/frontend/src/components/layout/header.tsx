'use client'

import React from 'react'
import Link from 'next/link'
// import { ConnectButton } from '@rainbow-me/rainbowkit' // Temporarily disabled for debugging
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
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
  User, 
  TrendingUp, 
  Plus,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from 'next-themes'

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">HyperOdds</span>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 ml-8">
          <Link 
            href="/markets" 
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Markets
          </Link>
          <Link 
            href="/portfolio" 
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Portfolio
          </Link>
          <Link 
            href="/leaderboard" 
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Leaderboard
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Create Market Button */}
          <Button asChild size="sm" className="hidden sm:flex">
            <Link href="/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Market
            </Link>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden sm:flex"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Wallet Connect - Temporarily disabled */}
          <Button variant="outline" size="sm">
            Connect Wallet
          </Button>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/markets" className="w-full">
                    Markets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/portfolio" className="w-full">
                    Portfolio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" className="w-full">
                    Leaderboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/create" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Market
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}