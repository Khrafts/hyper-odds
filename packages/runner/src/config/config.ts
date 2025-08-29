import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.coerce.number().default(3000),
  HEALTH_CHECK_PORT: z.coerce.number().default(3001),
  METRICS_PORT: z.coerce.number().default(3002),

  // Blockchain Configuration
  RPC_URL: z.string().url(),
  PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format'),
  CHAIN_ID: z.coerce.number().default(421614),

  // Contract Addresses
  FACTORY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  ORACLE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  MARKET_IMPLEMENTATION: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  CPMM_IMPLEMENTATION: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis (Job Queue)
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // API Keys
  HYPERLIQUID_API_URL: z.string().url().default('https://api.hyperliquid.xyz'),
  COINMARKETCAP_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  COINBASE_API_KEY: z.string().optional(),
  COINBASE_API_SECRET: z.string().optional(),
  COINBASE_PASSPHRASE: z.string().optional(),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),

  // Job Processing
  MAX_CONCURRENT_JOBS: z.coerce.number().default(10),
  JOB_RETRY_ATTEMPTS: z.coerce.number().default(3),
  JOB_RETRY_DELAY: z.coerce.number().default(5000),
  RESOLUTION_BUFFER_TIME: z.coerce.number().default(30000),

  // Oracle Configuration
  DISPUTE_WINDOW: z.coerce.number().default(600),
  GAS_LIMIT_MULTIPLIER: z.coerce.number().default(1.2),
  MAX_GAS_PRICE_GWEI: z.coerce.number().default(50),
  TRANSACTION_TIMEOUT: z.coerce.number().default(300000),

  // Monitoring
  ENABLE_METRICS: z.coerce.boolean().default(true),
  METRICS_INTERVAL: z.coerce.number().default(60000),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  ALERT_EMAIL: z.string().email().optional(),

  // Development
  ENABLE_DEBUG_LOGS: z.coerce.boolean().default(false),
  SIMULATE_RESOLUTION: z.coerce.boolean().default(false),
  SKIP_BLOCKCHAIN_EVENTS: z.coerce.boolean().default(false),
});

type Config = z.infer<typeof configSchema>;

function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

export const config = validateConfig();

export type { Config };