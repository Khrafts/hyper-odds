import { ethers } from 'ethers';
import { logger } from '../config/logger';
import { config } from '../config/config';

// SimpleOracle ABI - extracted from the contract compilation
const SIMPLE_ORACLE_ABI = [
  {
    "type": "function",
    "name": "commit",
    "inputs": [
      {"name": "market", "type": "address", "internalType": "address"},
      {"name": "outcome", "type": "uint8", "internalType": "uint8"},
      {"name": "dataHash", "type": "bytes32", "internalType": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "finalize",
    "inputs": [
      {"name": "market", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pending",
    "inputs": [
      {"name": "", "type": "address", "internalType": "address"}
    ],
    "outputs": [
      {"name": "outcome", "type": "uint8", "internalType": "uint8"},
      {"name": "dataHash", "type": "bytes32", "internalType": "bytes32"},
      {"name": "commitTime", "type": "uint64", "internalType": "uint64"},
      {"name": "committed", "type": "bool", "internalType": "bool"},
      {"name": "finalized", "type": "bool", "internalType": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "disputeWindow",
    "inputs": [],
    "outputs": [
      {"name": "", "type": "uint64", "internalType": "uint64"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Committed",
    "inputs": [
      {"name": "market", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "outcome", "type": "uint8", "indexed": false, "internalType": "uint8"},
      {"name": "dataHash", "type": "bytes32", "indexed": false, "internalType": "bytes32"},
      {"name": "commitTime", "type": "uint64", "indexed": false, "internalType": "uint64"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Finalized",
    "inputs": [
      {"name": "market", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "outcome", "type": "uint8", "indexed": false, "internalType": "uint8"}
    ],
    "anonymous": false
  }
] as const;

export interface OracleCommitment {
  outcome: number;
  dataHash: string;
  commitTime: number;
  committed: boolean;
  finalized: boolean;
}

export interface CommitTransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  status: 'success' | 'failed';
}

export interface FinalizeTransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  status: 'success' | 'failed';
}

export interface OracleResolutionData {
  marketAddress: string;
  outcome: boolean; // true/false for binary outcomes
  metricValue: string;
  metricHash: string;
  confidence: number;
  sources: string[];
  resolvedAt: Date;
}

export class OracleService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private disputeWindow: number = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
    this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      config.ORACLE_ADDRESS,
      SIMPLE_ORACLE_ABI,
      this.wallet
    );
  }

  /**
   * Initialize the Oracle service and cache dispute window
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Oracle service...', {
        oracleAddress: config.ORACLE_ADDRESS,
        chainId: config.CHAIN_ID,
      });


      // Cache dispute window from contract
      this.disputeWindow = await this.getDisputeWindow();
      
      logger.info('Oracle service initialized successfully', {
        disputeWindow: this.disputeWindow,
        resolverAddress: this.wallet.address,
      });

    } catch (error) {
      logger.error('Failed to initialize Oracle service:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get dispute window duration from contract
   */
  async getDisputeWindow(): Promise<number> {
    try {
      // @ts-ignore - Contract is initialized in constructor
      const disputeWindow = await this.contract.disputeWindow();
      return Number(disputeWindow);
    } catch (error) {
      logger.error('Failed to get dispute window:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get current oracle commitment status for a market
   */
  async getCommitmentStatus(marketAddress: string): Promise<OracleCommitment> {
    try {
      // @ts-ignore - Contract is initialized in constructor
      const pending = await this.contract.pending(marketAddress);
      
      return {
        outcome: Number(pending.outcome),
        dataHash: pending.dataHash,
        commitTime: Number(pending.commitTime),
        committed: pending.committed,
        finalized: pending.finalized,
      };

    } catch (error) {
      logger.error('Failed to get commitment status:', {
        marketAddress,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Commit a market resolution to the Oracle
   */
  async commitResolution(resolutionData: OracleResolutionData): Promise<CommitTransactionResult> {
    try {
      logger.info('Committing market resolution to Oracle', {
        marketAddress: resolutionData.marketAddress,
        outcome: resolutionData.outcome,
        confidence: resolutionData.confidence,
        sources: resolutionData.sources,
      });

      // Check if already committed
      const status = await this.getCommitmentStatus(resolutionData.marketAddress);
      if (status.committed) {
        throw new Error(`Market ${resolutionData.marketAddress} already has a commitment`);
      }

      // Convert boolean outcome to uint8 (0 = false, 1 = true)
      const outcomeValue = resolutionData.outcome ? 1 : 0;

      // Use the metric hash as dataHash
      const dataHash = resolutionData.metricHash;

      // Estimate gas for the commit transaction
      // @ts-ignore - Contract is initialized in constructor
      const gasEstimate = await this.contract.commit.estimateGas(
        resolutionData.marketAddress,
        outcomeValue,
        dataHash
      );

      // Add safety margin to gas estimate
      const gasLimit = (gasEstimate * BigInt(Math.floor(config.GAS_LIMIT_MULTIPLIER * 100))) / 100n;

      // Get current gas price with max limit
      const feeData = await this.provider.getFeeData();
      const maxGasPrice = ethers.parseUnits(config.MAX_GAS_PRICE_GWEI.toString(), 'gwei');
      const gasPrice = (feeData.gasPrice && feeData.gasPrice < maxGasPrice) 
        ? feeData.gasPrice 
        : maxGasPrice;

      logger.debug('Transaction parameters', {
        gasLimit: gasLimit.toString(),
        gasPrice: `${ethers.formatUnits(gasPrice, 'gwei')  } gwei`,
        outcomeValue,
        dataHash,
      });

      // Execute commit transaction
      // @ts-ignore - Contract is initialized in constructor
      const tx = await this.contract.commit(
        resolutionData.marketAddress,
        outcomeValue,
        dataHash,
        {
          gasLimit,
          gasPrice,
        }
      );

      logger.info('Commit transaction sent', {
        transactionHash: tx.hash,
        marketAddress: resolutionData.marketAddress,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Commit transaction failed');
      }

      const result: CommitTransactionResult = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: 'success',
      };

      logger.info('Market resolution committed successfully', {
        marketAddress: resolutionData.marketAddress,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
      });

      return result;

    } catch (error) {
      logger.error('Failed to commit resolution:', {
        marketAddress: resolutionData.marketAddress,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Finalize a market resolution after dispute window
   */
  async finalizeResolution(marketAddress: string): Promise<FinalizeTransactionResult> {
    try {
      logger.info('Finalizing market resolution', { marketAddress });

      // Check commitment status
      const status = await this.getCommitmentStatus(marketAddress);
      
      if (!status.committed) {
        throw new Error(`Market ${marketAddress} has no commitment to finalize`);
      }

      if (status.finalized) {
        throw new Error(`Market ${marketAddress} is already finalized`);
      }

      // Check if dispute window has elapsed
      const currentTime = Math.floor(Date.now() / 1000);
      const finalizeTime = status.commitTime + this.disputeWindow;
      
      if (currentTime < finalizeTime) {
        const remainingTime = finalizeTime - currentTime;
        throw new Error(`Dispute window not elapsed. ${remainingTime} seconds remaining`);
      }

      // Estimate gas for finalize transaction
      // @ts-ignore - Contract is initialized in constructor
      const gasEstimate = await this.contract.finalize.estimateGas(marketAddress);
      const gasLimit = (gasEstimate * BigInt(Math.floor(config.GAS_LIMIT_MULTIPLIER * 100))) / 100n;

      // Get current gas price with max limit
      const feeData = await this.provider.getFeeData();
      const maxGasPrice = ethers.parseUnits(config.MAX_GAS_PRICE_GWEI.toString(), 'gwei');
      const gasPrice = (feeData.gasPrice && feeData.gasPrice < maxGasPrice) 
        ? feeData.gasPrice 
        : maxGasPrice;

      logger.debug('Finalize transaction parameters', {
        gasLimit: gasLimit.toString(),
        gasPrice: `${ethers.formatUnits(gasPrice, 'gwei')  } gwei`,
      });

      // Execute finalize transaction
      // @ts-ignore - Contract is initialized in constructor
      const tx = await this.contract.finalize(marketAddress, {
        gasLimit,
        gasPrice,
      });

      logger.info('Finalize transaction sent', {
        transactionHash: tx.hash,
        marketAddress,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Finalize transaction failed');
      }

      const result: FinalizeTransactionResult = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: 'success',
      };

      logger.info('Market resolution finalized successfully', {
        marketAddress,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
      });

      return result;

    } catch (error) {
      logger.error('Failed to finalize resolution:', {
        marketAddress,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Check if a market can be finalized (dispute window elapsed)
   */
  async canFinalize(marketAddress: string): Promise<boolean> {
    try {
      const status = await this.getCommitmentStatus(marketAddress);
      
      if (!status.committed || status.finalized) {
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const finalizeTime = status.commitTime + this.disputeWindow;
      
      return currentTime >= finalizeTime;

    } catch (error) {
      logger.error('Failed to check finalize status:', {
        marketAddress,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get time remaining until finalization is possible
   */
  async getTimeUntilFinalization(marketAddress: string): Promise<number> {
    try {
      const status = await this.getCommitmentStatus(marketAddress);
      
      if (!status.committed || status.finalized) {
        return 0;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const finalizeTime = status.commitTime + this.disputeWindow;
      
      return Math.max(0, finalizeTime - currentTime);

    } catch (error) {
      logger.error('Failed to get finalization time:', {
        marketAddress,
        error: error instanceof Error ? error.message : error,
      });
      return 0;
    }
  }

  /**
   * Health check for Oracle service
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check provider connection
      await this.provider.getNetwork();
      
      // Check contract connection by reading dispute window
      // @ts-ignore - Contract is initialized in constructor
      await this.contract.disputeWindow();
      
      // Check wallet balance (need some ETH for gas)
      const balance = await this.provider.getBalance(this.wallet.address);
      const minimumBalance = ethers.parseEther('0.01'); // 0.01 ETH minimum
      
      if (balance < minimumBalance) {
        logger.warn('Oracle wallet balance low', {
          balance: ethers.formatEther(balance),
          minimum: ethers.formatEther(minimumBalance),
        });
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Oracle health check failed:', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get Oracle service info for monitoring
   */
  async getInfo(): Promise<{
    oracleAddress: string;
    resolverAddress: string;
    disputeWindow: number;
    chainId: number;
    blockNumber: number;
    walletBalance: string;
  }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = await this.provider.getBalance(this.wallet.address);

      return {
        oracleAddress: config.ORACLE_ADDRESS,
        resolverAddress: this.wallet.address,
        disputeWindow: this.disputeWindow,
        chainId: Number(network.chainId),
        blockNumber,
        walletBalance: ethers.formatEther(balance),
      };

    } catch (error) {
      logger.error('Failed to get Oracle info:', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Disconnect and cleanup resources
   */
  async disconnect(): Promise<void> {
    try {
      // ethers.js providers clean up automatically
      logger.info('Oracle service disconnected');
    } catch (error) {
      logger.error('Error disconnecting Oracle service:', {
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}