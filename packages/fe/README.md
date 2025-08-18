# Predicate Markets Frontend

A lean TypeScript Next.js frontend for interacting with Predicate prediction markets.

## Features

- Connect/disconnect wallet with Privy
- Load markets from the subgraph
- Create new markets (requires stHYPE)
- Place YES/NO bets on markets
- Claim winnings from resolved markets

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Get a Privy App ID from https://console.privy.io/ and add it to `.env.local`

4. Run the development server:
```bash
npm run dev
```

## Contract Addresses (Arbitrum Sepolia)

- Factory: `0x3f4FdBD7F01e813a57cbbb95A38eAB118CafF6a0`
- stHYPE (market creation): `0xa88C085Ab4C90fEa3D915539319E9E00fe8Fef40`
- MockUSDC (betting): `0x6650830AdBa032Ef0bD83376B518d43D39AE6c46`

## Subgraph

GraphQL endpoint: https://api.goldsky.com/api/public/project_cm4ty719hcpgs01wg2r5z2pa8/subgraphs/hyper-odds-testnet/0.0.2/gn

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and connect your wallet via Privy
2. **Create Market**: Fill out the form on the right to create a new market (requires 1000 stHYPE)
3. **Place Bets**: For active markets, approve USDC and click "Bet YES" or "Bet NO"
4. **Claim Winnings**: After market resolution, click "Claim Winnings" if you won

## Development

The app is built with:
- Next.js 15 + TypeScript
- Privy for wallet connection
- Wagmi + Viem for contract interactions
- GraphQL for subgraph queries
- Tailwind CSS for styling