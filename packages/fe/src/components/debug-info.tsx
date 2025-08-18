'use client';

import { usePrivy } from '@privy-io/react-auth';

export function DebugInfo() {
  const { ready, authenticated, user } = usePrivy();

  return (
    <div className="bg-gray-100 p-4 rounded-md text-sm">
      <h3 className="font-semibold mb-2">Debug Info:</h3>
      <ul className="space-y-1">
        <li>Ready: {ready ? '✅' : '❌'}</li>
        <li>Authenticated: {authenticated ? '✅' : '❌'}</li>
        <li>User: {user ? '✅' : '❌'}</li>
        <li>Wallet Address: {user?.wallet?.address || 'None'}</li>
        <li>App ID: {process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'Not set'}</li>
      </ul>
    </div>
  );
}