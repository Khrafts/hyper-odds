'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, stringToHex } from 'viem';
import { CONTRACTS } from '@/types/contracts';
import { MARKET_FACTORY_ABI, ERC20_ABI } from '@/lib/abis';
import { 
  MarketFormData, 
  SubjectKind, 
  PredicateOp, 
  WindowKind,
  SUBJECT_KIND_OPTIONS,
  PREDICATE_OP_OPTIONS,
  WINDOW_KIND_OPTIONS,
  COMMON_METRICS,
  COMMON_TOKENS,
  COMMON_ORACLE_SOURCES
} from '@/types/market-form';

export function CreateMarketForm() {
  const { authenticated, user } = usePrivy();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [formData, setFormData] = useState<MarketFormData>({
    // Basic info
    title: '',
    description: '',
    
    // Subject
    subjectKind: SubjectKind.HL_METRIC,
    metricId: '',
    token: '',
    valueDecimals: 8,
    
    // Predicate
    predicateOp: PredicateOp.GT,
    threshold: '',
    
    // Window
    windowKind: WindowKind.SNAPSHOT_AT,
    tStart: '',
    tEnd: '',
    
    // Oracle - Using defaults
    primarySourceId: 'HYPERLIQUID',
    fallbackSourceId: 'COINBASE',
    roundingDecimals: 2,
    
    // Economics - Using defaults
    feeBps: 500, // 5%
    creatorFeeShareBps: 1000, // 10%
    maxTotalPool: '10000',
    timeDecayBps: 1000, // 10%
    
    // Timing
    cutoffTime: '',
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
    const tStart = Math.floor(new Date(formData.tStart).getTime() / 1000);
    const tEnd = Math.floor(new Date(formData.tEnd).getTime() / 1000);
    
    const marketParams = {
      title: formData.title,
      description: formData.description,
      subject: {
        kind: formData.subjectKind,
        metricId: stringToHex(formData.metricId, { size: 32 }),
        token: (formData.token || CONTRACTS.STAKE_TOKEN) as `0x${string}`,
        valueDecimals: formData.valueDecimals,
      },
      predicate: {
        op: formData.predicateOp,
        threshold: BigInt(parseFloat(formData.threshold) * Math.pow(10, formData.valueDecimals)),
      },
      window: {
        kind: formData.windowKind,
        tStart: BigInt(tStart),
        tEnd: BigInt(tEnd),
      },
      oracle: {
        primarySourceId: stringToHex(formData.primarySourceId, { size: 32 }),
        fallbackSourceId: stringToHex(formData.fallbackSourceId, { size: 32 }),
        roundingDecimals: formData.roundingDecimals,
      },
      cutoffTime: BigInt(cutoffTimestamp),
      creator: walletAddress as `0x${string}`,
      econ: {
        feeBps: formData.feeBps,
        creatorFeeShareBps: formData.creatorFeeShareBps,
        maxTotalPool: parseEther(formData.maxTotalPool),
        timeDecayBps: formData.timeDecayBps,
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

  const handleChange = (field: keyof MarketFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderFormPreview = () => (
    <div className="card">
      <p className="text-gray-600 mb-4">Connect your wallet to create markets</p>
      
      {/* Show form preview so user can see the styling */}
      <form className="space-y-6 opacity-50 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" className="input" placeholder="Will BTC hit $50k?" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject Kind</label>
            <select className="input" disabled>
              <option>HyperLiquid Metric</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea className="input" rows={2} placeholder="Market description..." disabled />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Metric</label>
            <select className="input" disabled>
              <option>Bitcoin Price</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Operation</label>
            <select className="input" disabled>
              <option>Greater Than (&gt;)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Threshold</label>
            <input type="number" className="input" placeholder="50000" disabled />
          </div>
        </div>

        <button type="button" disabled className="btn btn-primary w-full">
          Create Market
        </button>
      </form>
    </div>
  );

  if (!authenticated) {
    return renderFormPreview();
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                className="input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Will BTC hit $50k?"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Cutoff Time</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.cutoffTime}
                onChange={(e) => handleChange('cutoffTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="input"
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Market description..."
              required
            />
          </div>
        </div>

        {/* Subject Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Subject</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject Kind</label>
              <select
                className="input"
                value={formData.subjectKind}
                onChange={(e) => handleChange('subjectKind', parseInt(e.target.value))}
              >
                {SUBJECT_KIND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Value Decimals</label>
              <input
                type="number"
                className="input"
                value={formData.valueDecimals}
                onChange={(e) => handleChange('valueDecimals', parseInt(e.target.value))}
                min="0"
                max="18"
                required
              />
            </div>
          </div>

          {formData.subjectKind === SubjectKind.HL_METRIC && (
            <div>
              <label className="block text-sm font-medium mb-1">Metric</label>
              <select
                className="input"
                value={formData.metricId}
                onChange={(e) => handleChange('metricId', e.target.value)}
                required
              >
                <option value="">Select a metric</option>
                {COMMON_METRICS.map(metric => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.subjectKind === SubjectKind.TOKEN_PRICE && (
            <div>
              <label className="block text-sm font-medium mb-1">Token</label>
              <select
                className="input"
                value={formData.token}
                onChange={(e) => handleChange('token', e.target.value)}
                required
              >
                <option value="">Select a token</option>
                {COMMON_TOKENS.map(token => (
                  <option key={token.value} value={token.value}>
                    {token.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Predicate Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Predicate</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Operation</label>
              <select
                className="input"
                value={formData.predicateOp}
                onChange={(e) => handleChange('predicateOp', parseInt(e.target.value))}
              >
                {PREDICATE_OP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Threshold</label>
              <input
                type="number"
                step="any"
                className="input"
                value={formData.threshold}
                onChange={(e) => handleChange('threshold', e.target.value)}
                placeholder="50000"
                required
              />
            </div>
          </div>
        </div>

        {/* Window Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Time Window</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Window Kind</label>
            <select
              className="input"
              value={formData.windowKind}
              onChange={(e) => handleChange('windowKind', parseInt(e.target.value))}
            >
              {WINDOW_KIND_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.tStart}
                onChange={(e) => handleChange('tStart', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.tEnd}
                onChange={(e) => handleChange('tEnd', e.target.value)}
                required
              />
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <div className="text-sm text-blue-800 font-medium mb-1">
              💡 Market Creation
            </div>
            <div className="text-xs text-blue-600">
              Creating a market requires staking stHYPE tokens. Oracle and economics settings use optimized defaults.
            </div>
          </div>

          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="btn btn-secondary w-full"
          >
            {approving ? 'Approving...' : '1. Approve stHYPE for Market Creation'}
          </button>

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="btn btn-primary w-full"
          >
            {isPending || isConfirming ? 'Creating...' : '2. Create Market'}
          </button>
          
          <div className="text-xs text-gray-500 text-center">
            After creation, use your market's Router integration for seamless trading
          </div>
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