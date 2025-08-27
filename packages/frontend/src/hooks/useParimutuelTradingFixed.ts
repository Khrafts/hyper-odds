/**
 * Fixed Parimutuel trading hook with proper wallet connection
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useAccount, useConnect } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import React, { useState, useCallback, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  ERC20_ABI,
  UNIVERSAL_MARKET_ROUTER_ABI,
  getContractAddress,
  type Outcome 
} from '@/lib/web3/contracts'

export function useParimutuelTradingFixed(marketAddress: Address) {
  const chainId = useChainId()
  const { user, authenticated } = usePrivy()
  const wagmiAccount = useAccount()
  const { connect, connectors } = useConnect()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingApproval, setIsWaitingApproval] = useState(false)
  const [lastSuccessHash, setLastSuccessHash] = useState<`0x${string}` | undefined>()
  const [transactionType, setTransactionType] = useState<'approval' | 'deposit' | null>(null)

  // Contract addresses
  const routerAddress = getContractAddress(chainId, 'UniversalRouter')
  const stakeTokenAddress = getContractAddress(chainId, 'StakeToken')
  
  const userAddress = user?.wallet?.address as Address | undefined

  // Ensure wagmi is connected when Privy is authenticated
  useEffect(() => {
    if (authenticated && userAddress && !wagmiAccount.isConnected) {
      console.log('Privy authenticated but wagmi not connected, attempting to connect...')
      // Try to connect using injected connector
      const injectedConnector = connectors.find(c => c.type === 'injected')
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      }
    }
  }, [authenticated, userAddress, wagmiAccount.isConnected, connect, connectors])

  // Wagmi hooks
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isReceiptError, 
    error: receiptError 
  } = useWaitForTransactionReceipt({ hash })

  // Check USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && wagmiAccount.isConnected ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: !!userAddress && wagmiAccount.isConnected,
    },
  })

  // Check USDC balance
  const { data: balance } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress && wagmiAccount.isConnected ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && wagmiAccount.isConnected,
    },
  })

  // Main deposit function
  const deposit = useCallback(async (outcome: Outcome, amount: string) => {
    console.log('=== Fixed Parimutuel Deposit ===')
    console.log('Authenticated:', authenticated)
    console.log('User address:', userAddress)
    console.log('Wagmi connected:', wagmiAccount.isConnected)
    console.log('Wagmi address:', wagmiAccount.address)
    
    if (!authenticated || !userAddress) {
      throw new Error('Not authenticated')
    }

    if (!wagmiAccount.isConnected) {
      throw new Error('Wallet not connected to wagmi - please refresh and try again')
    }

    if (wagmiAccount.address !== userAddress) {
      throw new Error('Address mismatch between Privy and wagmi')
    }

    setIsLoading(true)
    setError(null)

    try {
      const amountBigInt = parseUnits(amount, 6)
      
      // Check balance
      if (balance && balance < amountBigInt) {
        throw new Error(`Insufficient balance. You have ${formatUnits(balance, 6)} USDC but need ${amount} USDC`)
      }

      // Check approval
      if (!allowance || allowance < amountBigInt) {
        console.log('Approval needed...')
        setTransactionType('approval')
        setIsWaitingApproval(true)

        await writeContract({
          address: stakeTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, amountBigInt * 2n], // Approve 2x for future transactions
        })

        return { needsApproval: true }
      }

      // Proceed with deposit
      console.log('Proceeding with deposit...')
      setTransactionType('deposit')
      
      await writeContract({
        address: routerAddress,
        abi: UNIVERSAL_MARKET_ROUTER_ABI,
        functionName: 'depositToMarket',
        args: [marketAddress, outcome as number, amountBigInt],
      })

    } catch (err) {
      console.error('Deposit failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    authenticated,
    userAddress,
    wagmiAccount,
    balance,
    allowance,
    writeContract,
    stakeTokenAddress,
    routerAddress,
    marketAddress
  ])

  // Handle successful transactions
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('Transaction successful:', hash)
      setLastSuccessHash(hash)
      setIsWaitingApproval(false)
      setIsLoading(false)
      
      // Refetch allowance after approval
      if (transactionType === 'approval') {
        setTimeout(() => refetchAllowance(), 2000)
      }
    }
  }, [isSuccess, hash, transactionType, refetchAllowance])

  // Handle errors
  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError)
      setError(writeError.message)
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
    if (isReceiptError && receiptError) {
      console.error('Receipt error:', receiptError)
      setError(receiptError.message)
      setIsWaitingApproval(false)
      setIsLoading(false)
    }
  }, [writeError, isReceiptError, receiptError])

  // Convenience functions
  const depositYes = useCallback((amount: string) => deposit(1, amount), [deposit])
  const depositNo = useCallback((amount: string) => deposit(0, amount), [deposit])

  return {
    // State
    allowance,
    balance,
    lastSuccessHash,
    
    // Loading states
    isLoading: isLoading || isPending || isConfirming,
    isWaitingApproval,
    
    // Connection state
    isConnected: authenticated && wagmiAccount.isConnected,
    
    // Error state
    error,
    
    // Actions
    deposit,
    depositYes,
    depositNo,
    
    // Helpers
    canTrade: authenticated && wagmiAccount.isConnected && !!userAddress,
  }
}