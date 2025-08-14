import { z } from 'zod';

const configSchema = z.object({
  // RPC Configuration
  rpcUrl: z.string().url(),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  
  // Contract Addresses
  oracleAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  factoryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  
  // API Configuration
  hyperliquidApiUrl: z.string().url(),
  
  // Webhook Configuration
  webhookPort: z.number().int().positive(),
  webhookSecret: z.string().optional(),
  
  // Runner Configuration
  batchSize: z.number().int().positive(),
  retryAttempts: z.number().int().min(0),
  retryDelayMs: z.number().int().positive(),
  gasLimitMultiplier: z.number().positive(),
  
  // Logging
  logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    rpcUrl: process.env.RPC_URL || 'https://api.hyperliquid.xyz/evm',
    privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    oracleAddress: process.env.ORACLE_ADDRESS || '0x2345678901234567890123456789012345678901',
    factoryAddress: process.env.FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890',
    hyperliquidApiUrl: process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info',
    webhookPort: parseInt(process.env.WEBHOOK_PORT || '3000'),
    webhookSecret: process.env.WEBHOOK_SECRET,
    batchSize: parseInt(process.env.BATCH_SIZE || '10'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '5000'),
    gasLimitMultiplier: parseFloat(process.env.GAS_LIMIT_MULTIPLIER || '1.2'),
    logLevel: (process.env.LOG_LEVEL || 'info') as any
  };
  
  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    console.error('Invalid configuration:', error);
    process.exit(1);
  }
}

export const config = loadConfig();