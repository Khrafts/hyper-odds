import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ORACLE_ABI, MARKET_ABI } from '../abis/index.js';

export class ContractService {
  private oracle: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor(
    wallet: ethers.Wallet,
    oracleAddress: string
  ) {
    this.wallet = wallet;
    this.oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, wallet);
  }

  async commitResolution(
    marketAddress: string,
    outcome: number,
    dataHash: string
  ): Promise<ethers.TransactionResponse> {
    try {
      logger.debug({
        marketAddress,
        outcome,
        dataHash
      }, 'Committing resolution to oracle');

      const gasEstimate = await this.oracle.commit.estimateGas(
        marketAddress,
        outcome,
        dataHash
      );

      const gasLimit = gasEstimate * BigInt(Math.floor(config.gasLimitMultiplier * 100)) / 100n;

      const tx = await this.oracle.commit(
        marketAddress,
        outcome,
        dataHash,
        { gasLimit }
      );

      logger.info({
        txHash: tx.hash,
        marketAddress,
        outcome
      }, 'Resolution committed');

      return tx;
    } catch (error) {
      logger.error({ 
        error, 
        marketAddress, 
        outcome 
      }, 'Failed to commit resolution');
      throw error;
    }
  }

  async finalizeResolution(marketAddress: string): Promise<ethers.TransactionResponse> {
    try {
      logger.debug({ marketAddress }, 'Finalizing resolution');

      const gasEstimate = await this.oracle.finalize.estimateGas(marketAddress);
      const gasLimit = gasEstimate * BigInt(Math.floor(config.gasLimitMultiplier * 100)) / 100n;

      const tx = await this.oracle.finalize(marketAddress, { gasLimit });

      logger.info({
        txHash: tx.hash,
        marketAddress
      }, 'Resolution finalized');

      return tx;
    } catch (error) {
      logger.error({ error, marketAddress }, 'Failed to finalize resolution');
      throw error;
    }
  }

  async isPendingResolution(marketAddress: string): Promise<boolean> {
    try {
      const pending = await this.oracle.pendingResolutions(marketAddress);
      return pending.commitTime > 0;
    } catch (error) {
      logger.error({ error, marketAddress }, 'Failed to check pending resolution');
      throw error;
    }
  }

  async canFinalize(marketAddress: string): Promise<boolean> {
    try {
      const pending = await this.oracle.pendingResolutions(marketAddress);
      if (pending.commitTime === 0n) {
        return false;
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const disputeWindow = await this.oracle.DISPUTE_WINDOW();
      
      return currentTime >= pending.commitTime + disputeWindow;
    } catch (error) {
      logger.error({ error, marketAddress }, 'Failed to check if can finalize');
      throw error;
    }
  }

  async getMarketContract(marketAddress: string): Promise<ethers.Contract> {
    return new ethers.Contract(marketAddress, MARKET_ABI, this.wallet);
  }
}