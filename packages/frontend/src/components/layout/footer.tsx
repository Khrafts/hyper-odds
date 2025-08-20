'use client'

import React from 'react'
import Link from 'next/link'
import { Separator } from '../ui/separator'
import { TrendingUp, Github, Twitter, FileText, Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">HyperOdds</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized prediction markets built on Hyperliquid. 
              Trade on the future with transparent, permissionless betting.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="font-semibold">Platform</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="/markets" className="text-muted-foreground hover:text-foreground">
                Browse Markets
              </Link>
              <Link href="/create" className="text-muted-foreground hover:text-foreground">
                Create Market
              </Link>
              <Link href="/portfolio" className="text-muted-foreground hover:text-foreground">
                Your Portfolio
              </Link>
              <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground">
                Leaderboard
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold">Resources</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="/docs" className="text-muted-foreground hover:text-foreground">
                Documentation
              </Link>
              <Link href="/api" className="text-muted-foreground hover:text-foreground">
                API Reference
              </Link>
              <Link href="/help" className="text-muted-foreground hover:text-foreground">
                Help Center
              </Link>
              <Link href="/status" className="text-muted-foreground hover:text-foreground">
                System Status
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/risks" className="text-muted-foreground hover:text-foreground">
                Risk Disclosure
              </Link>
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>© 2024 HyperOdds. All rights reserved.</span>
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3" />
              <span>Audited by Certik</span>
            </div>
          </div>

          {/* Social links */}
          <div className="flex space-x-4">
            <Link 
              href="https://github.com/hyperodds" 
              className="text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link 
              href="https://twitter.com/hyperodds" 
              className="text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="h-4 w-4" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link 
              href="/docs" 
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              <span className="sr-only">Documentation</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}