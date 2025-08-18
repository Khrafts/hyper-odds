export const ROUTER_ABI = [
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
  }
] as const;