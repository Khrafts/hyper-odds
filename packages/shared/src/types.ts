// Market parameter types matching Solidity structs
export enum SubjectKind {
  HL_METRIC = 0,
  TOKEN_PRICE = 1,
  GENERIC = 2
}

export enum PredicateOp {
  GT = 0,  // Greater than
  GTE = 1, // Greater than or equal
  LT = 2,  // Less than
  LTE = 3, // Less than or equal
  EQ = 4,  // Equal
  NEQ = 5  // Not equal
}

export enum WindowKind {
  SNAPSHOT_AT = 0,
  TIME_AVERAGE = 1,
  EXTREMUM = 2
}

export interface SubjectParams {
  kind: SubjectKind;
  metricId: string; // bytes32 in contract
  token: string; // address
  valueDecimals: number;
}

export interface PredicateParams {
  op: PredicateOp;
  threshold: bigint; // int256 in contract
}

export interface WindowParams {
  kind: WindowKind;
  tStart: number; // uint64
  tEnd: number; // uint64
}

export interface OracleSpec {
  primarySourceId: string; // bytes32
  fallbackSourceId: string; // bytes32
  roundingDecimals: number;
}

export interface Economics {
  feeBps: number; // uint16
  creatorFeeShareBps: number; // uint16
  maxTotalPool: bigint; // uint256
}

export interface MarketParams {
  title: string;
  description: string;
  subject: SubjectParams;
  predicate: PredicateParams;
  window: WindowParams;
  oracle: OracleSpec;
  cutoffTime: number; // uint64
  creator: string; // address
  econ: Economics;
  isProtocolMarket: boolean;
}

// Market state
export interface MarketState {
  id: string; // address
  params: MarketParams;
  resolved: boolean;
  winningOutcome?: number;
  resolutionDataHash?: string;
  pool: [bigint, bigint]; // [NO, YES]
  totalPool: bigint;
  feeCollected: bigint;
  createdAt: number;
  resolvedAt?: number;
}

// User position
export interface UserPosition {
  user: string;
  market: string;
  stake: [bigint, bigint]; // [NO, YES]
  claimed: boolean;
  payout?: bigint;
}

// Events
export interface MarketCreatedEvent {
  market: string;
  creator: string;
  params: MarketParams;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

export interface DepositedEvent {
  market: string;
  user: string;
  outcome: number;
  amount: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

export interface ResolvedEvent {
  market: string;
  outcome: number;
  dataHash: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

export interface ClaimedEvent {
  market: string;
  user: string;
  payout: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

// Aggregated stats
export interface ProtocolStats {
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalVolume: bigint;
  totalFees: bigint;
  uniqueUsers: number;
}