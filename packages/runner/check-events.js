import 'dotenv/config';
import { ethers } from 'ethers';

const rpcUrl = process.env.RPC_URL;
const factoryAddress = process.env.FACTORY_ADDRESS;

console.log('Factory address:', factoryAddress);

const FACTORY_ABI = ['event MarketCreated(address indexed market, address indexed creator, bytes32 subject, bytes32 predicate, bytes32 windowSpec, bool isProtocolMarket)'];

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);

  // Check last 10,000 blocks for events
  const fromBlock = Math.max(0, currentBlock - 10000);
  console.log(`Checking blocks ${fromBlock} to ${currentBlock}...`);

  const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
  const filter = factoryContract.filters.MarketCreated();
  const events = await factoryContract.queryFilter(filter, fromBlock, currentBlock);

  console.log(`Found ${events.length} MarketCreated events in last 10k blocks`);

  for (const event of events) {
    const [marketAddress, creator, subject, predicate, windowSpec, isProtocolMarket] = event.args;
    console.log(`- Market: ${marketAddress} (Block: ${event.blockNumber}, Creator: ${creator})`);
  }
}

main().catch(console.error);