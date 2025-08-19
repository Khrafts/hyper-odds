'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlClient, GET_MARKETS } from '@/lib/graphql';
import { Market } from '@/types/contracts';
import { MarketCard } from './market-card';

export function MarketsList() {
  const { data: markets, isLoading, error } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const result = await graphqlClient.request(GET_MARKETS) as { markets: any[] };
      // Convert string values to BigInt for compatibility
      return result.markets.map((m: any) => ({
        ...m,
        poolNo: Number(m.poolNo || 0),
        poolYes: Number(m.poolYes || 0), 
        totalPool: Number(m.totalPool || 0),
        cutoffTime: BigInt(m.cutoffTime || 0),
        resolveTime: BigInt(m.resolveTime || 0),
      })) as Market[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-red-600">Failed to load markets</p>
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-600">No markets found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}