'use client';

import { usePrivy } from '@privy-io/react-auth';

export function WalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <button className="btn btn-secondary" disabled>
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn btn-primary" onClick={login}>
        Connect Wallet
      </button>
    );
  }

  const walletAddress = user?.wallet?.address;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
      </span>
      <button className="btn btn-secondary" onClick={logout}>
        Disconnect
      </button>
    </div>
  );
}