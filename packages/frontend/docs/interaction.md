# Smart Contract Integration Plan

## Overview
This document outlines the plan to integrate smart contract interactions into the frontend, reconciling the skipped foundation tasks (23-26) and implementing core trading functionality.

## Current Status
- ✅ **UI Layer**: Portfolio, position cards, GraphQL integration complete
- ❌ **Contract Layer**: No smart contract interaction capability
- ❌ **Trading Functions**: Cannot deposit, trade, or claim rewards

## Contract Architecture Analysis

### Core Contracts Identified:
1. **MarketFactory.sol** - Creates and manages markets
2. **ParimutuelMarketImplementation.sol** - Individual market trading logic  
3. **stHYPE.sol** - Staking token for market creation
4. **SimpleOracle.sol** - Market resolution oracle

### Key Functions Needed:
- **MarketFactory**: `createMarket()`, `createMarketWithPermit()`
- **Market**: `deposit()`, `claim()`, `getPrice()`, `getUserStake()`
- **stHYPE**: `approve()`, `permit()`, `balanceOf()`

## Implementation Plan

### Phase 1: Foundation Setup (2 hours)
**Tasks 23-26 Reconciliation**

#### 1.1 Contract ABIs and Addresses (30 min)
- Extract ABIs from `/packages/contracts/out/` 
- Create `src/lib/contracts/abis/` with:
  - `MarketFactory.json`
  - `ParimutuelMarketImplementation.json` 
  - `stHYPE.json`
  - `SimpleOracle.json`
- Create `src/lib/contracts/addresses.ts` with deployed addresses
- Parse deployment data from `/packages/contracts/broadcast/`

#### 1.2 Contract Configuration (45 min)
- Create `src/lib/contracts/config.ts`
- Set up contract instances with wagmi
- Configure for Arbitrum Sepolia testnet
- Add fallback for local development

#### 1.3 Basic Contract Hooks (45 min)
- Create `src/hooks/contracts/` directory
- Implement `useMarketFactory.ts`:
  - `useCreateMarket()`
  - `useMarketCreationCost()`
- Implement `useMarket.ts`:
  - `useMarketData()`
  - `useUserPosition()`

### Phase 2: Trading Infrastructure (3 hours)
**Core Contract Interactions**

#### 2.1 Token Management (1 hour)
- Create `src/hooks/contracts/useToken.ts`:
  - `useTokenBalance()`
  - `useTokenAllowance()`
  - `useApproveToken()`
- Implement stHYPE permit functionality
- Add USDC/staking token utilities

#### 2.2 Market Trading (1.5 hours)
- Create `src/hooks/contracts/useTrading.ts`:
  - `useDeposit()` - Core trading function
  - `useGetPrice()` - Real-time price calculation  
  - `useMarketState()` - Pool balances, status
- Implement transaction state management
- Add gas estimation for all functions

#### 2.3 Position Management (30 min)
- Create `src/hooks/contracts/usePositions.ts`:
  - `useClaim()` - Claim winnings
  - `useClaimable()` - Check claimable amount
  - `useUserStakes()` - Current position data

### Phase 3: UI Integration (2 hours)
**Connect Smart Contracts to Existing UI**

#### 3.1 Trading Interface Integration (1 hour)
- Update `src/components/markets/trading/` (when created)
- Connect deposit buttons to `useDeposit()` hook
- Real-time price updates from contracts
- Transaction confirmation flows

#### 3.2 Portfolio Integration (30 min)  
- Update `src/components/portfolio/positionCard.tsx`:
  - Replace mock `onClaim` with actual `useClaim()` hook
  - Connect `onSell` to contract functions
  - Real-time position value updates

#### 3.3 Market Creation Integration (30 min)
- Update market creation forms (when implemented)
- Connect to `useCreateMarket()` hook
- Handle stHYPE approval flow

### Phase 4: Transaction Management (1.5 hours)
**Enhanced UX and Error Handling**

#### 4.1 Transaction State (45 min)
- Create `src/stores/transactionStore.ts`
- Track pending/confirmed/failed states
- Implement transaction history
- Add retry mechanisms

#### 4.2 Error Handling (45 min)
- Create contract-specific error messages
- Handle common failure modes:
  - Insufficient balance/allowance
  - Market cutoff passed
  - Network congestion
- Add user-friendly error display

## Technical Implementation Details

### Contract Integration Architecture:
```
src/lib/contracts/
├── abis/           # Contract ABIs
├── addresses.ts    # Deployed addresses
├── config.ts       # Contract instances
└── types.ts        # TypeScript interfaces

src/hooks/contracts/
├── useMarketFactory.ts  # Market creation
├── useMarket.ts         # Individual market interactions  
├── useTrading.ts        # Deposit/trading functions
├── usePositions.ts      # Position management
└── useToken.ts          # Token operations
```

### Key Integration Points:

#### 1. Market Creation:
```typescript
// Frontend calls
const { createMarket } = useCreateMarket()
await createMarket({
  subject: "Bitcoin Price",
  predicate: "Will BTC reach $100k?", 
  cutoffTime: timestamp,
  maxTotalPool: parseEther("10000")
})
```

#### 2. Trading:
```typescript
// Frontend calls  
const { deposit } = useDeposit(marketAddress)
await deposit({
  outcome: 1, // YES
  amount: parseEther("100") 
})
```

#### 3. Claiming:
```typescript
// Frontend calls
const { claim } = useClaim(marketAddress)
await claim()
```

## Environment Configuration

### Required Environment Variables:
```bash
# Contract Addresses - Arbitrum Sepolia
NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_STHYPE_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA=0x...

# RPC Configuration
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

## Success Criteria

### Phase 1 Complete:
- ✅ Contract ABIs loaded and typed
- ✅ Contract instances configured  
- ✅ Basic read operations working

### Phase 2 Complete:
- ✅ Can create markets via frontend
- ✅ Can deposit into YES/NO positions
- ✅ Real-time price updates from contracts

### Phase 3 Complete:
- ✅ Portfolio page shows real contract data
- ✅ Claim buttons execute actual transactions
- ✅ Transaction states properly managed

### Phase 4 Complete:
- ✅ Robust error handling
- ✅ Transaction history tracking
- ✅ Optimal user experience

## Risk Mitigation

### Development Risks:
- **Contract ABI Changes**: Pin to specific deployment versions
- **Network Issues**: Implement robust retry logic
- **Gas Estimation**: Add 20% buffer for safety
- **Approval Flows**: Clear UX for token approvals

### User Experience Risks:
- **Failed Transactions**: Clear error messages and retry options
- **Pending States**: Loading indicators and transaction tracking
- **Wallet Connection**: Graceful fallbacks and error states

## Timeline Estimate: 8.5 hours

This plan efficiently integrates smart contract functionality while building on the existing UI foundation, ensuring a complete trading experience from market creation to profit claiming.