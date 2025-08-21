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
  
  // Oracle (using defaults)
  primarySourceId: string;
  fallbackSourceId: string;
  roundingDecimals: number;
  
  // Economics (using defaults)
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
  { value: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', label: 'WBTC' },
  { value: '0x6B175474E89094C44Da98b954EedeAC495271d0F', label: 'DAI' },
  { value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', label: 'USDC' },
];

export const COMMON_ORACLE_SOURCES = [
  { value: 'COINBASE', label: 'Coinbase' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'HYPERLIQUID', label: 'HyperLiquid' },
  { value: 'CHAINLINK', label: 'Chainlink' },
];

// Default form values for better UX
export const getDefaultFormData = (): MarketFormData => {
  // Default to tomorrow at 00:00 UTC for cutoff
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  // Default to 1 week from tomorrow for window end
  const weekFromTomorrow = new Date(tomorrow);
  weekFromTomorrow.setDate(weekFromTomorrow.getDate() + 7);
  
  // Default window start to tomorrow
  const windowStart = new Date(tomorrow);
  
  return {
    // Basic info
    title: '',
    description: '',
    
    // Subject
    subjectKind: SubjectKind.HL_METRIC,
    metricId: '',
    token: '',
    valueDecimals: 8,
    
    // Predicate
    predicateOp: PredicateOp.GT,
    threshold: '',
    
    // Window
    windowKind: WindowKind.SNAPSHOT_AT,
    tStart: formatDateForInput(windowStart),
    tEnd: formatDateForInput(weekFromTomorrow),
    
    // Oracle - Using defaults
    primarySourceId: 'HYPERLIQUID',
    fallbackSourceId: 'COINBASE',
    roundingDecimals: 2,
    
    // Economics - Using defaults
    feeBps: 500, // 5%
    creatorFeeShareBps: 1000, // 10%
    maxTotalPool: '10000',
    timeDecayBps: 1000, // 10%
    
    // Timing
    cutoffTime: formatDateForInput(tomorrow),
  };
};

// Helper function to format date for datetime-local input
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}