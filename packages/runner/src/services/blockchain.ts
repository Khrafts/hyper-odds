import { createPublicClient, createWalletClient, http, PublicClient, WalletClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { logger } from '../config/logger';
import { config } from '../config/config';

export class BlockchainService {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private connected = false;

  constructor() {
    // Initialize the account from private key
    this.account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);

    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(config.RPC_URL),
    });

    // Create wallet client for sending transactions
    this.walletClient = createWalletClient({
      account: this.account,
      chain: arbitrumSepolia,
      transport: http(config.RPC_URL),
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Blockchain already connected');
      return;
    }

    try {
      logger.info('Connecting to blockchain...', {
        rpcUrl: config.RPC_URL,
        chainId: config.CHAIN_ID,
        account: this.account.address
      });

      // Test the connection by getting the chain ID
      const chainId = await this.publicClient.getChainId();
      if (chainId !== config.CHAIN_ID) {
        throw new Error(`Chain ID mismatch. Expected ${config.CHAIN_ID}, got ${chainId}`);
      }

      // Test getting block number
      await this.publicClient.getBlockNumber();

      this.connected = true;
      logger.info('Blockchain connected successfully', {
        chainId,
        account: this.account.address
      });
      
    } catch (error) {
      logger.error('Failed to connect to blockchain:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Viem clients don't need explicit disconnection
    this.connected = false;
    logger.info('Blockchain service disconnected');
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }
      
      // Test by getting the latest block number
      await this.publicClient.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Blockchain health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  get client(): PublicClient {
    if (!this.connected) {
      throw new Error('Blockchain not connected. Call connect() first.');
    }
    return this.publicClient;
  }

  get wallet(): WalletClient {
    if (!this.connected) {
      throw new Error('Blockchain not connected. Call connect() first.');
    }
    return this.walletClient;
  }

  get address(): `0x${string}` {
    return this.account.address;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Utility methods for common blockchain operations
  async getBlockNumber(): Promise<bigint> {
    try {
      return await this.publicClient.getBlockNumber();
    } catch (error) {
      logger.error('Failed to get block number:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getBalance(address?: `0x${string}`): Promise<bigint> {
    try {
      const targetAddress = address || this.account.address;
      return await this.publicClient.getBalance({ address: targetAddress });
    } catch (error) {
      logger.error('Failed to get balance:', {
        address: address || this.account.address,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async waitForTransactionReceipt(hash: `0x${string}`) {
    try {
      return await this.publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: config.TRANSACTION_TIMEOUT 
      });
    } catch (error) {
      logger.error('Failed to wait for transaction receipt:', {
        hash,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async estimateGas(parameters: Parameters<PublicClient['estimateGas']>[0]) {
    try {
      return await this.publicClient.estimateGas(parameters);
    } catch (error) {
      logger.error('Failed to estimate gas:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getGasPrice(): Promise<bigint> {
    try {
      return await this.publicClient.getGasPrice();
    } catch (error) {
      logger.error('Failed to get gas price:', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Contract interaction helpers
  async readContract(parameters: Parameters<PublicClient['readContract']>[0]) {
    try {
      return await this.publicClient.readContract(parameters);
    } catch (error) {
      logger.error('Failed to read contract:', {
        address: parameters.address,
        functionName: parameters.functionName,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async writeContract(parameters: Parameters<WalletClient['writeContract']>[0]) {
    try {
      logger.debug('Writing to contract:', {
        address: parameters.address,
        functionName: parameters.functionName,
        account: this.account.address
      });

      const hash = await this.walletClient.writeContract(parameters);
      
      logger.info('Contract write transaction sent:', {
        hash,
        address: parameters.address,
        functionName: parameters.functionName
      });

      return hash;
    } catch (error) {
      logger.error('Failed to write contract:', {
        address: parameters.address,
        functionName: parameters.functionName,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Event listening helpers (for future event listener service)
  createEventFilter(parameters: Parameters<PublicClient['createEventFilter']>[0]) {
    return this.publicClient.createEventFilter(parameters);
  }

  getFilterLogs(parameters: Parameters<PublicClient['getFilterLogs']>[0]) {
    return this.publicClient.getFilterLogs(parameters);
  }

  getLogs(parameters: Parameters<PublicClient['getLogs']>[0]) {
    return this.publicClient.getLogs(parameters);
  }
}