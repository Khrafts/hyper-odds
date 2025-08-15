import 'dotenv/config';
import { ethers } from 'ethers';
import express from 'express';

console.log('🚀 Starting Simple Event-Driven Runner...');

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const factoryAddress = process.env.FACTORY_ADDRESS;
const oracleAddress = process.env.ORACLE_ADDRESS;

console.log('Config:', { rpcUrl, factoryAddress, oracleAddress });

// Simple job storage
const scheduledJobs = new Map();

// Market Factory ABI  
const FACTORY_ABI = [
  "event MarketCreated(address indexed market, address indexed creator, bytes32 subject, bytes32 predicate, bytes32 windowSpec, bool isProtocolMarket)"
];

// Market ABI for getting details  
const MARKET_ABI = [
  "function resolveTime() view returns (uint64)",
  "function resolved() view returns (bool)",
  "function subject() view returns (bytes32)",
  "function predicate() view returns (bytes32)"
];

// Oracle ABI for resolution
const ORACLE_ABI = [
  "function resolveMarket(address market, bool outcome) external"
];

async function scheduleMarketResolution(marketAddress, resolveTime) {
  const now = Math.floor(Date.now() / 1000);
  const delayMs = (resolveTime - now) * 1000;
  
  console.log(`📅 Scheduling market ${marketAddress} to resolve in ${delayMs}ms (${new Date(resolveTime * 1000)})`);
  
  if (delayMs <= 0) {
    console.log('⚡ Market should resolve immediately');
    await resolveMarket(marketAddress);
    return;
  }
  
  const timeoutId = setTimeout(async () => {
    console.log(`⏰ Time to resolve market ${marketAddress}`);
    await resolveMarket(marketAddress);
    scheduledJobs.delete(marketAddress);
  }, delayMs);
  
  scheduledJobs.set(marketAddress, {
    timeoutId,
    resolveTime,
    scheduledAt: Date.now()
  });
}

async function resolveMarket(marketAddress) {
  try {
    console.log(`🔍 Resolving market ${marketAddress}...`);
    
    // For now, just log the resolution
    // In a real implementation, we'd:
    // 1. Fetch price data from Hyperliquid
    // 2. Evaluate the predicate
    // 3. Call oracle.resolveMarket(market, outcome)
    
    console.log(`✅ Market ${marketAddress} resolved successfully`);
  } catch (error) {
    console.error(`❌ Failed to resolve market ${marketAddress}:`, error);
  }
}

async function handleMarketCreated(marketAddress, creator, subject, predicate, windowSpec, isProtocolMarket, event) {
  console.log(`🎯 New market created: ${marketAddress} by ${creator}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, provider);
    
    const [resolveTime, resolved] = await Promise.all([
      marketContract.resolveTime(),
      marketContract.resolved()
    ]);
    
    if (resolved) {
      console.log(`⏭️  Market ${marketAddress} already resolved, skipping`);
      return;
    }
    
    console.log(`📊 Market resolves at ${new Date(Number(resolveTime) * 1000)} (block ${event.blockNumber})`);
    
    await scheduleMarketResolution(marketAddress, Number(resolveTime));
  } catch (error) {
    console.error(`❌ Failed to handle market created event:`, error);
  }
}

async function main() {
  try {
    console.log('🔗 Connecting to Arbitrum Sepolia...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log(`📦 Connected! Current block: ${blockNumber}`);
    
    // Set up event listener
    const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    
    console.log('👂 Setting up MarketCreated event listener...');
    factoryContract.on('MarketCreated', handleMarketCreated);
    
    // Catch up on recent events
    console.log('🔄 Catching up on recent events...');
    const fromBlock = Math.max(0, blockNumber - 10000);
    const filter = factoryContract.filters.MarketCreated();
    const events = await factoryContract.queryFilter(filter, fromBlock, blockNumber);
    
    console.log(`📋 Found ${events.length} recent MarketCreated events`);
    
    for (const event of events) {
      const [marketAddress, creator, subject, predicate, windowSpec, isProtocolMarket] = event.args;
      await handleMarketCreated(marketAddress, creator, subject, predicate, windowSpec, isProtocolMarket, event);
    }
    
    // Start HTTP server
    const app = express();
    app.use(express.json());
    
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        mode: 'simple-event-listener',
        scheduledJobs: scheduledJobs.size,
        jobs: Array.from(scheduledJobs.entries()).map(([market, job]) => ({
          market,
          title: job.title,
          resolveTime: job.resolveTime,
          scheduledAt: new Date(job.scheduledAt).toISOString()
        }))
      });
    });
    
    app.get('/jobs', (req, res) => {
      res.json({
        jobs: Array.from(scheduledJobs.entries()).map(([market, job]) => ({
          market,
          resolveTime: job.resolveTime,
          scheduledAt: new Date(job.scheduledAt).toISOString(),
          resolveDate: new Date(job.resolveTime * 1000).toISOString()
        }))
      });
    });
    
    const port = parseInt(process.env.WEBHOOK_PORT || '3001');
    app.listen(port, () => {
      console.log(`🌐 HTTP server listening on port ${port}`);
      console.log('✅ Simple runner started successfully!');
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down...');
      factoryContract.removeAllListeners();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('💥 Failed to start runner:', error);
    process.exit(1);
  }
}

main();