// Chain configurations
export const CHAINS = {
  HYPERLIQUID: {
    id: 998,
    name: 'Hyperliquid',
    rpcUrl: 'https://api.hyperliquid.xyz/evm',
    explorerUrl: 'https://explorer.hyperliquid.xyz',
    nativeCurrency: {
      name: 'HYPE',
      symbol: 'HYPE',
      decimals: 18
    }
  },
  HYPERLIQUID_TESTNET: {
    id: 998_998,
    name: 'Hyperliquid Testnet',
    rpcUrl: 'https://api.hyperliquid-testnet.xyz/evm',
    explorerUrl: 'https://explorer.hyperliquid-testnet.xyz',
    nativeCurrency: {
      name: 'HYPE',
      symbol: 'HYPE',
      decimals: 18
    }
  }
} as const;

// Protocol constants
export const PROTOCOL_CONSTANTS = {
  STAKE_PER_MARKET: 1000n * 10n ** 18n, // 1000 stHYPE
  FEE_BPS: 500, // 5%
  CREATOR_FEE_SHARE_BPS: 1000, // 10% of fees
  TREASURY_FEE_SHARE_BPS: 9000, // 90% of fees
  DISPUTE_WINDOW: 600, // 10 minutes
} as const;

// Hyperliquid metrics
export const HL_METRICS = {
  DAILY_VOLUME: 'daily_volume',
  TVL: 'tvl',
  UNIQUE_USERS: 'unique_users',
  OPEN_INTEREST: 'open_interest',
  FUNDING_RATE: 'funding_rate',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  HYPERLIQUID: {
    INFO: 'https://api.hyperliquid.xyz/info',
    WEBSOCKET: 'wss://api.hyperliquid.xyz/ws',
  },
  COINGECKO: {
    PRICE: 'https://api.coingecko.com/api/v3/simple/price',
  }
} as const;