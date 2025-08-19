import { z } from 'zod'

const envSchema = z.object({
  // Database
  NEXT_PUBLIC_GRAPHQL_ENDPOINT: z.string().url(),

  // Web3 Configuration
  NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC: z.string().url().default('https://sepolia-rollup.arbitrum.io/rpc'),
  NEXT_PUBLIC_ARBITRUM_RPC: z.string().url().default('https://arb1.arbitrum.io/rpc'),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().optional(),

  // Contract Addresses - Arbitrum Sepolia
  NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA: z.string().optional(),
  NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA: z.string().optional(),
  NEXT_PUBLIC_STHYPE_ADDRESS_SEPOLIA: z.string().optional(),

  // Contract Addresses - Arbitrum Mainnet
  NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET: z.string().optional(),
  NEXT_PUBLIC_ORACLE_ADDRESS_MAINNET: z.string().optional(),
  NEXT_PUBLIC_STHYPE_ADDRESS_MAINNET: z.string().optional(),

  // App Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('HyperOdds'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_TESTNETS: z.string().default('true').transform(val => val === 'true'),

  // Analytics (Optional)
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),

  // IPFS Configuration (Optional)
  NEXT_PUBLIC_IPFS_GATEWAY: z.string().url().default('https://gateway.pinata.cloud/ipfs/'),
})

function createEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
    console.error('Environment check:', {
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
      NODE_ENV: process.env.NODE_ENV
    })
    
    // In development, provide fallback if GraphQL endpoint is missing
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT) {
      console.warn('⚠️ NEXT_PUBLIC_GRAPHQL_ENDPOINT not found, using Goldsky default')
      return {
        ...parsed.data,
        NEXT_PUBLIC_GRAPHQL_ENDPOINT: 'https://api.goldsky.com/api/public/project_cm4ty719hcpgs01wg2r5z2pa8/subgraphs/hyper-odds-testnet/0.0.5/gn'
      } as any
    }
    
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = createEnv()

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>