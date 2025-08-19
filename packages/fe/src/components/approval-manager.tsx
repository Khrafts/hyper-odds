'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '@/types/contracts';
import { ERC20_ABI } from '@/lib/abis';

interface ApprovalManagerProps {
  requiredAmount?: string;
  onApprovalChange?: (isApproved: boolean) => void;
  className?: string;
}

export function ApprovalManager({ 
  requiredAmount = '0', 
  onApprovalChange,
  className = '' 
}: ApprovalManagerProps) {
  const { authenticated, user } = usePrivy();
  const { writeContract } = useWriteContract();
  
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
      enabled: !!walletAddress && authenticated,
      refetchInterval: 10000,
    }
  });

  // Check if user needs approval based on required amount and current allowance
  useEffect(() => {
    if (!allowance || !requiredAmount) {
      setNeedsApproval(true);
      onApprovalChange?.(false);
      return;
    }
    
    try {
      const requiredAmountWei = parseUnits(requiredAmount, 6); // USDC has 6 decimals
      const isApproved = allowance >= requiredAmountWei;
      setNeedsApproval(!isApproved);
      onApprovalChange?.(isApproved);
    } catch {
      setNeedsApproval(true);
      onApprovalChange?.(false);
    }
  }, [allowance, requiredAmount, onApprovalChange]);

  const handleApprove = async (unlimited = true) => {
    if (!authenticated || !walletAddress) return;
    
    try {
      setApproving(true);
      const approvalAmount = unlimited 
        ? parseUnits('1000000', 6) // Unlimited approval for convenience (USDC 6 decimals)
        : parseUnits(requiredAmount || '10', 6); // Exact amount approval (USDC 6 decimals)
      
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

  if (!authenticated) {
    return null;
  }

  const currentAllowanceFormatted = allowance ? formatUnits(allowance, 6) : '0';

  return (
    <div className={className}>
      {needsApproval ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">
            Current allowance: {parseFloat(currentAllowanceFormatted).toFixed(2)} USDC
          </div>
          
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
          
          <p className="text-xs text-gray-500 text-center">
            One-time approval enables seamless trading on all markets
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-2">
          <div className="text-center">
            <div className="text-sm text-green-600 font-medium mb-1">
              ✓ USDC Approved
            </div>
            <div className="text-xs text-gray-500">
              Allowance: {parseFloat(currentAllowanceFormatted).toFixed(2)} USDC
            </div>
          </div>
        </div>
      )}
    </div>
  );
}