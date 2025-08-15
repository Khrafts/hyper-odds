import { z } from 'zod';

const ConfigSchema = z.object({
  // Blockchain Configuration
  rpcUrl: z.string().url('RPC_URL must be a valid URL'),
  privateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'PRIVATE_KEY must be a valid 32-byte hex string with 0x prefix'),
  oracleAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'ORACLE_ADDRESS must be a valid Ethereum address'),
  factoryAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'FACTORY_ADDRESS must be a valid Ethereum address'),

  // API Configuration
  hyperliquidApiUrl: z.string().url('HYPERLIQUID_API_URL must be a valid URL'),
  apiTimeout: z.coerce.number().int().min(1000).max(120000).default(30000),
  apiRetryCount: z.coerce.number().int().min(0).max(10).default(3),

  // Service Configuration
  webhookPort: z.coerce.number().int().min(1024).max(65535).default(3001),
  jobConcurrency: z.coerce.number().int().min(1).max(20).default(5),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),

  // Timing Configuration
  disputeWindow: z.coerce.number().int().min(60).max(86400).default(600),
  resolutionBuffer: z.coerce.number().int().min(0).max(3600).default(60),
  retryDelayBase: z.coerce.number().int().min(1000).max(30000).default(5000),
  retryMaxAttempts: z.coerce.number().int().min(1).max(10).default(5),

  // Monitoring
  healthCheckInterval: z.coerce.number().int().min(10000).max(300000).default(60000),
  metricsPort: z.coerce.number().int().min(1024).max(65535).optional().default(9090),

  // Legacy properties for compatibility
  gasLimitMultiplier: z.coerce.number().min(1.0).max(3.0).default(1.2),
  batchSize: z.coerce.number().int().min(1).max(100).default(10),
  webhookSecret: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    // Blockchain Configuration
    rpcUrl: process.env.RPC_URL,
    privateKey: process.env.PRIVATE_KEY,
    oracleAddress: process.env.ORACLE_ADDRESS,
    factoryAddress: process.env.FACTORY_ADDRESS,

    // API Configuration
    hyperliquidApiUrl: process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info',
    apiTimeout: process.env.API_TIMEOUT,
    apiRetryCount: process.env.API_RETRY_COUNT,

    // Service Configuration
    webhookPort: process.env.WEBHOOK_PORT,
    jobConcurrency: process.env.JOB_CONCURRENCY,
    logLevel: process.env.LOG_LEVEL,
    nodeEnv: process.env.NODE_ENV,

    // Timing Configuration
    disputeWindow: process.env.DISPUTE_WINDOW,
    resolutionBuffer: process.env.RESOLUTION_BUFFER,
    retryDelayBase: process.env.RETRY_DELAY_BASE,
    retryMaxAttempts: process.env.RETRY_MAX_ATTEMPTS,

    // Monitoring
    healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL,
    metricsPort: process.env.METRICS_PORT,

    // Legacy properties for compatibility
    gasLimitMultiplier: process.env.GAS_LIMIT_MULTIPLIER,
    batchSize: process.env.BATCH_SIZE,
    webhookSecret: process.env.WEBHOOK_SECRET,
  };

  try {
    const config = ConfigSchema.parse(rawConfig);
    
    // Validate critical configuration
    if (!config.rpcUrl) {
      throw new Error('RPC_URL is required');
    }
    if (!config.privateKey) {
      throw new Error('PRIVATE_KEY is required');
    }
    if (!config.oracleAddress) {
      throw new Error('ORACLE_ADDRESS is required');
    }
    if (!config.factoryAddress) {
      throw new Error('FACTORY_ADDRESS is required');
    }

    // Log configuration summary (without sensitive data) - will be logged by main service
    if (config.nodeEnv === 'development') {
      console.log('Configuration loaded successfully:', {
        rpcUrl: config.rpcUrl,
        oracleAddress: config.oracleAddress,
        factoryAddress: config.factoryAddress,
        hyperliquidApiUrl: config.hyperliquidApiUrl,
        webhookPort: config.webhookPort,
        jobConcurrency: config.jobConcurrency,
        nodeEnv: config.nodeEnv,
        logLevel: config.logLevel
      });
    }

    return config;
  } catch (error) {
    console.error('Configuration validation failed:');
    
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(`  - ${(error as Error).message}`);
    }
    
    console.error('\nPlease check your environment variables and .env file');
    console.error('See .env.example for required variables\n');
    
    process.exit(1);
  }
}

export const config = loadConfig();