import { Address } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'

/**
 * Contract addresses by network
 * Individual market addresses come from GraphQL subgraph
 */

export const CONTRACTS = {
  [arbitrumSepolia.id]: {
    marketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA as Address,
    stHYPE: process.env.NEXT_PUBLIC_STHYPE_ADDRESS_SEPOLIA as Address,
    oracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA as Address,
  },
  [arbitrum.id]: {
    marketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET as Address,
    stHYPE: process.env.NEXT_PUBLIC_STHYPE_ADDRESS_MAINNET as Address,
    oracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS_MAINNET as Address,
  },
} as const

/**
 * Get contract addresses for current network
 */
export function getContractAddresses(chainId: number) {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS]
  
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  // Validate required addresses are present
  if (!addresses.marketFactory || !addresses.stHYPE || !addresses.oracle) {
    throw new Error(`Missing contract addresses for chain ${chainId}`)
  }

  return addresses
}

/**
 * Get specific contract address
 */
export function getContractAddress(
  chainId: number, 
  contract: 'marketFactory' | 'stHYPE' | 'oracle'
): Address {
  const addresses = getContractAddresses(chainId)
  return addresses[contract]
}

/**
 * Check if chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in CONTRACTS
}

/**
 * Export supported chain IDs
 */
export const SUPPORTED_CHAINS = [arbitrumSepolia.id, arbitrum.id] as const