// Base interfaces and types
export {
  type IMetricFetcher,
  BaseMetricFetcher,
  DEFAULT_FETCHER_CONFIG,
  MetricValueSchema,
  SubjectSchema,
} from './base';

export type {
  MetricValue,
  Subject,
  SubjectKind,
  FetcherConfig,
} from './base';

// Registry for managing fetchers
export {
  MetricFetcherRegistry,
} from './registry';

export type {
  FetcherRegistryOptions,
  FetchResult,
} from './registry';

// Validation and data processing
export {
  MetricDataValidator,
  PredicateOp,
  ValidatedMetricValueSchema,
  MarketSubjectSchema,
  PredicateSchema,
  ResolutionResultSchema,
} from './validation';

export type {
  ValidatedMetricValue,
  ValidatedSubject,
  Predicate,
  ResolutionResult,
} from './validation';

// Specific fetcher implementations
export { HyperliquidService } from './hyperliquid';
export { CoinMarketCapFetcher } from './coinmarketcap';

// Utility functions
import { MetricFetcherRegistry, type FetcherRegistryOptions } from './registry';
import { HyperliquidService } from './hyperliquid';
import { CoinMarketCapFetcher } from './coinmarketcap';

export const createFetcherRegistry = (options?: FetcherRegistryOptions) => {
  return new MetricFetcherRegistry(options);
};

export const createHyperliquidFetcher = () => {
  return new HyperliquidService();
};

export const createCoinMarketCapFetcher = (apiKey?: string) => {
  return new CoinMarketCapFetcher(apiKey);
};