'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, stringToHex } from 'viem';
import { CONTRACTS } from '@/types/contracts';
import { MARKET_FACTORY_ABI, ERC20_ABI } from '@/lib/abis';

export function CreateMarketForm() {
  const { authenticated, user } = usePrivy();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cutoffTime: '',
    maxPool: '1000',
  });

  const [approving, setApproving] = useState(false);
  const walletAddress = user?.wallet?.address;

  const handleApprove = async () => {
    if (!authenticated || !walletAddress) return;
    
    try {
      setApproving(true);
      await writeContract({
        address: CONTRACTS.STHYPE,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.FACTORY, parseEther('1000')], // 1000 stHYPE
      });
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !walletAddress) return;

    const cutoffTimestamp = Math.floor(new Date(formData.cutoffTime).getTime() / 1000);
    const windowStart = BigInt(cutoffTimestamp - 3600); // 1 hour before cutoff
    const windowEnd = BigInt(cutoffTimestamp);

    const marketParams = {
      title: formData.title,
      description: formData.description,
      subject: {
        kind: 0, // HL_METRIC
        metricId: stringToHex('BTC_PRICE', { size: 32 }),
        token: CONTRACTS.STAKE_TOKEN,
        valueDecimals: 8,
      },
      predicate: {
        op: 0, // GT
        threshold: BigInt(50000 * 1e8), // $50,000 in 8 decimals
      },
      window: {
        kind: 0, // SNAPSHOT_AT
        tStart: windowStart,
        tEnd: windowEnd,
      },
      oracle: {
        primarySourceId: stringToHex('COINBASE', { size: 32 }),
        fallbackSourceId: stringToHex('BINANCE', { size: 32 }),
        roundingDecimals: 2,
      },
      cutoffTime: BigInt(cutoffTimestamp),
      creator: walletAddress,
      econ: {
        feeBps: 500, // 5%
        creatorFeeShareBps: 1000, // 10%
        maxTotalPool: parseEther(formData.maxPool),
        timeDecayBps: 1000, // 10%
      },
      isProtocolMarket: false,
    };

    try {
      await writeContract({
        address: CONTRACTS.FACTORY,
        abi: MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [marketParams],
      });
    } catch (error) {
      console.error('Market creation failed:', error);
    }
  };

  if (!authenticated) {
    return (
      <div className="card">
        <p className="text-gray-600 mb-4">Connect your wallet to create markets</p>
        
        {/* Show form preview so user can see the styling */}
        <form className="space-y-4 opacity-50 pointer-events-none">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              className="input"
              placeholder="Will BTC hit $50k?"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Market description..."
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cutoff Time</label>
            <input
              type="datetime-local"
              className="input"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Pool Size (USDC)</label>
            <input
              type="number"
              className="input"
              placeholder="1000"
              disabled
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="btn btn-secondary w-full"
            >
              1. Approve stHYPE (1000 tokens)
            </button>

            <button
              type="button"
              disabled
              className="btn btn-primary w-full"
            >
              2. Create Market
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Will BTC hit $50k?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="input"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Market description..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cutoff Time</label>
          <input
            type="datetime-local"
            className="input"
            value={formData.cutoffTime}
            onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Pool Size (USDC)</label>
          <input
            type="number"
            className="input"
            value={formData.maxPool}
            onChange={(e) => setFormData({ ...formData, maxPool: e.target.value })}
            min="100"
            required
          />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="btn btn-secondary w-full"
          >
            {approving ? 'Approving...' : '1. Approve stHYPE (1000 tokens)'}
          </button>

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="btn btn-primary w-full"
          >
            {isPending || isConfirming ? 'Creating...' : '2. Create Market'}
          </button>
        </div>

        {hash && (
          <p className="text-sm text-green-600">
            Transaction: {hash.slice(0, 10)}...
          </p>
        )}
      </form>
    </div>
  );
}