'use client';

import { MarketsList } from '@/components/markets-list';
import { CreateMarketForm } from '@/components/create-market-form';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Markets</h2>
          <MarketsList />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-6">Create Market</h2>
          <CreateMarketForm />
        </div>
      </div>
    </div>
  );
}