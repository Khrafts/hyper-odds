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
  poolNo: bigint;
  poolYes: bigint;
  totalPool: bigint;
  creator: Address;
}

export interface Position {
  stakeNo: bigint;
  stakeYes: bigint;
  totalStake: bigint;
}

export const CONTRACTS = {
  FACTORY: '0x3f4FdBD7F01e813a57cbbb95A38eAB118CafF6a0' as Address,
  STHYPE: '0xa88C085Ab4C90fEa3D915539319E9E00fe8Fef40' as Address,
  STAKE_TOKEN: '0x6650830AdBa032Ef0bD83376B518d43D39AE6c46' as Address,
  ROUTER: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after deployment
} as const;

export const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cm4ty719hcpgs01wg2r5z2pa8/subgraphs/hyper-odds-testnet/0.0.2/gn';