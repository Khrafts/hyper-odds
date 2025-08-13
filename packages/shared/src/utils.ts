import { ethers } from 'ethers';

// Convert between basis points and percentages
export const bpsToPercent = (bps: number): number => bps / 100;
export const percentToBps = (percent: number): number => Math.round(percent * 100);

// Format token amounts for display
export const formatTokenAmount = (
  amount: bigint,
  decimals: number,
  displayDecimals: number = 2
): string => {
  const divisor = 10n ** BigInt(decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;
  
  const decimal = Number(remainder * 10n ** BigInt(displayDecimals) / divisor) / (10 ** displayDecimals);
  return (Number(quotient) + decimal).toFixed(displayDecimals);
};

// Parse token amount from string
export const parseTokenAmount = (amount: string, decimals: number): bigint => {
  return ethers.parseUnits(amount, decimals);
};

// Calculate payout for a winner
export const calculatePayout = (
  userStake: bigint,
  winningPool: bigint,
  losingPool: bigint,
  feeBps: number
): bigint => {
  if (winningPool === 0n) return 0n;
  
  const fee = (losingPool * BigInt(feeBps)) / 10000n;
  const availableWinnings = losingPool - fee;
  const winnings = (availableWinnings * userStake) / winningPool;
  
  return userStake + winnings;
};

// Generate market ID from parameters
export const generateMarketId = (
  creator: string,
  resolveTime: number,
  subject: string
): string => {
  return ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'uint64', 'bytes32'],
      [creator, resolveTime, subject]
    )
  );
};

// Format timestamp for display
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

// Check if market is active for deposits
export const isMarketActive = (cutoffTime: number): boolean => {
  return Date.now() / 1000 < cutoffTime;
};

// Check if market can be resolved
export const canResolveMarket = (resolveTime: number): boolean => {
  return Date.now() / 1000 >= resolveTime;
};

// Calculate time remaining
export const getTimeRemaining = (targetTime: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, targetTime - now);
  
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60
  };
};