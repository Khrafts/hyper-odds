'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Fuel, 
  Calculator, 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import { GasFeeDisplay } from '@/components/trading/gasFeeDisplay'
import { useGasEstimation, type GasSpeed } from '@/lib/gas'
import { parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import { getContractAddress } from '@/lib/web3/contracts'
import { useChainId } from 'wagmi'

export default function GasEstimationPage() {
  const [amount, setAmount] = useState('100')
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES')
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>('standard')
  const [mounted, setMounted] = useState(false)
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const {
    estimateApproval,
    estimateDeposit,
    estimateClaim,
    isLoading,
    error,
    clearError,
  } = useGasEstimation()
  
  const [gasEstimates, setGasEstimates] = useState<{
    approval?: any
    deposit?: any
    claim?: any
  }>({})

  // Ensure client-side only
  useEffect(() => {
    setMounted(true)
  }, [])

  // Contract addresses
  const stakeTokenAddress = React.useMemo(() => {
    try {
      return getContractAddress(chainId as any, 'StakeToken')
    } catch {
      return undefined
    }
  }, [chainId])

  const marketAddress = '0x89b371a0a56713C3E660C9eFCe659853c755dDF9' as const

  // Test gas estimation functions
  const testApprovalGas = async () => {
    if (!stakeTokenAddress || !amount) return
    
    try {
      clearError()
      const amountInUSDC = parseUnits(amount, 6)
      const estimates = await estimateApproval(stakeTokenAddress, marketAddress, amountInUSDC)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, approval: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate approval gas:', error)
    }
  }

  const testDepositGas = async () => {
    if (!amount) return
    
    try {
      clearError()
      const outcomeValue = selectedSide === 'YES' ? 1 : 0
      const amountInUSDC = parseUnits(amount, 6)
      const estimates = await estimateDeposit(marketAddress, outcomeValue, amountInUSDC)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, deposit: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate deposit gas:', error)
    }
  }

  const testClaimGas = async () => {
    try {
      clearError()
      const estimates = await estimateClaim(marketAddress)
      if (estimates) {
        setGasEstimates(prev => ({ ...prev, claim: estimates }))
      }
    } catch (error) {
      console.error('Failed to estimate claim gas:', error)
    }
  }

  const testAllGasEstimates = async () => {
    await Promise.all([
      testApprovalGas(),
      testDepositGas(),
      testClaimGas(),
    ])
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gas Estimation Demo</h1>
        <p className="text-muted-foreground">
          Test gas estimation for different transaction types with real contract calls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Gas Estimation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected && (
                <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                  <p className="text-sm">Connect your wallet to test gas estimation</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (USDC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    disabled={!isConnected}
                  />
                </div>
                <div>
                  <Label>Side</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant={selectedSide === 'YES' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSide('YES')}
                      className="flex-1"
                      disabled={!isConnected}
                    >
                      YES
                    </Button>
                    <Button
                      variant={selectedSide === 'NO' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSide('NO')}
                      className="flex-1"
                      disabled={!isConnected}
                    >
                      NO
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={testApprovalGas}
                  disabled={!isConnected || isLoading}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Approval
                </Button>
                
                <Button
                  onClick={testDepositGas}
                  disabled={!isConnected || isLoading}
                  size="sm"
                  variant="outline"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Test Deposit
                </Button>
                
                <Button
                  onClick={testClaimGas}
                  disabled={!isConnected || isLoading}
                  size="sm"
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Test Claim
                </Button>
                
                <Button
                  onClick={testAllGasEstimates}
                  disabled={!isConnected || isLoading}
                  size="sm"
                  variant="default"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Test All
                </Button>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chain ID:</span>
                <span className="font-mono">{chainId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market:</span>
                <span className="font-mono">{marketAddress.slice(0, 8)}...{marketAddress.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">USDC Token:</span>
                <span className="font-mono">
                  {stakeTokenAddress ? `${stakeTokenAddress.slice(0, 8)}...${stakeTokenAddress.slice(-6)}` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected:</span>
                <Badge variant={isConnected ? 'default' : 'outline'}>
                  {isConnected ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gas Estimation Results */}
        <div className="space-y-6">
          {/* Approval Gas */}
          <GasFeeDisplay
            gasEstimates={gasEstimates.approval}
            selectedSpeed={gasSpeed}
            onSpeedChange={setGasSpeed}
            isLoading={isLoading}
            error={error}
            onRefresh={testApprovalGas}
            transactionType="approval"
          />

          {/* Deposit Gas */}
          <GasFeeDisplay
            gasEstimates={gasEstimates.deposit}
            selectedSpeed={gasSpeed}
            onSpeedChange={setGasSpeed}
            isLoading={isLoading}
            error={error}
            onRefresh={testDepositGas}
            transactionType="deposit"
          />

          {/* Claim Gas */}
          <GasFeeDisplay
            gasEstimates={gasEstimates.claim}
            selectedSpeed={gasSpeed}
            onSpeedChange={setGasSpeed}
            isLoading={isLoading}
            error={error}
            onRefresh={testClaimGas}
            transactionType="claim"
          />
        </div>
      </div>

      {/* Summary Statistics */}
      {(gasEstimates.approval || gasEstimates.deposit || gasEstimates.claim) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Gas Estimation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gasEstimates.approval && (
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {gasEstimates.approval[gasSpeed]?.totalCostFormatted || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Approval Cost</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Gas: {gasEstimates.approval[gasSpeed]?.gasLimit.toLocaleString() || 'N/A'}
                  </div>
                </div>
              )}
              
              {gasEstimates.deposit && (
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {gasEstimates.deposit[gasSpeed]?.totalCostFormatted || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Deposit Cost</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Gas: {gasEstimates.deposit[gasSpeed]?.gasLimit.toLocaleString() || 'N/A'}
                  </div>
                </div>
              )}
              
              {gasEstimates.claim && (
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {gasEstimates.claim[gasSpeed]?.totalCostFormatted || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Claim Cost</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Gas: {gasEstimates.claim[gasSpeed]?.gasLimit.toLocaleString() || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}