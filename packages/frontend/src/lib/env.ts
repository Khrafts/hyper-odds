import { z } from 'zod'

const envSchema = z.object({
  // Database
  NEXT_PUBLIC_GRAPHQL_ENDPOINT: z.string().url().default('http://localhost:8000/graphql'),

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
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = createEnv()

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>