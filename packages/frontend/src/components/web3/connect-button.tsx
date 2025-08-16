'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectWalletButtonProps {
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
  showBalance?: boolean
  showChain?: boolean
}

const truncateAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

export function ConnectWalletButton({
  className,
  size = 'default',
  variant = 'default',
  showBalance = true,
  showChain = true,
}: ConnectWalletButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated')

        if (!ready) {
          return (
            <Button
              variant={variant}
              size={size}
              disabled
              className={cn('gap-2', className)}
            >
              <Wallet className="h-4 w-4" />
              Loading...
            </Button>
          )
        }

        if (!connected) {
          return (
            <Button
              variant={variant}
              size={size}
              onClick={openConnectModal}
              className={cn('gap-2', className)}
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )
        }

        if (chain.unsupported) {
          return (
            <Button
              variant="destructive"
              size={size}
              onClick={openChainModal}
              className={cn('gap-2', className)}
            >
              Wrong Network
            </Button>
          )
        }

        return (
          <div className={cn('flex items-center gap-2', className)}>
            {showChain && (
              <Button
                variant="outline"
                size={size}
                onClick={openChainModal}
                className="gap-2"
              >
                {chain.hasIcon && (
                  <div
                    style={{
                      background: chain.iconBackground,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      overflow: 'hidden',
                      marginRight: 4,
                    }}
                  >
                    {chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain icon'}
                        src={chain.iconUrl}
                        style={{ width: 16, height: 16 }}
                      />
                    )}
                  </div>
                )}
                {chain.name}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {account.address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {truncateAddress(account.address)}
                  </span>
                  {showBalance && account.displayBalance && (
                    <span className="hidden md:inline font-mono text-sm">
                      {account.displayBalance}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">
                    {account.displayName || 'Account'}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {account.address}
                  </div>
                  {account.displayBalance && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Balance: {account.displayBalance}
                    </div>
                  )}
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={() => copyToClipboard(account.address)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Address
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => window.open(`https://arbiscan.io/address/${account.address}`, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={openAccountModal}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export function SimpleConnectButton({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => {
        if (isConnected) {
          return (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className={className}
            >
              {children || 'Disconnect'}
            </Button>
          )
        }

        return (
          <Button
            onClick={openConnectModal}
            className={className}
          >
            {children || 'Connect Wallet'}
          </Button>
        )
      }}
    </ConnectButton.Custom>
  )
}

// SSR-safe versions
export const SSRSafeConnectButton = dynamic(
  () => Promise.resolve(ConnectWalletButton),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="sm" disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    ),
  }
)

export const SSRSafeSimpleConnectButton = dynamic(
  () => Promise.resolve(SimpleConnectButton),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled>
        Loading...
      </Button>
    ),
  }
)

export default ConnectWalletButton