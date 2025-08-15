import 'dotenv/config';
import { ethers } from 'ethers';

const rpcUrl = process.env.RPC_URL;
const factoryAddress = process.env.FACTORY_ADDRESS;

const FACTORY_ABI = [
  "event MarketCreated(address indexed market, address indexed creator, bool isProtocolMarket)"
];

async function main() {
  console.log('🔍 Testing recent market creation events...');
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
  
  // Check last 100 blocks for events
  const fromBlock = currentBlock - 100;
  console.log(`Checking blocks ${fromBlock} to ${currentBlock}...`);
  
  const filter = factoryContract.filters.MarketCreated();
  const events = await factoryContract.queryFilter(filter, fromBlock, currentBlock);
  
  console.log(`Found ${events.length} MarketCreated events:`);
  
  for (const event of events) {
    const [marketAddress, creator, isProtocolMarket] = event.args;
    console.log(`- Market: ${marketAddress}`);
    console.log(`  Creator: ${creator}`);
    console.log(`  Protocol Market: ${isProtocolMarket}`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  Tx: ${event.transactionHash}`);
    console.log('');
  }
}

main().catch(console.error);