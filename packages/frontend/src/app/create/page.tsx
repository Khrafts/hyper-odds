'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/hooks/useWallet';
import { ClientOnly } from '@/components/clientOnly';
import { parseEther, parseUnits, stringToHex, formatEther } from 'viem';
import { toast } from 'sonner';
import { ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, ClockIcon, CogIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

import { getContractAddress, PARIMUTUEL_MARKET_FACTORY_ABI, ERC20_ABI, isSupportedChain } from '@/lib/web3/contracts';
import { useChainId } from '@/hooks/useWallet';
import { NetworkSwitcher } from '@/components/web3/networkSwitcher';

import {
  MarketFormData,
  SubjectKind,
  PredicateOp,
  WindowKind,
  MarketType,
  SUBJECT_KIND_OPTIONS,
  PREDICATE_OP_OPTIONS,
  WINDOW_KIND_OPTIONS,
  MARKET_TYPE_OPTIONS,
  COMMON_METRICS,
  COMMON_TOKENS,
  COMMON_ORACLE_SOURCES,
  getDefaultFormData,
  getAutoWindowTimes,
} from '@/types/marketCreation';

export default function CreateMarketPage() {
  return (
    <ClientOnly>
      <CreateMarketContent />
    </ClientOnly>
  );
}

function CreateMarketContent() {
  const { address, isConnected } = useWallet();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract({
    mutation: {
      onError: (error) => {
        // Handle writeContract errors immediately
        console.error('WriteContract error:', error);
        
        // Dismiss loading toasts
        toast.dismiss('approval-tx');
        toast.dismiss('creation-tx');
        
        // Check if it's a user rejection
        const isUserRejection = error.message?.includes('User rejected') || 
                               error.message?.includes('rejected') ||
                               error.message?.includes('cancelled') ||
                               error.message?.includes('denied') ||
                               (error as any)?.name === 'UserRejectedRequestError';
        
        if (isUserRejection) {
          if (lastTxType === 'approval') {
            toast.error('Approval cancelled by user');
            setApproving(false);
          } else if (lastTxType === 'creation') {
            toast.error('Market creation cancelled by user');
          }
        } else {
          // Other errors
          if (error.message?.includes('insufficient funds')) {
            toast.error('Insufficient ETH for gas fees');
          } else if (error.message?.includes('revert') && lastTxType === 'creation') {
            toast.error('Market creation reverted. Please check your parameters.');
          } else {
            const errorMessage = lastTxType === 'approval' ? 'Approval failed' : 'Market creation failed';
            toast.error(`${errorMessage}: ${(error as any)?.shortMessage || error.message || 'Unknown error'}`);
          }
          
          if (lastTxType === 'approval') {
            setApproving(false);
          }
        }
        
        setLastTxType(null);
      }
    }
  });
  const { 
    isLoading: isConfirming, 
    isSuccess: txSuccess, 
    isError: txError,
    error: txReceiptError 
  } = useWaitForTransactionReceipt({ 
    hash,
  });

  const [formData, setFormData] = useState<MarketFormData>(getDefaultFormData());
  const [approving, setApproving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastTxType, setLastTxType] = useState<'approval' | 'creation' | null>(null);

  // Check approvals and balances based on market type
  const factoryAddress = chainId && isSupportedChain(chainId) ? getContractAddress(chainId, 'ParimutuelMarketFactory') : undefined;
  const stHypeAddress = chainId && isSupportedChain(chainId) ? getContractAddress(chainId, 'StHYPE') : undefined;
  const usdcAddress = chainId && isSupportedChain(chainId) ? getContractAddress(chainId, 'StakeToken') : undefined; // StakeToken is USDC
  
  // stHYPE allowance and balance (for Parimutuel markets - 1000 stHYPE required)
  const { data: stHypeAllowance, isLoading: stHypeAllowanceLoading, refetch: refetchStHypeAllowance } = useReadContract({
    address: stHypeAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && factoryAddress ? [address as `0x${string}`, factoryAddress] : undefined,
    query: {
      enabled: Boolean(address && factoryAddress && stHypeAddress && isConnected),
      refetchInterval: isConnected ? 5000 : false,
    },
  });

  const { data: stHypeBalance, isLoading: stHypeBalanceLoading, refetch: refetchStHypeBalance } = useReadContract({
    address: stHypeAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: Boolean(address && stHypeAddress && isConnected),
      refetchInterval: isConnected ? 10000 : false,
    },
  });

  // USDC allowance and balance (for CPMM markets - liquidity requirement)
  const { data: usdcAllowance, isLoading: usdcAllowanceLoading, refetch: refetchUsdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && factoryAddress ? [address as `0x${string}`, factoryAddress] : undefined,
    query: {
      enabled: Boolean(address && factoryAddress && usdcAddress && isConnected),
      refetchInterval: isConnected ? 5000 : false,
    },
  });

  const { data: usdcBalance, isLoading: usdcBalanceLoading, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: Boolean(address && usdcAddress && isConnected),
      refetchInterval: isConnected ? 10000 : false,
    },
  });

  // Determine what token and amounts are needed based on market type
  const isLoadingAny = stHypeAllowanceLoading || stHypeBalanceLoading || usdcAllowanceLoading || usdcBalanceLoading;
  
  // For Parimutuel markets: Need 1000 stHYPE approval and balance
  const needsStHypeApproval = isConnected && 
    stHypeAllowance !== undefined && 
    stHypeAllowance < parseEther('1000');
  
  const hasStHypeBalance = stHypeBalance !== undefined && stHypeBalance >= parseEther('1000');
  
  // For CPMM markets: Need USDC approval and balance for liquidity amount
  const requiredUSDC = parseUnits(formData.initialLiquidity || '1000', 6);
  const needsUSDCApproval = isConnected && 
    formData.marketType === MarketType.CPMM &&
    usdcAllowance !== undefined && 
    usdcAllowance < requiredUSDC;
  
  const hasUSDCBalance = usdcBalance !== undefined && usdcBalance >= requiredUSDC;
  
  // Overall approval and balance checks
  const needsApproval = formData.marketType === MarketType.CPMM ? needsUSDCApproval : needsStHypeApproval;
  const hasRequiredBalance = formData.marketType === MarketType.CPMM ? hasUSDCBalance : hasStHypeBalance;

  // Reset state when wallet changes
  useEffect(() => {
    setApproving(false);
    setLastTxType(null);
    setCurrentStep(isConnected ? 1 : 0);
  }, [address, chainId, isConnected]);

  // Auto-update window times when cutoff time changes
  useEffect(() => {
    if (formData.cutoffTime && !showAdvanced) {
      const { tStart, tEnd } = getAutoWindowTimes(formData.cutoffTime, formData.windowKind);
      setFormData(prev => ({
        ...prev,
        tStart,
        tEnd,
      }));
    }
  }, [formData.cutoffTime, formData.windowKind, showAdvanced]);

  // Update step based on transaction state
  useEffect(() => {
    if (!isConnected) {
      setCurrentStep(0);
    } else if (needsApproval && !isLoadingAny) {
      setCurrentStep(1);
    } else if (!needsApproval && !isLoadingAny) {
      setCurrentStep(2);
    }
  }, [isConnected, needsApproval, isLoadingAny]);

  // Handle transaction confirmation
  useEffect(() => {
    if (txSuccess && hash) {
      // Dismiss loading toasts
      toast.dismiss('approval-tx');
      toast.dismiss('creation-tx');
      
      if (lastTxType === 'approval') {
        toast.success('✅ Approval confirmed! You can now create your market.');
        // Force refetch the correct allowance
        setTimeout(() => {
          if (formData.marketType === MarketType.CPMM) {
            refetchUsdcAllowance();
          } else {
            refetchStHypeAllowance();
          }
        }, 1000);
      } else if (lastTxType === 'creation') {
        toast.success('🎉 Market created successfully! Your market is now live.');
        // Reset form after successful creation
        setFormData(getDefaultFormData());
      }
      
      // Clear transaction state
      setLastTxType(null);
      refetchStHypeBalance();
      refetchUsdcBalance();
    }
  }, [txSuccess, hash, lastTxType, formData.marketType, refetchUsdcAllowance, refetchStHypeAllowance, refetchStHypeBalance, refetchUsdcBalance]);

  // Handle transaction receipt errors (only for confirmation failures, not user rejections)
  useEffect(() => {
    if (txError && txReceiptError) {
      console.error('Transaction receipt error:', txReceiptError);
      // Only show receipt errors if the transaction was actually submitted
      // User rejections are handled in the writeContract onError callback
      if (!error) {
        toast.dismiss('approval-tx');
        toast.dismiss('creation-tx');
        toast.error(`Transaction failed: ${txReceiptError.message || 'Unknown error'}`);
        
        if (lastTxType === 'approval') {
          setApproving(false);
        }
        setLastTxType(null);
      }
    }
  }, [txError, txReceiptError, error, lastTxType]);

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
      setLastTxType('approval');
      const factoryAddress = getContractAddress(chainId, 'ParimutuelMarketFactory');
      
      if (formData.marketType === MarketType.CPMM) {
        // CPMM markets need USDC approval for liquidity
        const usdcAddress = getContractAddress(chainId, 'StakeToken'); // StakeToken is USDC
        const requiredAmount = parseUnits(formData.initialLiquidity || '1000', 6);
        
        writeContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [factoryAddress, requiredAmount],
        });
        
        toast.loading(`Approving ${formData.initialLiquidity || '1000'} USDC for market creation...`, {
          id: 'approval-tx',
          duration: 30000,
        });
      } else {
        // Parimutuel markets need stHYPE approval
        const stHypeAddress = getContractAddress(chainId, 'StHYPE');
        
        writeContract({
          address: stHypeAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [factoryAddress, parseEther('1000')], // 1000 stHYPE
        });
        
        toast.loading('Approving 1000 stHYPE for market creation...', {
          id: 'approval-tx',
          duration: 30000,
        });
      }
      
    } catch (error: any) {
      // Error handling is now done in the onError callback above
      console.error('Approval catch block:', error);
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

    if (needsApproval) {
      toast.error('Please approve stHYPE spending first');
      return;
    }

    // Check balance based on market type
    if (!hasRequiredBalance) {
      if (formData.marketType === MarketType.CPMM) {
        const required = formData.initialLiquidity || '1000';
        toast.error(`Insufficient USDC balance. You need at least $${required} USDC for initial liquidity.`);
      } else {
        toast.error('Insufficient stHYPE balance. You need at least 1,000 stHYPE to create a market.');
      }
      return;
    }

    // Enhanced validation with better messages
    const validationErrors = validateForm(formData);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    try {
      setLastTxType('creation');
      const cutoffTimestamp = Math.floor(new Date(formData.cutoffTime).getTime() / 1000);
      const tStart = Math.floor(new Date(formData.tStart).getTime() / 1000);
      const tEnd = Math.floor(new Date(formData.tEnd).getTime() / 1000);

      const factoryAddress = getContractAddress(chainId, 'ParimutuelMarketFactory');
      const stakeTokenAddress = getContractAddress(chainId, 'StakeToken');
      
      // Ensure all required fields have valid values with proper fallbacks
      const metricId = formData.metricId || 'BTC_PRICE';
      const primarySourceId = formData.primarySourceId || 'HYPERLIQUID';
      const fallbackSourceId = formData.fallbackSourceId || 'COINBASE';
      const tokenIdentifier = formData.token || 'BTC'; // Use token symbol as string identifier
      const threshold = formData.threshold || '100000';
      const maxTotalPool = formData.maxTotalPool || '10000';
      const title = formData.title?.trim() || 'Market Question';
      const description = formData.description?.trim() || 'Market Description';
      
      // Ensure timing values are valid
      const validCutoffTime = cutoffTimestamp > 0 ? cutoffTimestamp : Math.floor(Date.now() / 1000) + 3600;
      const validTStart = tStart > validCutoffTime ? tStart : validCutoffTime + 3600;
      const validTEnd = tEnd > validTStart ? tEnd : validTStart + 3600;
      
      console.log('Market creation params:', {
        title,
        description,
        tokenIdentifier,
        metricId,
        primarySourceId, 
        fallbackSourceId,
        threshold,
        maxTotalPool
      });
      
      // Debug ABI functions
      console.log('Available functions in ABI:', PARIMUTUEL_MARKET_FACTORY_ABI
        .filter((item: any) => item.type === 'function')
        .map((item: any) => `${item.name}(${item.inputs.length} params)`)
      );

      const marketParams = {
        title: title,
        description: description,
        subject: {
          kind: formData.subjectKind || 0, // Default to TOKEN_PRICE
          metricId: stringToHex(metricId, { size: 32 }),
          tokenIdentifier: tokenIdentifier,
          valueDecimals: formData.valueDecimals || 8,
        },
        predicate: {
          op: formData.predicateOp || 0, // Default to GREATER_THAN
          threshold: BigInt(Math.floor(parseFloat(threshold) * Math.pow(10, formData.valueDecimals || 8))),
        },
        window: {
          kind: formData.windowKind || 0, // Default to FIXED
          tStart: BigInt(validTStart),
          tEnd: BigInt(validTEnd),
        },
        oracle: {
          primarySourceId: stringToHex(primarySourceId, { size: 32 }),
          fallbackSourceId: stringToHex(fallbackSourceId, { size: 32 }),
          roundingDecimals: formData.roundingDecimals || 2,
        },
        cutoffTime: BigInt(validCutoffTime),
        creator: address as `0x${string}`,
        econ: {
          feeBps: formData.feeBps || 500,
          creatorFeeShareBps: formData.creatorFeeShareBps || 1000,
          maxTotalPool: parseEther(maxTotalPool),
          timeDecayBps: formData.timeDecayBps || 1000,
        },
        isProtocolMarket: false,
      };

      // Determine liquidity amount based on market type
      const liquidityAmount = formData.marketType === MarketType.CPMM 
        ? parseUnits(formData.initialLiquidity || '1000', 6) // USDC has 6 decimals
        : parseEther('0'); // No liquidity needed for Parimutuel

      // Always use the generic createMarket function for now to debug
      const marketTypeValue = formData.marketType === MarketType.CPMM ? 1 : 0;
      console.log('Calling createMarket with args:', {
        marketParams: typeof marketParams,
        marketTypeValue: typeof marketTypeValue, 
        liquidityAmount: typeof liquidityAmount,
        values: [marketParams, marketTypeValue, liquidityAmount]
      });
      
      writeContract({
        address: factoryAddress,
        abi: PARIMUTUEL_MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [marketParams, marketTypeValue, liquidityAmount],
      });
      
      toast.loading('🚀 Creating your market... Please wait for confirmation.', {
        id: 'creation-tx',
        duration: 60000, // 60 second timeout for market creation
      });
      
    } catch (error: any) {
      // Error handling is now done in the onError callback above
      console.error('Market creation catch block:', error);
    }
  };

  // Enhanced validation function
  const validateForm = (data: MarketFormData): string[] => {
    const errors: string[] = [];
    
    if (!data.title.trim()) errors.push('Please enter a market title');
    if (!data.description.trim()) errors.push('Please enter a market description');
    if (!data.threshold) errors.push('Please enter a threshold value');
    
    if (data.subjectKind === SubjectKind.HL_METRIC && !data.metricId) {
      errors.push('Please select a metric for HyperLiquid data');
    }
    
    if (data.subjectKind === SubjectKind.TOKEN_PRICE && !data.token) {
      errors.push('Please select a token for price data');
    }

    // CPMM-specific validations
    if (data.marketType === MarketType.CPMM) {
      if (!data.initialLiquidity || parseFloat(data.initialLiquidity) < 1000) {
        errors.push('Initial liquidity must be at least $1,000 USDC for CPMM markets (contract requirement)');
      }
      
      if (data.initialProbability < 1 || data.initialProbability > 99) {
        errors.push('Initial probability must be between 1% and 99%');
      }
      
      // Check if user has enough USDC balance for CPMM liquidity
      if (usdcBalance && data.initialLiquidity) {
        const requiredAmount = parseUnits(data.initialLiquidity, 6);
        if (usdcBalance < requiredAmount) {
          const currentBalance = parseFloat((Number(usdcBalance) / 1e6).toFixed(2));
          errors.push(`Insufficient USDC balance. You have $${currentBalance} but need $${data.initialLiquidity} USDC for initial liquidity`);
        }
      }
    }

    // Timing validation
    const now = Math.floor(Date.now() / 1000);
    const cutoffTimestamp = Math.floor(new Date(data.cutoffTime).getTime() / 1000);
    const tStart = Math.floor(new Date(data.tStart).getTime() / 1000);
    const tEnd = Math.floor(new Date(data.tEnd).getTime() / 1000);
    
    if (cutoffTimestamp <= now + 300) { // At least 5 minutes in future
      errors.push('Trading cutoff must be at least 5 minutes in the future');
    }
    
    if (tStart <= cutoffTimestamp) {
      errors.push('Measurement window must start after trading cutoff');
    }
    
    if (data.windowKind !== WindowKind.SNAPSHOT_AT && tEnd <= tStart) {
      errors.push('Window end time must be after start time');
    }
    
    return errors;
  };

  const handleChange = (field: keyof MarketFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Progress calculation
  const getProgress = () => {
    if (!isConnected) return 0;
    if (isLoadingAny) return 25; // Loading balance/allowance data
    if (needsApproval) return 33; // Need approval
    if (isPending || isConfirming) return 66; // Transaction in progress
    return 100; // Ready to create
  };


  const renderWalletRequired = () => (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Prediction Market</CardTitle>
          <CardDescription className="text-lg">
            Connect your wallet to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-6">
            You need to connect your wallet to create markets
          </div>
          <div className="text-sm text-muted-foreground">
            After connecting, you'll be able to create custom prediction markets with automatic oracle integration
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show wallet required if not connected
  if (!isConnected) {
    return renderWalletRequired();
  }

  // Show network switcher if on unsupported network
  if (!isSupportedChain(chainId)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Network Not Supported</CardTitle>
            <CardDescription className="text-lg">
              Please switch to a supported network to create markets
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6">
            <NetworkSwitcher />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Create Prediction Market</CardTitle>
                <CardDescription>
                  Create a new prediction market with smart defaults and customizable parameters
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                Step {currentStep} of 2
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={getProgress()} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Connect Wallet</span>
                <span>Approve Token</span>
                <span>Create Market</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Market Details</CardTitle>
              <CardDescription>
                Define what your market will predict and when trading ends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Market Question</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Will Bitcoin reach $100,000 by end of 2024?"
                  className="text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Provide context and resolution criteria for your market..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cutoffTime" className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    Trading Cutoff
                  </Label>
                  <Input
                    id="cutoffTime"
                    type="datetime-local"
                    value={formData.cutoffTime}
                    onChange={(e) => handleChange('cutoffTime', e.target.value)}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    When trading stops. Measurement starts 1 hour later automatically.
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Auto-calculated Timeline</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <div className="space-y-1">
                      <div>• Trading stops: {new Date(formData.cutoffTime).toLocaleString()}</div>
                      <div>• Measurement: {new Date(formData.tStart).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Market Type</CardTitle>
              <CardDescription>
                Choose how your market will operate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MARKET_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      formData.marketType === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleChange('marketType', option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`marketType-${option.value}`}
                        name="marketType"
                        value={option.value}
                        checked={formData.marketType === option.value}
                        onChange={() => handleChange('marketType', option.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <Label 
                        htmlFor={`marketType-${option.value}`} 
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* CPMM-specific fields */}
              {formData.marketType === MarketType.CPMM && (
                <div className="mt-6 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                  <h4 className="font-medium mb-4 text-blue-900 dark:text-blue-100">
                    CPMM Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialLiquidity">Initial Liquidity (USDC)</Label>
                      <Input
                        id="initialLiquidity"
                        type="number"
                        min="1000"
                        step="1"
                        value={formData.initialLiquidity}
                        onChange={(e) => handleChange('initialLiquidity', e.target.value)}
                        placeholder="1000"
                        required={formData.marketType === MarketType.CPMM}
                      />
                      <div className="text-xs text-muted-foreground">
                        Minimum: $1,000 USDC (contract requirement). You'll provide this liquidity to start the market.
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="initialProbability">Initial Probability (%)</Label>
                      <Input
                        id="initialProbability"
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={formData.initialProbability}
                        onChange={(e) => handleChange('initialProbability', parseInt(e.target.value) || 50)}
                        placeholder="50"
                        required={formData.marketType === MarketType.CPMM}
                      />
                      <div className="text-xs text-muted-foreground">
                        Starting probability for YES outcome (1-99%).
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prediction Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Prediction Logic</CardTitle>
              <CardDescription>
                Configure what data source and condition will resolve your market
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Required Basic Setup */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectKind">Data Source</Label>
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
                    <Label htmlFor="threshold">Target Value</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="any"
                      value={formData.threshold}
                      onChange={(e) => handleChange('threshold', e.target.value)}
                      placeholder="100000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings (Collapsible) */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full justify-between p-3 h-auto border border-dashed"
                >
                  <div className="flex items-center gap-2">
                    <CogIcon className="h-4 w-4" />
                    <span>Advanced Settings</span>
                    <Badge variant="outline" className="text-xs">
                      Optional
                    </Badge>
                  </div>
                  {showAdvanced ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Button>

                {showAdvanced && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="windowKind">Measurement Type</Label>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tStart">Measurement Start</Label>
                          <Input
                            id="tStart"
                            type="datetime-local"
                            value={formData.tStart}
                            onChange={(e) => handleChange('tStart', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="tEnd">Measurement End</Label>
                          <Input
                            id="tEnd"
                            type="datetime-local"
                            value={formData.tEnd}
                            onChange={(e) => handleChange('tEnd', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                        <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                          ⚠️ Advanced Configuration
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-300">
                          Modifying these settings requires understanding of oracle behavior. Default automatic timing is recommended for most users.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Deploy Market</CardTitle>
              <CardDescription>
                Create your market on the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Balance Display - Show relevant balance based on market type */}
              {isConnected && (
                <div className="space-y-3">
                  {formData.marketType === MarketType.CPMM ? (
                    /* USDC Balance for CPMM Markets */
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">USDC Balance:</div>
                        {usdcBalanceLoading && isConnected ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : usdcBalance !== undefined ? (
                          <div className="text-sm font-mono">
                            ${(Number(usdcBalance) / 1e6).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} USDC
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Unable to load</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Required: ${formData.initialLiquidity || '1,000'} USDC
                      </div>
                    </div>
                  ) : (
                    /* stHYPE Balance for Parimutuel Markets */
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">stHYPE Balance:</div>
                        {stHypeBalanceLoading && isConnected ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : stHypeBalance !== undefined ? (
                          <div className="text-sm font-mono">
                            {parseFloat(formatEther(stHypeBalance)).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} stHYPE
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Unable to load</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Required: 1,000 stHYPE
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Insufficient Balance Warning - Only show when wallet connected */}
              {isConnected && !hasRequiredBalance && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-red-600">⚠️</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-900 dark:text-red-100">
                          Insufficient {formData.marketType === MarketType.CPMM ? 'USDC' : 'stHYPE'} Balance
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300">
                          {formData.marketType === MarketType.CPMM ? (
                            <>
                              You need at least ${formData.initialLiquidity || '1,000'} USDC for initial liquidity. 
                              Current balance: ${usdcBalance ? (Number(usdcBalance) / 1e6).toLocaleString() : '0'} USDC
                            </>
                          ) : (
                            <>
                              You need at least 1,000 stHYPE to create a market. 
                              Current balance: {stHypeBalance ? parseFloat(formatEther(stHypeBalance)).toLocaleString() : '0'} stHYPE
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Smart Approval Management - Only show when wallet connected */}
              {isConnected && needsApproval && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {formData.marketType === MarketType.CPMM ? 'USDC' : 'stHYPE'} Approval Required
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          {formData.marketType === MarketType.CPMM 
                            ? `Grant permission to spend ${formData.initialLiquidity || '1,000'} USDC for initial liquidity`
                            : 'Grant permission to spend 1,000 stHYPE for market creation'
                          }
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving || isLoadingAny}
                      className="w-full mt-3"
                      variant="outline"
                    >
                      {approving ? 'Approving...' : `Approve ${formData.marketType === MarketType.CPMM ? 'USDC' : 'stHYPE'} Spending`}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isConnected && !needsApproval && !isLoadingAny && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <div className="text-sm font-medium text-green-900 dark:text-green-100">
                        Ready to Create Market
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                type="submit"
                disabled={
                  isPending || 
                  isConfirming || 
                  needsApproval || 
                  !hasRequiredBalance ||
                  isLoadingAny
                }
                className="w-full"
                size="lg"
              >
                {isPending || isConfirming ? (
                  <>Creating Market...</>
                ) : !hasRequiredBalance ? (
                  <>Insufficient {formData.marketType === MarketType.CPMM ? 'USDC' : 'stHYPE'} Balance</>
                ) : (
                  <>🚀 Create Market</>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center mt-4">
                {formData.marketType === MarketType.CPMM 
                  ? `Market creation cost: ${formData.initialLiquidity || '1,000'} USDC liquidity • Oracle: HyperLiquid + Coinbase`
                  : 'Market creation cost: ~1000 stHYPE • Oracle: HyperLiquid + Coinbase'
                }
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}