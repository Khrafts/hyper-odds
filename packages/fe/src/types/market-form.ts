export enum SubjectKind {
  HL_METRIC = 0,
  TOKEN_PRICE = 1,
}

export enum PredicateOp {
  GT = 0,
  GTE = 1,
  LT = 2,
  LTE = 3,
}

export enum WindowKind {
  SNAPSHOT_AT = 0,
  WINDOW_SUM = 1,
  WINDOW_COUNT = 2,
}

export interface MarketFormData {
  // Basic info
  title: string;
  description: string;
  
  // Subject
  subjectKind: SubjectKind;
  metricId: string; // for HL_METRIC
  token: string; // for TOKEN_PRICE
  valueDecimals: number;
  
  // Predicate
  predicateOp: PredicateOp;
  threshold: string;
  
  // Window
  windowKind: WindowKind;
  tStart: string; // datetime-local
  tEnd: string; // datetime-local
  
  // Oracle
  primarySourceId: string;
  fallbackSourceId: string;
  roundingDecimals: number;
  
  // Economics
  feeBps: number;
  creatorFeeShareBps: number;
  maxTotalPool: string;
  timeDecayBps: number;
  
  // Timing
  cutoffTime: string; // datetime-local
}

export const SUBJECT_KIND_OPTIONS = [
  { value: SubjectKind.HL_METRIC, label: 'HyperLiquid Metric' },
  { value: SubjectKind.TOKEN_PRICE, label: 'Token Price' },
];

export const PREDICATE_OP_OPTIONS = [
  { value: PredicateOp.GT, label: 'Greater Than (>)' },
  { value: PredicateOp.GTE, label: 'Greater Than or Equal (>=)' },
  { value: PredicateOp.LT, label: 'Less Than (<)' },
  { value: PredicateOp.LTE, label: 'Less Than or Equal (<=)' },
];

export const WINDOW_KIND_OPTIONS = [
  { value: WindowKind.SNAPSHOT_AT, label: 'Snapshot At Time' },
  { value: WindowKind.WINDOW_SUM, label: 'Window Sum' },
  { value: WindowKind.WINDOW_COUNT, label: 'Window Count' },
];

export const COMMON_METRICS = [
  { value: 'BTC_PRICE', label: 'Bitcoin Price' },
  { value: 'ETH_PRICE', label: 'Ethereum Price' },
  { value: 'HL_TVL', label: 'HyperLiquid TVL' },
  { value: 'HL_VOLUME', label: 'HyperLiquid Volume' },
  { value: 'HL_TRADERS', label: 'HyperLiquid Active Traders' },
  { value: 'HL_OPEN_INTEREST', label: 'HyperLiquid Open Interest' },
];

export const COMMON_TOKENS = [
  { value: '0x0000000000000000000000000000000000000000', label: 'ETH' },
  { value: '0xA0b86a33E6C8d5a9a5b1a3f1c4b8A2e6d7c8f9e0', label: 'WBTC' },
  { value: '0x6B175474E89094C44Da98b954EedeAC495271d0F', label: 'DAI' },
  { value: '0xA0b86a33E6C8d5a9a5b1a3f1c4b8A2e6d7c8f9e0', label: 'USDC' },
];

export const COMMON_ORACLE_SOURCES = [
  { value: 'COINBASE', label: 'Coinbase' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'HYPERLIQUID', label: 'HyperLiquid' },
  { value: 'CHAINLINK', label: 'Chainlink' },
];