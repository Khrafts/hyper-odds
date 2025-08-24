// Re-export Prisma generated types
export * from '@prisma/client';

// Market-related types
export interface MarketCreatedEvent {
  marketAddress: string;
  creator: string;
  marketParams: MarketParams;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
}

export interface MarketParams {
  title: string;
  description: string;
  subject: SubjectParams;
  predicate: PredicateParams;
  window: WindowParams;
  oracle: OracleSpec;
  cutoffTime: bigint;
  creator: string;
  econ: Economics;
  isProtocolMarket: boolean;
}

export interface SubjectParams {
  kind: 0 | 1; // 0 = HL_METRIC, 1 = TOKEN_PRICE
  metricId: string;
  tokenIdentifier: string;
  valueDecimals: number;
}

export interface PredicateParams {
  op: 0 | 1 | 2 | 3; // 0 = GT, 1 = GTE, 2 = LT, 3 = LTE
  threshold: bigint;
}

export interface WindowParams {
  kind: 0 | 1 | 2; // 0 = SNAPSHOT_AT, 1 = WINDOW_SUM, 2 = WINDOW_COUNT
  tStart: bigint;
  tEnd: bigint;
}

export interface OracleSpec {
  primarySourceId: string;
  fallbackSourceId: string;
  roundingDecimals: number;
}

export interface Economics {
  feeBps: number;
  creatorFeeShareBps: number;
  maxTotalPool: bigint;
  timeDecayBps?: number;
}

// Data source types
export interface MetricValue {
  value: string;
  timestamp: Date;
  decimals?: number;
  metadata?: Record<string, any>;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  priority: number;
  timeout: number;
  rateLimit: {
    requests: number;
    window: number; // in milliseconds
  };
}

// Job system types
export interface JobData {
  marketId?: string;
  source?: string;
  identifier?: string;
  retryCount?: number;
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

// Resolution types
export interface ResolutionData {
  marketId: string;
  value: string;
  source: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// System state types
export interface SystemStateValue {
  lastProcessedBlock?: number;
  lastHealthCheck?: Date;
  metrics?: {
    totalMarkets: number;
    activeJobs: number;
    failedJobs: number;
  };
  [key: string]: any;
}

// Service health types
export interface ServiceHealth {
  healthy: boolean;
  message?: string;
  lastCheck?: Date;
  details?: Record<string, any>;
}