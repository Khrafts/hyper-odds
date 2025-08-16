import { Address } from 'viem'

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  // Arbitrum Sepolia testnet
  421614: {
    ParimutuelMarketFactory: '0x1234567890123456789012345678901234567890' as Address,
    ParimutuelMarket: '0x0987654321098765432109876543210987654321' as Address,
  },
  // Arbitrum One mainnet (placeholder)
  42161: {
    ParimutuelMarketFactory: '0x0000000000000000000000000000000000000000' as Address,
    ParimutuelMarket: '0x0000000000000000000000000000000000000000' as Address,
  },
} as const

/**
 * ParimutuelMarket contract ABI
 * Core prediction market contract for placing bets and claiming rewards
 */
export const PARIMUTUEL_MARKET_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'question',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cutoffTime',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'resolveTime',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
    inputs: [],
    name: 'poolYes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolNo',
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
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getPosition',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'stakeYes', type: 'uint256' },
          { internalType: 'uint256', name: 'stakeNo', type: 'uint256' },
          { internalType: 'uint256', name: 'totalStake', type: 'uint256' },
          { internalType: 'uint256', name: 'effectiveStakeYes', type: 'uint256' },
          { internalType: 'uint256', name: 'effectiveStakeNo', type: 'uint256' },
          { internalType: 'uint256', name: 'totalEffectiveStake', type: 'uint256' },
          { internalType: 'bool', name: 'claimed', type: 'bool' },
          { internalType: 'uint256', name: 'payout', type: 'uint256' },
          { internalType: 'uint256', name: 'profit', type: 'uint256' },
        ],
        internalType: 'struct ParimutuelMarket.Position',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getClaimableAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  
  // Write functions
  {
    inputs: [{ internalType: 'uint8', name: 'outcome', type: 'uint8' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: '_winningOutcome', type: 'uint8' }],
    name: 'resolve',
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
      { indexed: false, internalType: 'uint256', name: 'effectiveAmount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timeMultiplier', type: 'uint256' },
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Claim',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint8', name: 'winningOutcome', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'totalPool', type: 'uint256' },
    ],
    name: 'MarketResolved',
    type: 'event',
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