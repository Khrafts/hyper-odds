import { Address } from 'viem'

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  // Arbitrum Sepolia testnet
  421614: {
    ParimutuelMarketFactory: '0x00e5A2346C96da6C54f53d2d53bD5536D53Fae5D' as Address,
    ParimutuelMarket: '0x89b371a0a56713C3E660C9eFCe659853c755dDF9' as Address, // Test market
    MarketImplementation: '0xC6364ccdbd7c26130ce63001Ed874b1F91669462' as Address,
    StakeToken: '0x33348eC41C542d425e652Ad224Be1662bda21199' as Address, // MockUSDC
    Oracle: '0x964c2247112Bbf53619b78deD036Fe1b285efaE7' as Address,
    StHYPE: '0xca185ec9f895E1710003204363e91D5C60ACc7b9' as Address,
  },
  // Arbitrum One mainnet (placeholder)
  42161: {
    ParimutuelMarketFactory: '0x0000000000000000000000000000000000000000' as Address,
    ParimutuelMarket: '0x0000000000000000000000000000000000000000' as Address,
    MarketImplementation: '0x0000000000000000000000000000000000000000' as Address,
    StakeToken: '0x0000000000000000000000000000000000000000' as Address,
    Oracle: '0x0000000000000000000000000000000000000000' as Address,
    StHYPE: '0x0000000000000000000000000000000000000000' as Address,
  },
} as const

/**
 * ParimutuelMarket contract ABI
 * Based on the actual deployed contract implementation
 */
export const PARIMUTUEL_MARKET_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'stakeToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cutoffTime',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'resolveTime',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'createdAt',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'resolved',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'winningOutcome',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'pool',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalPool',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' }
    ],
    name: 'stakeOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' }
    ],
    name: 'userEffectiveStakes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userInfo',
    outputs: [{ internalType: 'uint256[2]', name: '', type: 'uint256[2]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userEffectiveInfo',
    outputs: [{ internalType: 'uint256[2]', name: '', type: 'uint256[2]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTimeMultiplier',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'claimed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  
  // Write functions
  {
    inputs: [
      { internalType: 'uint8', name: 'outcome', type: 'uint8' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'outcome', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Deposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'payout', type: 'uint256' },
    ],
    name: 'Claimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint8', name: 'winningOutcome', type: 'uint8' },
      { indexed: false, internalType: 'bytes32', name: 'dataHash', type: 'bytes32' },
    ],
    name: 'Resolved',
    type: 'event',
  },
] as const

/**
 * ERC20 Token ABI (USDC)
 */
export const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * ParimutuelMarketFactory contract ABI
 * Factory contract for creating new prediction markets
 */
export const PARIMUTUEL_MARKET_FACTORY_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'markets',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write functions
  {
    inputs: [
      { internalType: 'string', name: '_question', type: 'string' },
      { internalType: 'uint256', name: '_cutoffTime', type: 'uint256' },
      { internalType: 'uint256', name: '_resolveTime', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'market', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'question', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'cutoffTime', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'resolveTime', type: 'uint256' },
    ],
    name: 'MarketCreated',
    type: 'event',
  },
] as const

/**
 * Get contract address for the current network
 */
export function getContractAddress(
  chainId: keyof typeof CONTRACT_ADDRESSES,
  contractName: keyof (typeof CONTRACT_ADDRESSES)[keyof typeof CONTRACT_ADDRESSES]
): Address {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  
  const address = addresses[contractName]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`)
  }
  
  return address
}

/**
 * Check if a chain is supported
 */
export function isSupportedChain(chainId: number): chainId is keyof typeof CONTRACT_ADDRESSES {
  return chainId in CONTRACT_ADDRESSES
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(CONTRACT_ADDRESSES).map(Number)
}

/**
 * Contract configuration for use with wagmi
 */
export const CONTRACTS = {
  ParimutuelMarket: {
    abi: PARIMUTUEL_MARKET_ABI,
  },
  ParimutuelMarketFactory: {
    abi: PARIMUTUEL_MARKET_FACTORY_ABI,
  },
  StakeToken: {
    abi: ERC20_ABI,
  },
} as const

/**
 * Type definitions for contract interactions
 */
export type ContractName = keyof typeof CONTRACTS
export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES

// Outcome enum matching smart contract
export const OUTCOME = {
  YES: 1,
  NO: 0,
} as const

export type Outcome = typeof OUTCOME[keyof typeof OUTCOME]