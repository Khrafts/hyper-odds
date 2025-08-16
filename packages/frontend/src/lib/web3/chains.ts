import { defineChain } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'

/**
 * Supported blockchain networks
 */

// Re-export standard chains
export { arbitrum, arbitrumSepolia }

// Custom chain definitions if needed
export const hyperoddsArbitrum = defineChain({
  ...arbitrum,
  name: 'Arbitrum One (HyperOdds)',
  rpcUrls: {
    default: {
      http: ['https://arb1.arbitrum.io/rpc'],
    },
    public: {
      http: ['https://arb1.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: 'https://arbiscan.io',
    },
  },
})

export const hyperoddsArbitrumSepolia = defineChain({
  ...arbitrumSepolia,
  name: 'Arbitrum Sepolia (HyperOdds)',
  rpcUrls: {
    default: {
      http: ['https://sepolia-rollup.arbitrum.io/rpc'],
    },
    public: {
      http: ['https://sepolia-rollup.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan Sepolia',
      url: 'https://sepolia.arbiscan.io',
    },
  },
})

// Chain configuration
export const supportedChains = [
  hyperoddsArbitrum,
  hyperoddsArbitrumSepolia,
] as const

export const defaultChain = hyperoddsArbitrumSepolia

// Chain metadata
export const chainMetadata = {
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'ARB',
    isTestnet: false,
    color: '#28A0F0',
    logo: '/chains/arbitrum.svg',
  },
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    shortName: 'ARB-SEP',
    isTestnet: true,
    color: '#28A0F0',
    logo: '/chains/arbitrum.svg',
  },
} as const

// Helper functions
export function getChainMetadata(chainId: number) {
  return chainMetadata[chainId as keyof typeof chainMetadata]
}

export function isTestnet(chainId: number): boolean {
  return getChainMetadata(chainId)?.isTestnet ?? false
}

export function getChainName(chainId: number): string {
  return getChainMetadata(chainId)?.name ?? `Chain ${chainId}`
}

export function getBlockExplorerUrl(chainId: number): string {
  const chain = supportedChains.find(c => c.id === chainId)
  return chain?.blockExplorers?.default?.url ?? ''
}

export function getBlockExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = getBlockExplorerUrl(chainId)
  return baseUrl ? `${baseUrl}/tx/${txHash}` : ''
}

export function getBlockExplorerAddressUrl(chainId: number, address: string): string {
  const baseUrl = getBlockExplorerUrl(chainId)
  return baseUrl ? `${baseUrl}/address/${address}` : ''
}