'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Market, CONTRACTS } from '@/types/contracts';
import { MARKET_ABI, ERC20_ABI } from '@/lib/abis';
import { ROUTER_ABI } from '@/lib/router-abi';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const { authenticated, user } = usePrivy();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [betAmount, setBetAmount] = useState('10');
  const [approving, setApproving] = useState(false);

  const walletAddress = user?.wallet?.address;

  const totalPool = market.poolNo + market.poolYes;
  const noPercentage = totalPool > BigInt(0) ? Number((market.poolNo * BigInt(100)) / totalPool) : 50;
  const yesPercentage = totalPool > BigInt(0) ? Number((market.poolYes * BigInt(100)) / totalPool) : 50;

  const isExpired = Number(market.cutoffTime) * 1000 < Date.now();

  const handleApprove = async () => {
    if (!authenticated || !walletAddress) return;
    
    try {
      setApproving(true);
      await writeContract({
        address: CONTRACTS.STAKE_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.ROUTER, parseEther('1000000')], // Approve Router once for all markets
      });
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleBet = async (outcome: 0 | 1) => {
    if (!authenticated || !walletAddress || !betAmount) return;

    try {
      await writeContract({
        address: CONTRACTS.ROUTER,
        abi: ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [market.id, outcome, parseEther(betAmount)],
      });
    } catch (error) {
      console.error('Bet failed:', error);
    }
  };

  const handleClaim = async () => {
    if (!authenticated || !walletAddress) return;

    try {
      await writeContract({
        address: market.id,
        abi: MARKET_ABI,
        functionName: 'claim',
        args: [],
      });
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{market.title}</h3>
        <p className="text-gray-600 text-sm mb-3">{market.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span>
            Cutoff: {new Date(Number(market.cutoffTime) * 1000).toLocaleString()}
          </span>
          <span>Pool: {formatEther(totalPool)} USDC</span>
          {market.resolved && (
            <span className="text-green-600 font-medium">
              Resolved: {market.winningOutcome === 0 ? 'NO' : 'YES'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-red-50 p-3 rounded">
            <div className="text-sm font-medium text-red-700">NO</div>
            <div className="text-red-600">{noPercentage.toFixed(1)}%</div>
            <div className="text-xs text-red-500">{formatEther(market.poolNo)} USDC</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm font-medium text-green-700">YES</div>
            <div className="text-green-600">{yesPercentage.toFixed(1)}%</div>
            <div className="text-xs text-green-500">{formatEther(market.poolYes)} USDC</div>
          </div>
        </div>
      </div>

      {!authenticated ? (
        <div>
          <p className="text-gray-600 text-sm mb-3">Connect wallet to participate</p>
          
          {/* Show betting interface preview */}
          <div className="space-y-3 opacity-50 pointer-events-none">
            <div>
              <label className="block text-sm font-medium mb-1">Bet Amount (USDC)</label>
              <input
                type="number"
                className="input"
                placeholder="10"
                disabled
              />
            </div>

            <button
              disabled
              className="btn btn-secondary w-full text-sm"
            >
              Approve USDC
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
              >
                Bet NO
              </button>
              <button
                disabled
                className="btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
              >
                Bet YES
              </button>
            </div>
          </div>
        </div>
      ) : market.resolved ? (
        <button
          onClick={handleClaim}
          disabled={isPending || isConfirming}
          className="btn btn-primary w-full"
        >
          {isPending || isConfirming ? 'Claiming...' : 'Claim Winnings'}
        </button>
      ) : isExpired ? (
        <p className="text-gray-600 text-sm">Market closed</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Bet Amount (USDC)</label>
            <input
              type="number"
              className="input"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="1"
              step="1"
            />
          </div>

          <button
            onClick={handleApprove}
            disabled={approving}
            className="btn btn-secondary w-full text-sm"
          >
            {approving ? 'Approving...' : 'Approve USDC (One-time)'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleBet(0)}
              disabled={isPending || isConfirming || !betAmount}
              className="btn bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {isPending || isConfirming ? 'Betting...' : 'Bet NO'}
            </button>
            <button
              onClick={() => handleBet(1)}
              disabled={isPending || isConfirming || !betAmount}
              className="btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
            >
              {isPending || isConfirming ? 'Betting...' : 'Bet YES'}
            </button>
          </div>

          {hash && (
            <p className="text-sm text-blue-600">
              Transaction: {hash.slice(0, 10)}...
            </p>
          )}
        </div>
      )}
    </div>
  );
}