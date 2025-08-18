import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { arbitrumSepolia } from 'viem/chains';
import { config } from './wagmi';

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'dummy-app-id',
  config: {
    loginMethods: ['wallet'],
    appearance: {
      theme: 'light',
    },
    defaultChain: arbitrumSepolia,
    supportedChains: [arbitrumSepolia],
  },
};