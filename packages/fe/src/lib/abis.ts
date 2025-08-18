export const MARKET_FACTORY_ABI = [
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
              { name: 'token', type: 'address' },
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
  }
] as const;

export const MARKET_ABI = [
  {
    inputs: [
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pool',
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'resolved',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'winningOutcome',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;