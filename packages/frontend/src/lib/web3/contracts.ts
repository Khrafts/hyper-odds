import { Address } from 'viem'

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  // Arbitrum Sepolia testnet - Updated to match fe package
  421614: {
    ParimutuelMarketFactory: '0x3d2519A17eAe6323CaA36fB07ecEcDc96457aFf1' as Address,
    ParimutuelMarket: '0x89b371a0a56713C3E660C9eFCe659853c755dDF9' as Address, // Test market
    MarketImplementation: '0xC6364ccdbd7c26130ce63001Ed874b1F91669462' as Address,
    StakeToken: '0x019a0cD76A076DDd0D105101d77bD1833321BF5A' as Address, // MockUSDC from fe
    MarketRouter: '0x52dE5EEcD112E57a13Bc41633B30336846b897cc' as Address, // Router contract
    Oracle: '0x964c2247112Bbf53619b78deD036Fe1b285efaE7' as Address,
    StHYPE: '0xa027E10C1808eE077989DfD560D5Ac00870d7963' as Address, // Updated from fe
  },
  // Arbitrum One mainnet (placeholder)
  42161: {
    ParimutuelMarketFactory: '0x0000000000000000000000000000000000000000' as Address,
    ParimutuelMarket: '0x0000000000000000000000000000000000000000' as Address,
    MarketImplementation: '0x0000000000000000000000000000000000000000' as Address,
    StakeToken: '0x0000000000000000000000000000000000000000' as Address,
    MarketRouter: '0x0000000000000000000000000000000000000000' as Address,
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
 * MarketRouter contract ABI
 * Router contract for handling deposits and claims with user attribution
 */
export const MARKET_ROUTER_ABI = [
  {
    inputs: [
      { name: 'market', type: 'address' },
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'depositToMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { name: 'market', type: 'address' },
          { name: 'outcome', type: 'uint8' },
          { name: 'amount', type: 'uint256' }
        ],
        name: 'deposits',
        type: 'tuple[]'
      }
    ],
    name: 'depositToMultiple',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'market', type: 'address' },
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    name: 'depositWithPermit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'market', type: 'address' }
    ],
    name: 'claimFromMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'markets', type: 'address[]' }
    ],
    name: 'claimFromMultiple',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
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
  MarketRouter: {
    abi: MARKET_ROUTER_ABI,
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