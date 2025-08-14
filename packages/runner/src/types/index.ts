export interface Market {
  id: string;
  title: string;
  subjectKind: 'HL_METRIC' | 'TOKEN_PRICE' | 'GENERIC';
  metricId: string;
  token: string;
  predicateOp: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ';
  threshold: string;
  windowKind: 'SNAPSHOT_AT' | 'TIME_AVERAGE' | 'EXTREMUM';
  windowStart: string;
  windowEnd: string;
  primarySourceId: string;
  fallbackSourceId: string;
  roundingDecimals: number;
  resolveTime: string;
  poolYes: string;
  poolNo: string;
  resolved: boolean;
  cancelled: boolean;
}

export interface GoldskyWebhookPayload {
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  data_source: string;
  data: {
    old: any | null;
    new: any | null;
  };
  webhook_name: string;
  webhook_id: string;
  entity: string;
}

export interface MarketCreated {
  id: string;
  market: string;
  creator: string;
  subjectHash: string;
  predicateHash: string;
  windowSpecHash: string;
  isProtocolMarket: boolean;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

export interface ResolutionResult {
  success: boolean;
  outcome?: number;
  transactionHash?: string;
  reason?: string;
}

export interface HLMetric {
  metricId: string;
  value: string;
  timestamp: number;
}

export interface TokenPrice {
  token: string;
  price: string;
  timestamp: number;
}