import { Address } from 'viem'
import { getContractAddress } from './addresses'
import { useChainId } from 'wagmi'

// Import ABIs
import MarketFactoryABI from './abis/MarketFactory.json'
import ParimutuelMarketABI from './abis/ParimutuelMarketImplementation.json'
import stHYPEABI from './abis/stHYPE.json'
import SimpleOracleABI from './abis/SimpleOracle.json'

/**
 * Contract configurations with ABIs
 */
export const CONTRACTS_CONFIG = {
  marketFactory: {
    abi: (MarketFactoryABI as any).abi,
    name: 'MarketFactory',
  },
  parimutuelMarket: {
    abi: (ParimutuelMarketABI as any).abi,
    name: 'ParimutuelMarket',
  },
  stHYPE: {
    abi: (stHYPEABI as any).abi,
    name: 'stHYPE',
  },
  oracle: {
    abi: (SimpleOracleABI as any).abi,
    name: 'SimpleOracle',
  },
} as const

/**
 * Hook to get contract addresses for current chain
 */
export function useContractAddresses() {
  const chainId = useChainId()
  
  try {
    return {
      marketFactory: getContractAddress(chainId, 'marketFactory'),
      stHYPE: getContractAddress(chainId, 'stHYPE'),
      oracle: getContractAddress(chainId, 'oracle'),
      chainId,
    }
  } catch (error) {
    console.error('Failed to get contract addresses:', error)
    return null
  }
}

/**
 * Get contract config for MarketFactory
 */
export function useMarketFactoryConfig() {
  const chainId = useChainId()
  
  try {
    const address = getContractAddress(chainId, 'marketFactory')
    
    return {
      address,
      abi: CONTRACTS_CONFIG.marketFactory.abi,
    }
  } catch (error) {
    console.error('Failed to get MarketFactory config:', error)
    return null
  }
}

/**
 * Get contract config for stHYPE
 */
export function useStHYPEConfig() {
  const chainId = useChainId()
  
  try {
    const address = getContractAddress(chainId, 'stHYPE')
    
    return {
      address,
      abi: CONTRACTS_CONFIG.stHYPE.abi,
    }
  } catch (error) {
    console.error('Failed to get stHYPE config:', error)
    return null
  }
}

/**
 * Get contract config for Oracle
 */
export function useOracleConfig() {
  const chainId = useChainId()
  
  try {
    const address = getContractAddress(chainId, 'oracle')
    
    return {
      address,
      abi: CONTRACTS_CONFIG.oracle.abi,
    }
  } catch (error) {
    console.error('Failed to get Oracle config:', error)
    return null
  }
}

/**
 * Get contract config for Market (dynamic address from GraphQL)
 */
export function useMarketConfig(marketAddress: Address) {
  if (!marketAddress) return null

  return {
    address: marketAddress,
    abi: CONTRACTS_CONFIG.parimutuelMarket.abi,
  }
}

/**
 * Contract ABIs export for direct use
 */
export const CONTRACT_ABIS = {
  MarketFactory: CONTRACTS_CONFIG.marketFactory.abi,
  ParimutuelMarket: CONTRACTS_CONFIG.parimutuelMarket.abi,
  stHYPE: CONTRACTS_CONFIG.stHYPE.abi,
  SimpleOracle: CONTRACTS_CONFIG.oracle.abi,
} as const