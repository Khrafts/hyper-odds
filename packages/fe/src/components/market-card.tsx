'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
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
  const [needsApproval, setNeedsApproval] = useState(true);

  const walletAddress = user?.wallet?.address;

  // Check current USDC allowance for Router
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.STAKE_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress as `0x${string}`, CONTRACTS.ROUTER] : undefined,
    query: {
      enabled: !!walletAddress,
      refetchInterval: 10000, // Check every 10 seconds
    }
  });

  // Check if user needs approval based on bet amount and current allowance
  useEffect(() => {
    if (!allowance || !betAmount) {
      setNeedsApproval(true);
      return;
    }
    
    try {
      const betAmountWei = parseUnits(betAmount, 6); // USDC has 6 decimals
      setNeedsApproval(allowance < betAmountWei);
    } catch {
      setNeedsApproval(true);
    }
  }, [allowance, betAmount]);

  const poolNo = market.poolNo;
  const poolYes = market.poolYes;
  
  const totalPool = poolNo + poolYes;
  const noPercentage = totalPool > 0 ? (poolNo * 100) / totalPool : 50;
  const yesPercentage = totalPool > 0 ? (poolYes * 100) / totalPool : 50;

  const isExpired = Number(market.cutoffTime) * 1000 < Date.now();

  const handleApprove = async (unlimited = true) => {
    if (!authenticated || !walletAddress) return;
    
    try {
      setApproving(true);
      const approvalAmount = unlimited 
        ? parseUnits('1000000', 6) // Unlimited approval for convenience (USDC 6 decimals)
        : parseUnits(betAmount || '10', 6); // Exact amount approval (USDC 6 decimals)
      
      await writeContract({
        address: CONTRACTS.STAKE_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.ROUTER, approvalAmount],
      });
      
      // Refetch allowance after approval
      setTimeout(() => refetchAllowance(), 2000);
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
        args: [market.id, outcome, parseUnits(betAmount, 6)], // USDC has 6 decimals
      });
    } catch (error) {
      console.error('Bet failed:', error);
    }
  };

  const handleClaim = async () => {
    if (!authenticated || !walletAddress) return;

    try {
      await writeContract({
        address: CONTRACTS.ROUTER,
        abi: ROUTER_ABI,
        functionName: 'claimFromMarket',
        args: [market.id],
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
          <span>Pool: {totalPool.toFixed(2)} USDC</span>
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
            <div className="text-xs text-red-500">{poolNo.toFixed(2)} USDC</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm font-medium text-green-700">YES</div>
            <div className="text-green-600">{yesPercentage.toFixed(1)}%</div>
            <div className="text-xs text-green-500">{poolYes.toFixed(2)} USDC</div>
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

          {needsApproval ? (
            <div className="space-y-2">
              <button
                onClick={() => handleApprove(true)}
                disabled={approving}
                className="btn btn-secondary w-full text-sm"
              >
                {approving ? 'Approving...' : '✨ Unlimited Approval (Recommended)'}
              </button>
              <button
                onClick={() => handleApprove(false)}
                disabled={approving}
                className="btn btn-outline w-full text-xs"
              >
                Approve Exact Amount Only
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <span className="text-sm text-green-600 font-medium">✓ USDC Approved</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleBet(0)}
              disabled={isPending || isConfirming || !betAmount || needsApproval}
              className="btn bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {isPending || isConfirming ? 'Betting...' : 'Bet NO'}
            </button>
            <button
              onClick={() => handleBet(1)}
              disabled={isPending || isConfirming || !betAmount || needsApproval}
              className="btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
            >
              {isPending || isConfirming ? 'Betting...' : 'Bet YES'}
            </button>
          </div>
          
          {needsApproval && (
            <p className="text-xs text-gray-500 text-center">
              Please approve USDC first to place bets
            </p>
          )}

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