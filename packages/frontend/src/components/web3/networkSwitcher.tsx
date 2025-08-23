'use client';

import { useSwitchChain, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, CheckIcon, AlertTriangleIcon } from 'lucide-react';
import { getChainMetadata, getChainName } from '@/lib/web3/chains';
import { isSupportedChain, getSupportedChains } from '@/lib/web3/contracts';
import { arbitrum, arbitrumSepolia } from 'viem/chains';

interface NetworkSwitcherProps {
  variant?: 'default' | 'compact';
  showUnsupportedWarning?: boolean;
}

export function NetworkSwitcher({ 
  variant = 'default',
  showUnsupportedWarning = true 
}: NetworkSwitcherProps) {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  
  const supportedChainIds = getSupportedChains();
  const currentChainSupported = isSupportedChain(chainId);
  const currentChainMetadata = getChainMetadata(chainId);
  
  const handleSwitchChain = (targetChainId: number) => {
    if (targetChainId === chainId) return;
    switchChain({ chainId: targetChainId });
  };

  const getSupportedChainInfo = (chainId: number) => {
    if (chainId === arbitrum.id) {
      return {
        name: 'Arbitrum One',
        shortName: 'ARB',
        isTestnet: false,
        color: '#28A0F0'
      };
    } else if (chainId === arbitrumSepolia.id) {
      return {
        name: 'Arbitrum Sepolia',
        shortName: 'ARB-SEP', 
        isTestnet: true,
        color: '#28A0F0'
      };
    }
    return null;
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {!currentChainSupported && showUnsupportedWarning && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangleIcon className="h-3 w-3 mr-1" />
            Unsupported
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={currentChainSupported ? "outline" : "destructive"}
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={isPending}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentChainMetadata?.color || '#6B7280' }}
              />
              {currentChainMetadata?.shortName || 'Unknown'}
              <ChevronDownIcon className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {supportedChainIds.map((supportedChainId) => {
              const chainInfo = getSupportedChainInfo(supportedChainId);
              if (!chainInfo) return null;
              
              return (
                <DropdownMenuItem
                  key={supportedChainId}
                  onClick={() => handleSwitchChain(supportedChainId)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainInfo.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{chainInfo.name}</div>
                    {chainInfo.isTestnet && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Testnet
                      </Badge>
                    )}
                  </div>
                  {chainId === supportedChainId && (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentChainMetadata?.color || '#6B7280' }}
          />
          <div>
            <div className="font-medium">
              {getChainName(chainId)}
            </div>
            <div className="text-sm text-muted-foreground">
              Chain ID: {chainId}
            </div>
          </div>
        </div>
        
        {!currentChainSupported && (
          <Badge variant="destructive">
            <AlertTriangleIcon className="h-3 w-3 mr-1" />
            Unsupported
          </Badge>
        )}
      </div>

      {!currentChainSupported && (
        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
            Switch to a Supported Network
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-300 mb-3">
            HyperOdds currently supports Arbitrum One and Arbitrum Sepolia. Please switch your network to continue.
          </div>
          <div className="space-y-2">
            {supportedChainIds.map((supportedChainId) => {
              const chainInfo = getSupportedChainInfo(supportedChainId);
              if (!chainInfo) return null;
              
              return (
                <Button
                  key={supportedChainId}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwitchChain(supportedChainId)}
                  disabled={isPending}
                  className="w-full justify-start gap-3"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainInfo.color }}
                  />
                  <span>Switch to {chainInfo.name}</span>
                  {chainInfo.isTestnet && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Testnet
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      
      {currentChainSupported && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
            <CheckIcon className="h-4 w-4" />
            Network Supported
          </div>
          <div className="text-xs text-green-600 dark:text-green-300 mt-1">
            You're connected to a supported network and can use all features.
          </div>
        </div>
      )}
    </div>
  );
}