'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { usePrivy } from '@privy-io/react-auth'
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
import { arbitrumSepolia } from 'wagmi/chains'

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
  const [mounted, setMounted] = React.useState(false)
  const { ready, authenticated, user, login, logout } = usePrivy()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent rendering during hydration
  if (!mounted) {
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

  // Show connect button if not authenticated with Privy
  if (!authenticated) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={login}
        className={cn('gap-2', className)}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  // Get wallet address from Privy
  const walletAddress = user?.wallet?.address

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Wallet Connection Debug:', {
      ready,
      authenticated,
      user: user?.id,
      walletAddress
    })
  }

  if (!walletAddress) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={login}
        className={cn('gap-2', className)}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  // Note: Network checking can be handled by Privy or at the transaction level

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-1 max-w-[180px] min-w-0', className)}
        >
          {showChain && (
            <div
              style={{
                background: '#28a0f0',
                width: 12,
                height: 12,
                borderRadius: 999,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                alt="Arbitrum Sepolia"
                src="https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg"
                style={{ width: 12, height: 12 }}
              />
            </div>
          )}
          <Avatar className="h-4 w-4 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {walletAddress.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline truncate min-w-0">
            {truncateAddress(walletAddress)}
          </span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium">
              {user?.email?.address ? 'Privy Account' : 'Wallet Account'}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {walletAddress}
            </div>
            {user?.email?.address && (
              <div className="text-xs text-muted-foreground mt-1">
                Email: {user.email.address}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Network: {arbitrumSepolia.name}
              <img
                alt="Arbitrum Sepolia"
                src="https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg"
                style={{ width: 12, height: 12 }}
              />
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => copyToClipboard(walletAddress)}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => window.open(`https://sepolia.arbiscan.io/address/${walletAddress}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SimpleConnectButton({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const [mounted, setMounted] = React.useState(false)
  const { authenticated, login, logout } = usePrivy()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent rendering during hydration
  if (!mounted) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
      >
        Loading...
      </Button>
    )
  }

  if (authenticated) {
    return (
      <Button
        variant="outline"
        onClick={logout}
        className={className}
      >
        {children || 'Disconnect'}
      </Button>
    )
  }

  return (
    <Button
      onClick={login}
      className={className}
    >
      {children || 'Connect Wallet'}
    </Button>
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