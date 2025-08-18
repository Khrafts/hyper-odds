import { GraphQLClient } from 'graphql-request';
import { SUBGRAPH_URL } from '@/types/contracts';

export const graphqlClient = new GraphQLClient(SUBGRAPH_URL);

export const GET_MARKETS = `
  query GetMarkets($first: Int = 100, $skip: Int = 0) {
    markets(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id
      title
      description
      cutoffTime
      resolveTime
      resolved
      winningOutcome
      poolNo
      poolYes
      totalPool
      creator {
        id
      }
      createdAt
    }
  }
`;

export const GET_MARKET_BY_ID = `
  query GetMarket($id: ID!) {
    market(id: $id) {
      id
      title
      description
      cutoffTime
      resolveTime
      resolved
      winningOutcome
      poolNo
      poolYes
      totalPool
      creator {
        id
      }
      createdAt
    }
  }
`;

export const GET_USER_POSITIONS = `
  query GetUserPositions($user: String!) {
    positions(where: { user: $user }) {
      id
      market {
        id
        title
        resolved
        winningOutcome
      }
      stakeNo
      stakeYes
      totalStake
      claimed
      payout
    }
  }
`;