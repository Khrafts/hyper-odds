# Multi-Market Type Support Plan

## Executive Summary

The Predicate platform now supports two distinct market types:
1. **Parimutuel Markets** - Pool-based betting with time decay mechanics
2. **CPMM Markets** - Constant Product Market Maker with instant liquidity

The frontend currently only supports Parimutuel markets. This document outlines the plan to extend the frontend to fully support both market types with appropriate UX for each.

## Current State Analysis

### Contract Differences

| Feature | Parimutuel | CPMM |
|---------|------------|------|
| **Pricing Model** | Pool-based (share of pool) | AMM (constant product) |
| **Initial Liquidity** | None required | Required from creator |
| **Time Decay** | Yes (optional) | No |
| **Trading** | Deposit only | Buy/Sell shares |
| **Price Discovery** | Pool ratios | Reserve ratios |
| **Fees** | On winnings | On each trade |
| **Slippage** | None | Yes |
| **Immediate Exit** | No | Yes (with potential loss) |

### Indexer Support
The indexer already differentiates between market types:
- `marketType` field: "PARIMUTUEL" or "CPMM"
- Separate fields for each type (pools vs reserves)
- Different event handlers for each implementation

### Frontend Limitations
Current implementation assumes Parimutuel only:
- Types reference pools, not reserves
- Trading UI only supports deposits
- No buy/sell functionality
- No slippage calculations
- No liquidity provision UI

## Implementation Plan

### Phase 1: Type System Extension (2 hours)

#### Task 1.1: Extend Market Types
Update `src/types/market.ts`:
- Add `marketType: 'PARIMUTUEL' | 'CPMM'` field
- Add CPMM-specific fields (reserves, spot price, liquidity)
- Create union types for market-specific data
- Add CPMM trading types (buy/sell, slippage)

#### Task 1.2: Update GraphQL Queries
Update `src/graphql/queries/markets.graphql`:
- Add marketType field to all queries
- Add CPMM fields (reserveYes, reserveNo, spotPrice, initialLiquidity)
- Add totalFeesCollected for CPMM markets

#### Task 1.3: Contract ABIs
Update `src/lib/web3/contracts.ts`:
- Add CPMMMarketImplementation ABI
- Create market type detection helper
- Add CPMM-specific function interfaces

### Phase 2: Data Layer Updates (3 hours)

#### Task 2.1: Market Hooks Enhancement
Update `src/hooks/useMarkets.ts`:
- Add market type filtering
- Handle both pool and reserve data
- Calculate prices differently per type

#### Task 2.2: Trading Hooks Split
Create separate hooks in `src/hooks/`:
- `useParimutuelTrading.ts` - Deposit and claim functions
- `useCPMMTrading.ts` - Buy, sell, add/remove liquidity
- `useTradingRouter.ts` - Routes to appropriate hook based on type

#### Task 2.3: Price Calculations
Create `src/lib/pricing.ts`:
- Parimutuel: Pool ratio calculations
- CPMM: Constant product formula
- Slippage calculations for CPMM
- Price impact estimations

### Phase 3: UI Components (6 hours)

#### Task 3.1: Market Card Updates
Update `src/components/markets/marketCard.tsx`:
- Display market type badge
- Show appropriate metrics (pools vs liquidity)
- Different probability displays

#### Task 3.2: Trading Interface Split
Create in `src/components/markets/market-detail/`:
- `ParimutuelTradingInterface.tsx` - Current deposit-only UI
- `CPMMTradingInterface.tsx` - Buy/sell with slippage
- `TradingInterfaceRouter.tsx` - Routes based on market type

#### Task 3.3: CPMM-Specific Components
Create new components:
- `LiquidityProvisionModal.tsx` - Add/remove liquidity
- `SlippageSettings.tsx` - Slippage tolerance control
- `PriceImpactWarning.tsx` - Large trade warnings
- `InstantTradePreview.tsx` - Show expected outcome

#### Task 3.4: Chart Adaptations
Update `src/components/charts/`:
- `probabilityChart.tsx` - Different data sources per type
- Add `liquidityChart.tsx` for CPMM markets
- Add `priceImpactChart.tsx` for CPMM

### Phase 4: Market Creation (4 hours)

#### Task 4.1: Creation Flow Update
Update `src/app/create/`:
- Add market type selection step
- Conditional fields based on type
- Initial liquidity form for CPMM

#### Task 4.2: Validation Updates
Update `src/lib/validations/`:
- Type-specific validation schemas
- CPMM liquidity requirements
- Different parameter constraints

#### Task 4.3: Factory Integration
Update creation hooks:
- Route to correct factory function
- Handle different initialization params
- Calculate creation costs per type

### Phase 5: Portfolio & Positions (3 hours)

#### Task 5.1: Position Display
Update `src/components/portfolio/`:
- Show shares vs deposits
- Different P&L calculations
- Exit options for CPMM

#### Task 5.2: Claim/Exit Flow
- Parimutuel: Claim winnings only
- CPMM: Sell shares anytime
- Different success states

### Phase 6: Testing & Polish (2 hours)

#### Task 6.1: Integration Testing
- Test both market types end-to-end
- Verify calculations accuracy
- Test edge cases

#### Task 6.2: UI/UX Polish
- Consistent styling
- Clear type indicators
- Helpful tooltips explaining differences

## Implementation Order

### Day 1 (8 hours)
1. **Morning (4h)**
   - Phase 1: Type System Extension (2h)
   - Phase 2: Data Layer Updates (2h)

2. **Afternoon (4h)**
   - Phase 3: UI Components - Tasks 3.1-3.2 (4h)

### Day 2 (8 hours)
1. **Morning (4h)**
   - Phase 3: UI Components - Tasks 3.3-3.4 (2h)
   - Phase 4: Market Creation - Tasks 4.1-4.2 (2h)

2. **Afternoon (4h)**
   - Phase 4: Market Creation - Task 4.3 (2h)
   - Phase 5: Portfolio & Positions (2h)

### Day 3 (4 hours)
1. **Morning (4h)**
   - Phase 5: Complete Portfolio (1h)
   - Phase 6: Testing & Polish (2h)
   - Buffer time for fixes (1h)

## Key Files to Modify

### Types & Contracts
- `src/types/market.ts` - Add market type and CPMM fields
- `src/lib/web3/contracts.ts` - Add CPMM ABI and helpers

### Hooks
- `src/hooks/useTrading.ts` - Split into type-specific hooks
- `src/hooks/useMarkets.ts` - Handle both types
- Create `src/hooks/useCPMMTrading.ts`
- Create `src/hooks/useParimutuelTrading.ts`

### Components
- `src/components/markets/marketCard.tsx` - Type indicator
- `src/components/markets/market-detail/tradingInterface.tsx` - Router component
- Create CPMM-specific trading components

### GraphQL
- `src/graphql/queries/markets.graphql` - Add type fields
- `src/graphql/mutations/trades.graphql` - Add CPMM mutations

### New Files
- `src/lib/pricing.ts` - Price calculation utilities
- `src/components/markets/market-detail/CPMMTradingInterface.tsx`
- `src/components/markets/market-detail/ParimutuelTradingInterface.tsx`
- `src/components/trading/LiquidityProvisionModal.tsx`
- `src/components/trading/SlippageSettings.tsx`

## Success Criteria

1. **Functional Requirements**
   - Users can identify market type at a glance
   - Parimutuel markets work as before
   - CPMM markets support buy/sell operations
   - Liquidity provision works for CPMM
   - Correct price calculations for each type

2. **UX Requirements**
   - Clear visual distinction between types
   - Appropriate warnings for CPMM slippage
   - Intuitive trading interfaces for each
   - Helpful explanations of differences

3. **Technical Requirements**
   - Type-safe throughout
   - No breaking changes to existing markets
   - Efficient GraphQL queries
   - Proper error handling

## Risk Mitigation

1. **Backward Compatibility**
   - Keep existing Parimutuel logic intact
   - Use feature flags if needed
   - Gradual rollout possible

2. **User Confusion**
   - Clear labeling and education
   - Tooltips explaining differences
   - Separate sections if needed

3. **Technical Complexity**
   - Start with read-only CPMM support
   - Add trading features incrementally
   - Extensive testing before launch

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create feature branch
4. Begin Phase 1 implementation
5. Regular testing and review cycles

## Appendix: CPMM Formulas

### Price Calculation
```
spotPrice = reserveNo / reserveYes
probabilityYes = reserveNo / (reserveNo + reserveYes)
```

### Buy Shares
```
sharesBought = reserveYes - (k / (reserveNo + amountIn))
where k = reserveYes * reserveNo
```

### Sell Shares
```
amountOut = reserveNo - (k / (reserveYes + sharesIn))
where k = reserveYes * reserveNo
```

### Slippage
```
priceImpact = (newPrice - oldPrice) / oldPrice * 100
```