import 'dotenv/config';
import { ethers } from 'ethers';

console.log('Starting debug...');

try {
  console.log('Loading config...');
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const factoryAddress = process.env.FACTORY_ADDRESS;
  
  console.log('RPC URL:', rpcUrl);
  console.log('Factory:', factoryAddress);
  console.log('Private key exists:', !!privateKey);
  
  console.log('Creating provider...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log('Testing provider connection...');
  const blockNumber = await provider.getBlockNumber();
  console.log('Current block:', blockNumber);
  
  console.log('Creating wallet...');
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Wallet address:', wallet.address);
  
  console.log('Testing factory contract...');
  const abi = ["event MarketCreated(address indexed market, address indexed creator, bool isProtocolMarket)"];
  const contract = new ethers.Contract(factoryAddress, abi, provider);
  
  console.log('Testing event query...');
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100);
  
  const filter = contract.filters.MarketCreated();
  const events = await contract.queryFilter(filter, fromBlock, currentBlock);
  console.log('Found events:', events.length);
  
  console.log('Debug completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Debug failed:', error);
  process.exit(1);
}