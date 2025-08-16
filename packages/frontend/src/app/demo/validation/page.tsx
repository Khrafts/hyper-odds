'use client'

import React, { useState } from 'react'
import { PageErrorBoundary } from '@/components/error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { 
  validateTradingAmount, 
  validateMarketState, 
  tradingFormSchema,
  shareCalculationSchema,
  TradingSide,
  type TradingFormData 
} from '@/lib/validations/trading'
import { parseEther } from 'viem'

export default function ValidationTestPage() {
  const [testAmount, setTestAmount] = useState('')
  const [testBalance, setTestBalance] = useState('1')
  const [testSide, setTestSide] = useState<'YES' | 'NO'>('YES')
  const [testSlippage, setTestSlippage] = useState(1)
  const [results, setResults] = useState<any[]>([])

  // Test market scenarios
  const testMarkets = [
    {
      name: 'Active Market',
      market: {
        resolved: false,
        cutoffTime: String(Math.floor(Date.now() / 1000) + 86400), // +1 day
        poolYes: '100000',
        poolNo: '50000'
      }
    },
    {
      name: 'Resolved Market',
      market: {
        resolved: true,
        cutoffTime: String(Math.floor(Date.now() / 1000) - 86400), // -1 day
        poolYes: '100000',
        poolNo: '50000'
      }
    },
    {
      name: 'Expired Market',
      market: {
        resolved: false,
        cutoffTime: String(Math.floor(Date.now() / 1000) - 3600), // -1 hour
        poolYes: '100000',
        poolNo: '50000'
      }
    },
    {
      name: 'No Liquidity',
      market: {
        resolved: false,
        cutoffTime: String(Math.floor(Date.now() / 1000) + 86400),
        poolYes: '0',
        poolNo: '0'
      }
    }
  ]

  const runValidationTest = () => {
    const newResults: any[] = []

    // Test amount validation
    const testAmounts = ['', '0', '-1', '0.5', '1', '100', '50000', '1000001', 'abc', '1.1234567']
    
    testAmounts.forEach(amount => {
      const result = validateTradingAmount(
        amount,
        testBalance ? BigInt(Math.floor(parseFloat(testBalance) * 1e6)) : undefined // USDC has 6 decimals
      )
      
      newResults.push({
        test: `Amount: "${amount}"`,
        type: 'Amount Validation',
        result: result.isValid ? 'PASS' : 'FAIL',
        message: result.error || 'Valid amount',
        details: { amount, balance: testBalance }
      })
    })

    // Test market state validation
    testMarkets.forEach(({ name, market }) => {
      const result = validateMarketState(market)
      
      newResults.push({
        test: `Market: ${name}`,
        type: 'Market Validation',
        result: result.canTrade ? 'PASS' : 'FAIL',
        message: result.reason || 'Market can trade',
        details: market
      })
    })

    // Test form schema validation
    const testForms: TradingFormData[] = [
      { side: 'YES', amount: '1', slippage: 1 },
      { side: 'NO', amount: '0.5', slippage: 2.5 },
      { side: 'YES', amount: '', slippage: 1 }, // Invalid: empty amount
      { side: 'YES', amount: '-1', slippage: 1 }, // Invalid: negative amount
      { side: 'YES', amount: '1', slippage: 51 }, // Invalid: high slippage
      { side: 'YES', amount: '1', slippage: 0 }, // Invalid: zero slippage
    ]

    testForms.forEach((form, index) => {
      const result = tradingFormSchema.safeParse(form)
      
      newResults.push({
        test: `Form ${index + 1}: ${form.side} ${form.amount} ETH (${form.slippage}% slippage)`,
        type: 'Form Schema',
        result: result.success ? 'PASS' : 'FAIL',
        message: result.success ? 'Valid form data' : result.error.errors[0]?.message || 'Invalid',
        details: form
      })
    })

    // Test share calculations
    const shareTests = [
      { depositAmount: 100, poolYes: 1000, poolNo: 500, side: 'YES' as TradingSide },
      { depositAmount: 50, poolYes: 750, poolNo: 250, side: 'NO' as TradingSide },
      { depositAmount: 1000, poolYes: 500, poolNo: 500, side: 'YES' as TradingSide },
    ]

    shareTests.forEach((test, index) => {
      const result = shareCalculationSchema.safeParse(test)
      
      newResults.push({
        test: `Share Calc ${index + 1}: ${test.depositAmount} → ${test.side}`,
        type: 'Share Calculation',
        result: result.success ? 'PASS' : 'FAIL',
        message: result.success 
          ? `${result.data.shares.toFixed(4)} shares, ${result.data.newProbability.toFixed(1)}% prob`
          : result.error.errors[0]?.message || 'Calculation failed',
        details: result.success ? result.data : test
      })
    })

    setResults(newResults)
  }

  const passCount = results.filter(r => r.result === 'PASS').length
  const failCount = results.filter(r => r.result === 'FAIL').length

  return (
    <PageErrorBoundary pageName="Validation Test">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/demo">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Demo
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Validation Testing</h1>
          <p className="text-muted-foreground">
            Test the trading validation schemas with different inputs and scenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-amount">Test Amount (ETH)</Label>
                  <Input
                    id="test-amount"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="Enter amount to test"
                  />
                </div>
                
                <div>
                  <Label htmlFor="test-balance">Mock Balance (USDC)</Label>
                  <Input
                    id="test-balance"
                    value={testBalance}
                    onChange={(e) => setTestBalance(e.target.value)}
                    placeholder="Mock wallet balance"
                  />
                </div>

                <div>
                  <Label>Trading Side</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={testSide === 'YES' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestSide('YES')}
                    >
                      YES
                    </Button>
                    <Button
                      variant={testSide === 'NO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestSide('NO')}
                    >
                      NO
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="test-slippage">Slippage (%)</Label>
                  <Input
                    id="test-slippage"
                    type="number"
                    value={testSlippage}
                    onChange={(e) => setTestSlippage(parseFloat(e.target.value))}
                    min="0.01"
                    max="50"
                    step="0.1"
                  />
                </div>

                <Button onClick={runValidationTest} className="w-full">
                  Run All Tests
                </Button>
              </CardContent>
            </Card>

            {/* Quick Tests */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Individual Tests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const result = validateTradingAmount(testAmount, testBalance ? parseEther(testBalance) : undefined)
                    setResults([{
                      test: `Amount: "${testAmount}"`,
                      type: 'Individual Test',
                      result: result.isValid ? 'PASS' : 'FAIL',
                      message: result.error || 'Valid amount',
                      details: { amount: testAmount, balance: testBalance }
                    }])
                  }}
                >
                  Test Amount Only
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const form: TradingFormData = {
                      side: testSide,
                      amount: testAmount,
                      slippage: testSlippage
                    }
                    const result = tradingFormSchema.safeParse(form)
                    setResults([{
                      test: 'Current Form Data',
                      type: 'Individual Test',
                      result: result.success ? 'PASS' : 'FAIL',
                      message: result.success ? 'Valid form' : result.error.errors[0]?.message || 'Invalid',
                      details: form
                    }])
                  }}
                >
                  Test Form Schema
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Test Results</span>
                  {results.length > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {passCount} Pass
                      </Badge>
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {failCount} Fail
                      </Badge>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No tests run yet. Click "Run All Tests" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {result.type}
                              </Badge>
                              <Badge 
                                variant={result.result === 'PASS' ? 'default' : 'destructive'}
                                className={result.result === 'PASS' ? 'bg-green-500' : ''}
                              >
                                {result.result === 'PASS' ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {result.result}
                              </Badge>
                            </div>
                            <p className="font-medium">{result.test}</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.message}
                        </p>
                        
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  )
}