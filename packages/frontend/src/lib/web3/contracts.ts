import { Address } from 'viem'

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  421614: {
    ParimutuelMarketFactory: '0x0737429B71cc5E0aceA43C6Ef60F72AC38Dd8A81' as Address,
    ParimutuelMarket: '0x89b371a0a56713C3E660C9eFCe659853c755dDF9' as Address, // Test market (will be updated after creation)
    MarketImplementation: '0x55A80Ce7837D251BC482CC0c8d383B7F45978288' as Address, // ParimutuelMarketImplementation
    CPMMImplementation: '0xaaefC86b452755cf83bE0BA994D7afB9aE4f3932' as Address, // CPMMMarketImplementation
    StakeToken: '0x380e784a7262d9c8b0deda2AB7436659E9514A39' as Address, // MockUSDC
    MarketRouter: '0xe049685cC6aDe34918c719982D7e0337b10B951A' as Address, // Router contract
    Oracle: '0xf462a61C6a48303e281486bDD309C06cC64a56A3' as Address,
    StHYPE: '0x7efF83564686F013a8A1e270240281B99cB7559D' as Address,
    WHYPE: '0xcd751fd7fE968Bb59D6Aa22f5F2de5C18bC9232e' as Address, // MockWHYPE
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
    name: 'stakeToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'parimutuelImplementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cpmmImplementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write functions - Market creation with updated structure
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
              { name: 'tokenIdentifier', type: 'string' },
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
      },
      { name: '_marketType', type: 'uint8' },
      { name: 'liquidityAmount', type: 'uint256' }
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  
  // Specific market type creation functions
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
              { name: 'tokenIdentifier', type: 'string' },
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
    name: 'createParimutuelMarket',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  
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
              { name: 'tokenIdentifier', type: 'string' },
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
      },
      { name: 'liquidityAmount', type: 'uint256' }
    ],
    name: 'createCPMMMarket',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // Events - Updated event signature
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'market', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: true, internalType: 'uint8', name: 'marketType', type: 'uint8' },
      {
        components: [
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          {
            components: [
              { name: 'kind', type: 'uint8' },
              { name: 'metricId', type: 'bytes32' },
              { name: 'tokenIdentifier', type: 'string' },
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
        name: 'params',
        type: 'tuple'
      },
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