import { ethers } from 'ethers';
import { logger } from '../config/logger';
import { config } from '../config/config';
import EventEmitter from 'events';

export interface PendingTransaction {
  hash: string;
  marketAddress: string;
  type: 'commit' | 'finalize';
  submittedAt: Date;
  attempts: number;
  maxAttempts: number;
  gasPrice: string;
  gasLimit: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  status: 'success' | 'failed';
  confirmedAt: Date;
}

export interface TransactionTimeout {
  hash: string;
  marketAddress: string;
  type: 'commit' | 'finalize';
  submittedAt: Date;
  timeoutAt: Date;
}

export class TransactionMonitorService extends EventEmitter {
  private provider: ethers.JsonRpcProvider;
  private pendingTransactions = new Map<string, PendingTransaction>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private timeoutCheckInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 10000; // 10 seconds
  private readonly TIMEOUT_CHECK_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    super();
    this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
  }

  /**
   * Start monitoring service
   */
  start(): void {
    logger.info('Starting transaction monitoring service...');

    // Monitor pending transactions
    this.monitoringInterval = setInterval(() => {
      this.monitorPendingTransactions().catch(error => {
        logger.error('Error monitoring transactions:', {
          error: error instanceof Error ? error.message : error,
        });
      });
    }, this.MONITORING_INTERVAL_MS);

    // Check for timeouts
    this.timeoutCheckInterval = setInterval(() => {
      this.checkForTimeouts().catch(error => {
        logger.error('Error checking transaction timeouts:', {
          error: error instanceof Error ? error.message : error,
        });
      });
    }, this.TIMEOUT_CHECK_INTERVAL_MS);

    logger.info('Transaction monitoring service started');
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    logger.info('Stopping transaction monitoring service...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }

    this.pendingTransactions.clear();
    logger.info('Transaction monitoring service stopped');
  }

  /**
   * Add a transaction to monitoring
   */
  addTransaction(transaction: Omit<PendingTransaction, 'attempts'>): void {
    const pendingTx: PendingTransaction = {
      ...transaction,
      attempts: 1,
    };

    this.pendingTransactions.set(transaction.hash, pendingTx);

    logger.info('Added transaction to monitoring', {
      hash: transaction.hash,
      marketAddress: transaction.marketAddress,
      type: transaction.type,
    });
  }

  /**
   * Remove a transaction from monitoring
   */
  removeTransaction(hash: string): void {
    const removed = this.pendingTransactions.delete(hash);
    
    if (removed) {
      logger.debug('Removed transaction from monitoring', { hash });
    }
  }

  /**
   * Get all pending transactions
   */
  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Get pending transactions for a specific market
   */
  getPendingTransactionsForMarket(marketAddress: string): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.marketAddress.toLowerCase() === marketAddress.toLowerCase());
  }

  /**
   * Check if market has pending transactions
   */
  hasPendingTransactions(marketAddress: string): boolean {
    return this.getPendingTransactionsForMarket(marketAddress).length > 0;
  }

  /**
   * Monitor all pending transactions
   */
  private async monitorPendingTransactions(): Promise<void> {
    if (this.pendingTransactions.size === 0) {
      return;
    }

    logger.debug('Monitoring pending transactions', {
      count: this.pendingTransactions.size,
    });

    const promises = Array.from(this.pendingTransactions.values()).map(tx =>
      this.checkTransactionStatus(tx)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check status of a specific transaction
   */
  private async checkTransactionStatus(transaction: PendingTransaction): Promise<void> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transaction.hash);

      if (receipt) {
        // Transaction confirmed
        const result: TransactionResult = {
          hash: transaction.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: (receipt as any).effectiveGasPrice?.toString() || transaction.gasPrice,
          status: receipt.status === 1 ? 'success' : 'failed',
          confirmedAt: new Date(),
        };

        logger.info('Transaction confirmed', {
          hash: transaction.hash,
          marketAddress: transaction.marketAddress,
          type: transaction.type,
          status: result.status,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
        });

        // Remove from pending and emit event
        this.removeTransaction(transaction.hash);
        this.emit('transactionConfirmed', transaction, result);

        if (result.status === 'failed') {
          this.emit('transactionFailed', transaction, result);
        } else {
          this.emit('transactionSuccess', transaction, result);
        }
      }

    } catch (error) {
      // Transaction might still be pending or dropped
      logger.debug('Transaction status check error', {
        hash: transaction.hash,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Check for timed out transactions
   */
  private async checkForTimeouts(): Promise<void> {
    const now = new Date();
    const timeoutMs = config.TRANSACTION_TIMEOUT;

    for (const transaction of this.pendingTransactions.values()) {
      const age = now.getTime() - transaction.submittedAt.getTime();
      
      if (age > timeoutMs) {
        const timeout: TransactionTimeout = {
          hash: transaction.hash,
          marketAddress: transaction.marketAddress,
          type: transaction.type,
          submittedAt: transaction.submittedAt,
          timeoutAt: now,
        };

        logger.warn('Transaction timeout detected', {
          hash: transaction.hash,
          marketAddress: transaction.marketAddress,
          type: transaction.type,
          ageMs: age,
          timeoutMs,
        });

        // Check if we should retry
        if (transaction.attempts < transaction.maxAttempts) {
          logger.info('Transaction eligible for retry', {
            hash: transaction.hash,
            attempts: transaction.attempts,
            maxAttempts: transaction.maxAttempts,
          });

          this.emit('transactionRetry', transaction, timeout);
        } else {
          logger.error('Transaction max retries exceeded', {
            hash: transaction.hash,
            attempts: transaction.attempts,
            maxAttempts: transaction.maxAttempts,
          });

          this.removeTransaction(transaction.hash);
          this.emit('transactionTimeout', transaction, timeout);
        }
      }
    }
  }

  /**
   * Update transaction attempt count
   */
  updateTransactionAttempt(originalHash: string, newHash: string, newGasPrice: string): void {
    const transaction = this.pendingTransactions.get(originalHash);
    
    if (transaction) {
      // Remove old transaction
      this.pendingTransactions.delete(originalHash);

      // Add new transaction with incremented attempt count
      const updatedTransaction: PendingTransaction = {
        ...transaction,
        hash: newHash,
        attempts: transaction.attempts + 1,
        gasPrice: newGasPrice,
        submittedAt: new Date(),
      };

      this.pendingTransactions.set(newHash, updatedTransaction);

      logger.info('Transaction attempt updated', {
        originalHash,
        newHash,
        attempts: updatedTransaction.attempts,
        maxAttempts: updatedTransaction.maxAttempts,
        newGasPrice,
      });
    }
  }

  /**
   * Get current gas price recommendation
   */
  async getGasPriceRecommendation(priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      let gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

      // Apply priority multiplier
      const multipliers = {
        low: 0.9,
        medium: 1.1,
        high: 1.5,
      };

      gasPrice = (gasPrice * BigInt(Math.floor(multipliers[priority] * 100))) / 100n;

      // Enforce maximum gas price limit
      const maxGasPrice = ethers.parseUnits(config.MAX_GAS_PRICE_GWEI.toString(), 'gwei');
      if (gasPrice > maxGasPrice) {
        gasPrice = maxGasPrice;
      }

      return gasPrice.toString();

    } catch (error) {
      logger.error('Failed to get gas price recommendation:', {
        error: error instanceof Error ? error.message : error,
      });
      // Fallback to configured max gas price
      return ethers.parseUnits(config.MAX_GAS_PRICE_GWEI.toString(), 'gwei').toString();
    }
  }

  /**
   * Check if a transaction is likely stuck (low gas price)
   */
  async isTransactionStuck(transaction: PendingTransaction): Promise<boolean> {
    try {
      const currentGasPrice = await this.getGasPriceRecommendation('medium');
      const txGasPrice = BigInt(transaction.gasPrice);
      const currentGasPriceBN = BigInt(currentGasPrice);

      // Consider stuck if transaction gas price is significantly lower
      const threshold = (currentGasPriceBN * 80n) / 100n; // 80% of current price
      
      return txGasPrice < threshold;

    } catch (error) {
      logger.error('Failed to check if transaction is stuck:', {
        hash: transaction.hash,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    totalPending: number;
    byType: Record<string, number>;
    byMarket: Record<string, number>;
    oldestTransaction?: Date;
    averageAge: number;
  } {
    const transactions = Array.from(this.pendingTransactions.values());
    const now = new Date();

    const byType: Record<string, number> = {};
    const byMarket: Record<string, number> = {};
    let totalAge = 0;
    let oldestTransaction: Date | undefined;

    for (const tx of transactions) {
      // Count by type
      byType[tx.type] = (byType[tx.type] || 0) + 1;

      // Count by market
      byMarket[tx.marketAddress] = (byMarket[tx.marketAddress] || 0) + 1;

      // Calculate age
      const age = now.getTime() - tx.submittedAt.getTime();
      totalAge += age;

      // Track oldest
      if (!oldestTransaction || tx.submittedAt < oldestTransaction) {
        oldestTransaction = tx.submittedAt;
      }
    }

    const result: {
      totalPending: number;
      byType: Record<string, number>;
      byMarket: Record<string, number>;
      oldestTransaction?: Date;
      averageAge: number;
    } = {
      totalPending: transactions.length,
      byType,
      byMarket,
      averageAge: transactions.length > 0 ? totalAge / transactions.length : 0,
    };

    if (oldestTransaction) {
      result.oldestTransaction = oldestTransaction;
    }

    return result;
  }

  /**
   * Health check for transaction monitoring service
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check provider connection
      await this.provider.getNetwork();

      // Check if monitoring is running
      const isRunning = this.monitoringInterval !== null;

      // Check for very old pending transactions (potential issue)
      const stats = this.getStatistics();
      const maxAge = config.TRANSACTION_TIMEOUT * 2; // 2x timeout threshold
      const hasOldTransactions = stats.oldestTransaction && 
        (Date.now() - stats.oldestTransaction.getTime()) > maxAge;

      return isRunning && !hasOldTransactions;

    } catch (error) {
      logger.error('Transaction monitor health check failed:', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }
}