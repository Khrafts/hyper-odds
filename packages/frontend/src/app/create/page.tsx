'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, stringToHex } from 'viem';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { getContractAddress, PARIMUTUEL_MARKET_FACTORY_ABI, ERC20_ABI, isSupportedChain } from '@/lib/web3/contracts';
import { useChainId } from '@/hooks/useWallet';

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
  COMMON_ORACLE_SOURCES,
  getDefaultFormData,
} from '@/types/marketCreation';

export default function CreateMarketPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [formData, setFormData] = useState<MarketFormData>(getDefaultFormData());
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    if (!isConnected || !address || !chainId) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!isSupportedChain(chainId)) {
      toast.error('Unsupported network. Please switch to Arbitrum Sepolia');
      return;
    }
    
    try {
      setApproving(true);
      const factoryAddress = getContractAddress(chainId, 'ParimutuelMarketFactory');
      const stHypeAddress = getContractAddress(chainId, 'StHYPE');
      
      await writeContract({
        address: stHypeAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [factoryAddress, parseEther('1000')], // 1000 stHYPE
      });
      
      toast.success('Approval transaction submitted');
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error('Approval failed: ' + (error.message || 'Unknown error'));
    } finally {
      setApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address || !chainId) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isSupportedChain(chainId)) {
      toast.error('Unsupported network. Please switch to Arbitrum Sepolia');
      return;
    }

    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Please enter a market title');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter a market description');
      return;
    }
    
    if (!formData.threshold) {
      toast.error('Please enter a threshold value');
      return;
    }

    if (formData.subjectKind === SubjectKind.HL_METRIC && !formData.metricId) {
      toast.error('Please select a metric');
      return;
    }
    
    if (formData.subjectKind === SubjectKind.TOKEN_PRICE && !formData.token) {
      toast.error('Please select a token');
      return;
    }

    try {
      const cutoffTimestamp = Math.floor(new Date(formData.cutoffTime).getTime() / 1000);
      const tStart = Math.floor(new Date(formData.tStart).getTime() / 1000);
      const tEnd = Math.floor(new Date(formData.tEnd).getTime() / 1000);
      
      // Validation for timing
      const now = Math.floor(Date.now() / 1000);
      if (cutoffTimestamp <= now) {
        toast.error('Cutoff time must be in the future');
        return;
      }
      
      if (tStart <= cutoffTimestamp) {
        toast.error('Window start time must be after cutoff time');
        return;
      }
      
      if (tEnd <= tStart) {
        toast.error('Window end time must be after start time');
        return;
      }

      const factoryAddress = getContractAddress(chainId, 'ParimutuelMarketFactory');
      const stakeTokenAddress = getContractAddress(chainId, 'StakeToken');
      
      const marketParams = {
        title: formData.title,
        description: formData.description,
        subject: {
          kind: formData.subjectKind,
          metricId: stringToHex(formData.metricId, { size: 32 }),
          token: (formData.token || stakeTokenAddress) as `0x${string}`,
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
        creator: address as `0x${string}`,
        econ: {
          feeBps: formData.feeBps,
          creatorFeeShareBps: formData.creatorFeeShareBps,
          maxTotalPool: parseEther(formData.maxTotalPool),
          timeDecayBps: formData.timeDecayBps,
        },
        isProtocolMarket: false,
      };

      await writeContract({
        address: factoryAddress,
        abi: PARIMUTUEL_MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [marketParams],
      });
      
      toast.success('Market creation transaction submitted');
    } catch (error: any) {
      console.error('Market creation failed:', error);
      toast.error('Market creation failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleChange = (field: keyof MarketFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderWalletRequired = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Prediction Market</CardTitle>
        <CardDescription>
          Connect your wallet to create a new prediction market
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <div className="text-sm text-muted-foreground mb-4">
            You need to connect your wallet to create markets
          </div>
          {/* Add wallet connect button here */}
        </div>
      </CardContent>
    </Card>
  );

  if (!isConnected) {
    return renderWalletRequired();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Prediction Market</CardTitle>
          <CardDescription>
            Create a new prediction market with customizable parameters. Oracle and economics settings use optimized defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Market Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Will BTC hit $50k?"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cutoffTime">Trading Cutoff Time</Label>
                  <Input
                    id="cutoffTime"
                    type="datetime-local"
                    value={formData.cutoffTime}
                    onChange={(e) => handleChange('cutoffTime', e.target.value)}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    Trading stops at this time (defaults to 00:00 UTC)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detailed description of the market conditions..."
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Subject Configuration */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Subject Configuration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectKind">Subject Type</Label>
                  <Select
                    value={formData.subjectKind.toString()}
                    onValueChange={(value) => handleChange('subjectKind', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_KIND_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valueDecimals">Value Decimals</Label>
                  <Input
                    id="valueDecimals"
                    type="number"
                    value={formData.valueDecimals}
                    onChange={(e) => handleChange('valueDecimals', parseInt(e.target.value))}
                    min="0"
                    max="18"
                    required
                  />
                </div>
              </div>

              {formData.subjectKind === SubjectKind.HL_METRIC && (
                <div className="space-y-2">
                  <Label htmlFor="metricId">Metric</Label>
                  <Select
                    value={formData.metricId}
                    onValueChange={(value) => handleChange('metricId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_METRICS.map(metric => (
                        <SelectItem key={metric.value} value={metric.value}>
                          {metric.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.subjectKind === SubjectKind.TOKEN_PRICE && (
                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select
                    value={formData.token}
                    onValueChange={(value) => handleChange('token', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a token" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TOKENS.map(token => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Predicate Configuration */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Prediction Logic</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="predicateOp">Condition</Label>
                  <Select
                    value={formData.predicateOp.toString()}
                    onValueChange={(value) => handleChange('predicateOp', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDICATE_OP_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="threshold">Threshold Value</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="any"
                    value={formData.threshold}
                    onChange={(e) => handleChange('threshold', e.target.value)}
                    placeholder="50000"
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Time Window Configuration */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Time Window</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="windowKind">Window Type</Label>
                <Select
                  value={formData.windowKind.toString()}
                  onValueChange={(value) => handleChange('windowKind', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_KIND_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tStart">Window Start Time</Label>
                  <Input
                    id="tStart"
                    type="datetime-local"
                    value={formData.tStart}
                    onChange={(e) => handleChange('tStart', e.target.value)}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    When to start measuring (defaults to 00:00 UTC)
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tEnd">Window End Time</Label>
                  <Input
                    id="tEnd"
                    type="datetime-local"
                    value={formData.tEnd}
                    onChange={(e) => handleChange('tEnd', e.target.value)}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    When to stop measuring (defaults to 00:00 UTC)
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-950/30">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    💡 Market Creation Requirements
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    Creating a market requires staking stHYPE tokens. Oracle settings (HyperLiquid + Coinbase) and economics parameters are pre-configured for optimal performance.
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  variant="outline"
                  className="w-full"
                >
                  {approving ? 'Approving...' : '1. Approve stHYPE for Market Creation'}
                </Button>

                <Button
                  type="submit"
                  disabled={isPending || isConfirming}
                  className="w-full"
                >
                  {isPending || isConfirming ? 'Creating Market...' : '2. Create Market'}
                </Button>
              </div>

              {hash && (
                <div className="text-sm text-green-600 dark:text-green-400 text-center">
                  Transaction submitted: {hash.slice(0, 10)}...{hash.slice(-8)}
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 text-center">
                  Error: {error.message}
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}