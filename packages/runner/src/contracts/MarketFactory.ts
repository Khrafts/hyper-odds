import marketFactoryAbi from './abis/MarketFactory.json';

export const MARKET_FACTORY_ABI = marketFactoryAbi;

// Type-safe event definitions
export interface MarketCreatedEvent {
  market: `0x${string}`;
  creator: `0x${string}`;
  marketType: 0 | 1; // 0 = PARIMUTUEL, 1 = CPMM
  params: {
    title: string;
    description: string;
    subject: {
      kind: 0 | 1; // 0 = HL_METRIC, 1 = TOKEN_PRICE
      metricId: `0x${string}`;
      tokenIdentifier: string;
      valueDecimals: number;
    };
    predicate: {
      op: 0 | 1 | 2 | 3; // 0 = GT, 1 = GTE, 2 = LT, 3 = LTE
      threshold: bigint;
    };
    window: {
      kind: 0 | 1 | 2; // 0 = SNAPSHOT_AT, 1 = WINDOW_SUM, 2 = WINDOW_COUNT
      tStart: bigint;
      tEnd: bigint;
    };
    oracle: {
      primarySourceId: `0x${string}`;
      fallbackSourceId: `0x${string}`;
      roundingDecimals: number;
    };
    cutoffTime: bigint;
    creator: `0x${string}`;
    econ: {
      feeBps: number;
      creatorFeeShareBps: number;
      maxTotalPool: bigint;
      timeDecayBps: number;
    };
    isProtocolMarket: boolean;
  };
}

// Event log type for viem
export interface MarketCreatedLog {
  address: `0x${string}`;
  blockHash: `0x${string}`;
  blockNumber: bigint;
  data: `0x${string}`;
  logIndex: number;
  removed: boolean;
  topics: [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`];
  transactionHash: `0x${string}`;
  transactionIndex: number;
  args: MarketCreatedEvent;
  eventName: 'MarketCreated';
}

// Market type enum
export enum MarketType {
  PARIMUTUEL = 0,
  CPMM = 1
}

// Subject kind enum
export enum SubjectKind {
  HL_METRIC = 0,
  TOKEN_PRICE = 1
}

// Predicate operation enum  
export enum PredicateOp {
  GT = 0,
  GTE = 1,
  LT = 2,
  LTE = 3
}

// Window kind enum
export enum WindowKind {
  SNAPSHOT_AT = 0,
  WINDOW_SUM = 1,
  WINDOW_COUNT = 2
}