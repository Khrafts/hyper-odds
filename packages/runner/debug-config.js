import 'dotenv/config';

console.log('Testing config loading...');

try {
  console.log('Environment variables:');
  console.log('RPC_URL:', process.env.RPC_URL);
  console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
  console.log('ORACLE_ADDRESS:', process.env.ORACLE_ADDRESS);
  console.log('FACTORY_ADDRESS:', process.env.FACTORY_ADDRESS);
  console.log('WEBHOOK_PORT:', process.env.WEBHOOK_PORT);
  
  console.log('Attempting to import config...');
  const { config } = await import('./src/config/index.js');
  console.log('Config loaded successfully:', config);
  
  process.exit(0);
} catch (error) {
  console.error('Config loading failed:', error);
  process.exit(1);
}