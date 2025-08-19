import { Address } from 'viem';

export interface MarketParams {
  title: string;
  description: string;
  subject: {
    kind: number;
    metricId: string;
    token: Address;
    valueDecimals: number;
  };
  predicate: {
    op: number;
    threshold: bigint;
  };
  window: {
    kind: number;
    tStart: bigint;
    tEnd: bigint;
  };
  oracle: {
    primarySourceId: string;
    fallbackSourceId: string;
    roundingDecimals: number;
  };
  cutoffTime: bigint;
  creator: Address;
  econ: {
    feeBps: number;
    creatorFeeShareBps: number;
    maxTotalPool: bigint;
    timeDecayBps: number;
  };
  isProtocolMarket: boolean;
}

export interface Market {
  id: Address;
  title: string;
  description: string;
  cutoffTime: bigint;
  resolveTime: bigint;
  resolved: boolean;
  winningOutcome?: number;
  poolNo: number;
  poolYes: number;
  totalPool: number;
  creator: Address;
}

export interface Position {
  stakeNo: bigint;
  stakeYes: bigint;
  totalStake: bigint;
}

export const CONTRACTS = {
  FACTORY: '0x3d2519A17eAe6323CaA36fB07ecEcDc96457aFf1' as Address,
  STHYPE: '0xa027E10C1808eE077989DfD560D5Ac00870d7963' as Address,
  STAKE_TOKEN: '0x019a0cD76A076DDd0D105101d77bD1833321BF5A' as Address,
  ROUTER: '0x52dE5EEcD112E57a13Bc41633B30336846b897cc' as Address,
} as const;

export const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cm4ty719hcpgs01wg2r5z2pa8/subgraphs/hyper-odds-testnet/0.0.5/gn';