import { z } from 'zod'

// Environment schema with proper string coercion
const envSchema = z.object({
  // Required
  NEXT_PUBLIC_GRAPHQL_ENDPOINT: z.string().min(1),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  
  // Web3 with defaults
  NEXT_PUBLIC_ARBITRUM_RPC: z.string().default('https://arbitrum-sepolia.infura.io/v3/c13cd7b5b42e47fdbf4128ec97aea085'),
  
  // App config with defaults
  NEXT_PUBLIC_APP_NAME: z.string().default('HyperOdds'),
})

function createEnv() {
  // Ensure proper string coercion for Next.js client/server differences
  const cleanedEnv = {
    NEXT_PUBLIC_GRAPHQL_ENDPOINT: String(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || ''),
    NEXT_PUBLIC_PRIVY_APP_ID: String(process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''),
    NEXT_PUBLIC_ARBITRUM_RPC: String(process.env.NEXT_PUBLIC_ARBITRUM_RPC || ''),
    NEXT_PUBLIC_APP_NAME: String(process.env.NEXT_PUBLIC_APP_NAME || ''),
  }

  const result = envSchema.safeParse(cleanedEnv)

  if (!result.success) {
    console.error('❌ Environment validation failed:', {
      env: cleanedEnv,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    })
    throw new Error('Missing required environment variables')
  }

  return result.data
}

export const env = createEnv()
export type Env = z.infer<typeof envSchema>