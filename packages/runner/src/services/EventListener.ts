import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { JobScheduler } from './JobScheduler.js';

// MarketFactory ABI - just the MarketCreated event
const MARKET_FACTORY_ABI = [
  "event MarketCreated(address indexed market, address indexed creator, bool isProtocolMarket)"
];

export class EventListener {
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private jobScheduler: JobScheduler;
  private isListening: boolean = false;

  constructor(jobScheduler: JobScheduler) {
    this.jobScheduler = jobScheduler;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.factoryContract = new ethers.Contract(
      config.factoryAddress,
      MARKET_FACTORY_ABI,
      this.provider
    );
  }

  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Event listener already started');
      return;
    }

    logger.info({ 
      factoryAddress: config.factoryAddress,
      rpcUrl: config.rpcUrl 
    }, 'Starting event listener for MarketCreated events');

    // Listen for new MarketCreated events
    this.factoryContract.on('MarketCreated', async (marketAddress: string, creator: string, isProtocolMarket: boolean, event) => {
      const eventLogger = logger.child({
        marketAddress,
        creator,
        isProtocolMarket,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash
      });

      eventLogger.info('MarketCreated event detected');

      try {
        await this.handleMarketCreated(marketAddress, eventLogger);
      } catch (error) {
        eventLogger.error({ error }, 'Failed to handle MarketCreated event');
      }
    });

    // Also catch up on any recent events we might have missed
    await this.catchUpOnRecentEvents();

    this.isListening = true;
    logger.info('Event listener started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopping event listener');
    this.factoryContract.removeAllListeners('MarketCreated');
    this.isListening = false;
    logger.info('Event listener stopped');
  }

  private async catchUpOnRecentEvents(): Promise<void> {
    try {
      // Get events from the last 1000 blocks to catch any we missed
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);

      logger.info({ fromBlock, currentBlock }, 'Catching up on recent MarketCreated events');

      const filter = this.factoryContract.filters.MarketCreated();
      const events = await this.factoryContract.queryFilter(filter, fromBlock, currentBlock);

      logger.info({ eventCount: events.length }, 'Found recent MarketCreated events');

      for (const event of events) {
        const [marketAddress, creator, isProtocolMarket] = (event as any).args;
        const eventLogger = logger.child({
          marketAddress,
          creator,
          isProtocolMarket,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash
        });

        eventLogger.info('Processing historical MarketCreated event');
        
        try {
          await this.handleMarketCreated(marketAddress, eventLogger);
        } catch (error) {
          eventLogger.error({ error }, 'Failed to handle historical MarketCreated event');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to catch up on recent events');
    }
  }

  private async handleMarketCreated(marketAddress: string, eventLogger: any): Promise<void> {
    // Get market details directly from the contract
    const marketDetails = await this.getMarketDetails(marketAddress);
    
    if (!marketDetails) {
      eventLogger.error('Failed to fetch market details');
      return;
    }

    eventLogger.info({
      title: marketDetails.title,
      resolveTime: marketDetails.resolveTime,
      resolveDate: new Date(marketDetails.resolveTime * 1000).toISOString()
    }, 'Scheduling market for resolution');

    // Schedule the market for resolution
    this.jobScheduler.scheduleMarketResolution(
      marketAddress,
      marketDetails.title,
      marketDetails.resolveTime
    );
  }

  private async getMarketDetails(marketAddress: string): Promise<{ title: string; resolveTime: number } | null> {
    try {
      // Market contract ABI for getting basic details
      const marketABI = [
        "function title() view returns (string)",
        "function resolveTime() view returns (uint64)",
        "function resolved() view returns (bool)"
      ];

      const marketContract = new ethers.Contract(marketAddress, marketABI, this.provider);
      
      const [title, resolveTime, resolved] = await Promise.all([
        marketContract.title(),
        marketContract.resolveTime(),
        marketContract.resolved()
      ]);

      // Skip if already resolved
      if (resolved) {
        logger.debug({ marketAddress }, 'Market already resolved, skipping');
        return null;
      }

      return {
        title,
        resolveTime: Number(resolveTime)
      };
    } catch (error) {
      logger.error({ error, marketAddress }, 'Failed to fetch market details from contract');
      return null;
    }
  }
}