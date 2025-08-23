/**
 * Trading Interface Router
 * Routes to appropriate trading interface based on market type
 */

'use client'

import React from 'react'
import { Market } from '@/types/market'
import { getMarketType } from '@/lib/web3/contracts'
import { ParimutuelTradingInterface } from './ParimutuelTradingInterface'
import { CPMMTradingInterface } from './CPMMTradingInterface'
import { useWallet } from '@/hooks/useWallet'
import { useTradingRouter } from '@/hooks/useTradingRouter'

interface TradingInterfaceRouterProps {
  market: Market
  className?: string
}

export function TradingInterfaceRouter({ market, className }: TradingInterfaceRouterProps) {
  const { address } = useWallet()
  const marketType = getMarketType(market)
  const trading = useTradingRouter(market, address)

  if (marketType === 'CPMM') {
    return (
      <CPMMTradingInterface
        market={market}
        trading={trading}
        className={className}
      />
    )
  }

  // Default to Parimutuel
  return (
    <ParimutuelTradingInterface
      market={market}
      trading={trading}
      className={className}
    />
  )
}