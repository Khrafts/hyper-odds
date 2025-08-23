import { Address } from 'viem'

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  421614: {
    ParimutuelMarketFactory: '0xab2632A369366Fc5b0EAb208c5e5AebfAD8F8920' as Address,
    ParimutuelMarket: '0x89b371a0a56713C3E660C9eFCe659853c755dDF9' as Address, // Test market (will be updated after creation)
    MarketImplementation: '0xD91f3504ACEad6c98e7f27F2DFE821Ee4d50326A' as Address, // ParimutuelMarketImplementation
    CPMMImplementation: '0x96AE7cAF393793D430BF738eEEe2b70CDE2a0F98' as Address, // CPMMMarketImplementation
    StakeToken: '0x6F3647734a84ABbAd1B5D7A610aFF6eCbA113F7d' as Address, // MockUSDC
    MarketRouter: '0x57C8Cf1db2dd83D221656A791AF3D0112A8798b4' as Address, // Router contract
    Oracle: '0x741c8a67ECc595252776B9CE9474bC7dbDFd9f4F' as Address,
    StHYPE: '0xAc33aF010196250dc2041Da4227e58D5a98897F3' as Address,
    WHYPE: '0x689A1e548181A843e8E72c0217cf4d47f63f8e87' as Address, // MockWHYPE
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
 * CPMMMarket contract ABI
 * Core functions for CPMM market interactions
 */
export const CPMM_MARKET_ABI = [
  // Initialize function
  {
    inputs: [
      { internalType: 'uint256', name: '_liquidityAmount', type: 'uint256' },
      { internalType: 'uint256', name: '_initialProbBps', type: 'uint256' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // Buy shares
  {
    inputs: [
      { internalType: 'uint8', name: '_outcome', type: 'uint8' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint256', name: '_minSharesOut', type: 'uint256' },
    ],
    name: 'buyShares',
    outputs: [{ internalType: 'uint256', name: 'sharesOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Sell shares
  {
    inputs: [
      { internalType: 'uint8', name: '_outcome', type: 'uint8' },
      { internalType: 'uint256', name: '_sharesIn', type: 'uint256' },
      { internalType: 'uint256', name: '_minAmountOut', type: 'uint256' },
    ],
    name: 'sellShares',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get price
  {
    inputs: [],
    name: 'getSpotPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get reserves
  {
    inputs: [],
    name: 'reserveYES',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reserveNO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get user shares
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'sharesYES',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'sharesNO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Claim winnings
  {
    inputs: [],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Calculate buy amount
  {
    inputs: [
      { internalType: 'uint8', name: '_outcome', type: 'uint8' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
    ],
    name: 'calculateBuyAmount',
    outputs: [
      { internalType: 'uint256', name: 'sharesOut', type: 'uint256' },
      { internalType: 'uint256', name: 'feeAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Calculate sell amount
  {
    inputs: [
      { internalType: 'uint8', name: '_outcome', type: 'uint8' },
      { internalType: 'uint256', name: '_sharesIn', type: 'uint256' },
    ],
    name: 'calculateSellAmount',
    outputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint256', name: 'feeAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

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
 * Factory contract for creating new prediction markets with complex parameters
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

  // Write functions - Complex market creation
  {
    inputs: [
      {
        components: [
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          {
            components: [
              { name: 'kind', type: 'uint8' },
              { name: 'metricId', type: 'bytes32' },
              { name: 'tokenIdentifier', type: 'bytes32' },
              { name: 'valueDecimals', type: 'uint8' }
            ],
            name: 'subject',
            type: 'tuple'
          },
          {
            components: [
              { name: 'op', type: 'uint8' },
              { name: 'threshold', type: 'int256' }
            ],
            name: 'predicate',
            type: 'tuple'
          },
          {
            components: [
              { name: 'kind', type: 'uint8' },
              { name: 'tStart', type: 'uint64' },
              { name: 'tEnd', type: 'uint64' }
            ],
            name: 'window',
            type: 'tuple'
          },
          {
            components: [
              { name: 'primarySourceId', type: 'bytes32' },
              { name: 'fallbackSourceId', type: 'bytes32' },
              { name: 'roundingDecimals', type: 'uint8' }
            ],
            name: 'oracle',
            type: 'tuple'
          },
          { name: 'cutoffTime', type: 'uint64' },
          { name: 'creator', type: 'address' },
          {
            components: [
              { name: 'feeBps', type: 'uint16' },
              { name: 'creatorFeeShareBps', type: 'uint16' },
              { name: 'maxTotalPool', type: 'uint256' },
              { name: 'timeDecayBps', type: 'uint16' }
            ],
            name: 'econ',
            type: 'tuple'
          },
          { name: 'isProtocolMarket', type: 'bool' }
        ],
        name: 'p',
        type: 'tuple'
      }
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
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
    const chainName = chainId === 42161 ? 'Arbitrum One' : chainId === 421614 ? 'Arbitrum Sepolia' : `Chain ${chainId}`;
    throw new Error(`Contract ${contractName} not yet deployed on ${chainName}. Currently only available on Arbitrum Sepolia.`)
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

/**
 * Helper to detect market type from market data
 */
export function getMarketType(market: { marketType?: string; reserveYes?: string; poolYes?: string }): 'PARIMUTUEL' | 'CPMM' {
  // Explicit type field (from GraphQL)
  if (market.marketType) {
    return market.marketType as 'PARIMUTUEL' | 'CPMM'
  }
  
  // Fallback: detect by field presence
  if (market.reserveYes && market.reserveYes !== '0') {
    return 'CPMM'
  }
  
  return 'PARIMUTUEL'
}

/**
 * Get appropriate ABI for market type
 */
export function getMarketABI(marketType: 'PARIMUTUEL' | 'CPMM') {
  return marketType === 'CPMM' ? CPMM_MARKET_ABI : PARIMUTUEL_MARKET_ABI
}