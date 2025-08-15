# HyperOdds 3-Day Hackathon Tasks

## Overview
This is a focused, time-boxed version of the MVP plan optimized for a 3-day hackathon. Priority is on core functionality over polish, with ~72 hours of development time across 45 essential tasks.

## Day 1: Foundation & Core Display (15 tasks, ~24 hours)

### Hour 1-2: Project Setup
**Task 1**: Initialize Next.js 14 Project (30 min)
**Task 2**: Configure Package.json (15 min)
**Task 3**: Set up Environment Configuration (30 min)
**Task 4**: Install Core Dependencies (30 min)
**Task 5**: Set up Tailwind Configuration (15 min)

### Hour 3-4: Essential Utils & Web3
**Task 6**: Create Utility Functions (30 min)
**Task 7**: Install Web3 Dependencies (15 min)
**Task 8**: Configure Web3 Setup (45 min)
**Task 9**: Create Web3 Providers (30 min)

### Hour 5-7: GraphQL & Data Layer
**Task 10**: Install GraphQL Dependencies (15 min)
**Task 11**: Configure GraphQL Client (45 min)
**Task 12**: Set up GraphQL Code Generation (45 min)
**Task 13**: Create Market Types (45 min)
**Task 14**: Create GraphQL Queries (45 min)

### Hour 8-12: Basic Layout
**Task 15**: Create Base UI Components (1 hour)
**Task 16**: Update Root Layout (30 min)
**Task 17**: Create Header Component (2 hours)
**Task 18**: Create Basic Navigation (1.5 hours)

### Hour 13-18: Market Display Core
**Task 19**: Create Market Data Hooks (1.5 hours)
**Task 20**: Create Market Card Component (2 hours)
**Task 21**: Create Market Grid Component (1.5 hours)
**Task 22**: Create Markets Page (1 hour)

### Hour 19-24: Contract Integration
**Task 23**: Add Contract ABIs and Addresses (1 hour)
**Task 24**: Create Contract Interaction Hooks (2 hours)
**Task 25**: Create Connect Button Component (1 hour)
**Task 26**: Add Basic Error Handling (1 hour)

## Day 2: Trading & Market Detail (15 tasks, ~24 hours)

### Hour 25-30: Market Detail Foundation
**Task 27**: Create Market Header Component (1.5 hours)
**Task 28**: Create Market Detail Page Structure (1 hour)
**Task 29**: Create Trading Interface Component (3 hours)
**Task 30**: Add Form Validation for Trading (30 min)

### Hour 31-36: Trading Functionality
**Task 31**: Implement Deposit Functionality (2 hours)
**Task 32**: Add Transaction State Management (1.5 hours)
**Task 33**: Create Transaction Toast Notifications (1 hour)
**Task 34**: Add Gas Estimation (1 hour)
**Task 35**: Create Transaction Confirmation Modal (30 min)

### Hour 37-42: Market Charts & Data
**Task 36**: Install Chart Dependencies (15 min)
**Task 37**: Create Basic Market Chart (2.5 hours)
**Task 38**: Create Position Manager Component (1.5 hours)
**Task 39**: Create Activity Feed Component (1.5 hours)

### Hour 43-48: Portfolio Essentials
**Task 40**: Create User Position Types (30 min)
**Task 41**: Create Position Hooks (1 hour)
**Task 42**: Create Portfolio Page Structure (1 hour)
**Task 43**: Create Position Card Component (1.5 hours)
**Task 44**: Create Claim Rewards Component (2 hours)

## Day 3: Polish & Final Features (15 tasks, ~24 hours)

### Hour 49-54: Essential Features
**Task 45**: Create Dashboard Home Page (2 hours)
**Task 46**: Add Loading States (1.5 hours)
**Task 47**: Add Basic Error Pages (1 hour)
**Task 48**: Implement Responsive Design (1.5 hours)

### Hour 55-60: Market Creation (Simplified)
**Task 49**: Create Basic Market Creation Form (3 hours)
**Task 50**: Add Market Creation Validation (1 hour)
**Task 51**: Implement Market Creation Hook (2 hours)

### Hour 61-66: Critical Polish
**Task 52**: Add Loading Skeletons (1.5 hours)
**Task 53**: Optimize Key Animations (1 hour)
**Task 54**: Fix Mobile Navigation (1.5 hours)
**Task 55**: Add Search Functionality (2 hours)

### Hour 67-72: Final Polish & Testing
**Task 56**: Comprehensive Testing & Bug Fixes (2 hours)
**Task 57**: Performance Optimization (1 hour)
**Task 58**: SEO Basics (1 hour)
**Task 59**: Final UI Polish (1.5 hours)
**Task 60**: Deploy & Demo Prep (30 min)

## Detailed Task Breakdown

### Foundation Tasks (Day 1, Hours 1-7)

#### Task 1: Initialize Next.js 14 Project (30 min)
- Run `npx create-next-app@latest hyperodds --typescript --tailwind --eslint --app --src-dir`
- Verify build works
- Test: App starts on localhost:3000

#### Task 2: Configure Package.json (15 min)  
- Update name, description, scripts
- Test: `pnpm build` succeeds

#### Task 3: Set up Environment Configuration (30 min)
- Create `.env.local.example`
- Create `src/lib/env.ts` with Zod validation
- Test: Environment variables load correctly

#### Task 4: Install Core Dependencies (30 min)
- Install: shadcn/ui, react-hook-form, zod, zustand, @tanstack/react-query
- Test: All packages import without errors

#### Task 5: Set up Tailwind Configuration (15 min)
- Configure custom colors, fonts
- Update globals.css
- Test: Custom styles apply

#### Task 6: Create Utility Functions (30 min)
- Create `src/lib/utils.ts`, `src/lib/constants.ts`
- Test: Utils can be imported and used

#### Task 7: Install Web3 Dependencies (15 min)
- Install: wagmi, viem, @rainbow-me/rainbowkit
- Test: Packages install successfully

#### Task 8: Configure Web3 Setup (45 min)
- Create `src/lib/web3/config.ts` with wagmi config
- Configure Arbitrum Sepolia
- Test: Config loads without TypeScript errors

#### Task 9: Create Web3 Providers (30 min)
- Create `src/app/providers.tsx`
- Test: App starts with Web3 providers

#### Task 10: Install GraphQL Dependencies (15 min)
- Install: @apollo/client, graphql, codegen packages
- Test: Packages import correctly

#### Task 11: Configure GraphQL Client (45 min)
- Create `src/lib/graphql/client.ts`
- Configure Apollo with cache policies
- Test: Client initializes

#### Task 12: Set up GraphQL Code Generation (45 min)
- Create `codegen.yml`
- Copy schema from indexer
- Run codegen
- Test: Types generate successfully

#### Task 13: Create Market Types (45 min)
- Create `src/types/market.ts`
- Based on GraphQL schema
- Test: Types compile

#### Task 14: Create GraphQL Queries (45 min)
- Create `src/lib/graphql/queries/markets.ts`
- Include markets list and detail queries
- Test: Queries validate against schema

### Layout Tasks (Day 1, Hours 8-12)

#### Task 15: Create Base UI Components (1 hour)
- Install shadcn: button, card, input, dialog
- Test: Components render

#### Task 16: Update Root Layout (30 min)
- Add providers, fonts, metadata
- Test: Layout renders with providers

#### Task 17: Create Header Component (2 hours)
- Create `src/components/layout/header.tsx`
- Include logo, navigation, wallet connect
- Make responsive
- Test: Header displays correctly

#### Task 18: Create Basic Navigation (1.5 hours)
- Create `src/components/layout/navigation.tsx`
- Add routing logic
- Test: Navigation works

### Market Display Tasks (Day 1, Hours 13-18)

#### Task 19: Create Market Data Hooks (1.5 hours)
- Create `src/hooks/use-markets.ts`
- Create `src/hooks/use-market.ts`
- Test: Hooks return data

#### Task 20: Create Market Card Component (2 hours)
- Create `src/components/markets/market-card.tsx`
- Show title, odds, volume
- Add hover effects
- Test: Card renders with data

#### Task 21: Create Market Grid Component (1.5 hours)
- Create `src/components/markets/market-grid.tsx`
- Handle loading/error states
- Test: Grid displays cards

#### Task 22: Create Markets Page (1 hour)
- Create `src/app/(dashboard)/markets/page.tsx`
- Combine grid and basic layout
- Test: Page loads with markets

### Contract Integration Tasks (Day 1, Hours 19-24)

#### Task 23: Add Contract ABIs and Addresses (1 hour)
- Create `src/lib/web3/contracts.ts`
- Add ParimutuelMarket ABI
- Test: Contract addresses load

#### Task 24: Create Contract Interaction Hooks (2 hours)
- Create `src/hooks/use-trading.ts`
- Implement deposit and claim functions
- Test: Hooks can interact with contracts

#### Task 25: Create Connect Button Component (1 hour)
- Create `src/components/web3/connect-button.tsx`
- Style RainbowKit button
- Test: Wallet connection works

#### Task 26: Add Basic Error Handling (1 hour)
- Create error boundaries
- Add error states to components
- Test: Errors display properly

### Trading Tasks (Day 2, Hours 25-36)

#### Task 27: Create Market Header Component (1.5 hours)
- Create `src/components/markets/market-detail/market-header.tsx`
- Show market title, description, status
- Test: Header displays market info

#### Task 28: Create Market Detail Page Structure (1 hour)
- Create `src/app/(dashboard)/markets/[id]/page.tsx`
- Basic layout structure
- Test: Page loads for market ID

#### Task 29: Create Trading Interface Component (3 hours)
- Create `src/components/markets/market-detail/trading-interface.tsx`
- YES/NO buttons, amount input
- Calculate payouts
- Test: Interface calculates correctly

#### Task 30: Add Form Validation for Trading (30 min)
- Create `src/lib/validations/trading.ts`
- Validate amounts and balances
- Test: Forms validate inputs

#### Task 31: Implement Deposit Functionality (2 hours)
- Connect trading interface to contracts
- Handle approvals and deposits
- Test: Deposits execute successfully

#### Task 32: Add Transaction State Management (1.5 hours)
- Create `src/stores/use-trading-store.ts`
- Manage transaction states
- Test: State updates correctly

#### Task 33: Create Transaction Toast Notifications (1 hour)
- Install sonner
- Create notification system
- Test: Transactions show notifications

#### Task 34: Add Gas Estimation (1 hour)
- Estimate gas for transactions
- Show fees in interface
- Test: Gas estimates are accurate

#### Task 35: Create Transaction Confirmation Modal (30 min)
- Confirmation dialog with details
- Test: Modal shows correct info

### Charts & Portfolio Tasks (Day 2, Hours 37-48)

#### Task 36: Install Chart Dependencies (15 min)
- Install recharts
- Test: Package imports

#### Task 37: Create Basic Market Chart (2.5 hours)
- Create `src/components/charts/probability-chart.tsx`
- Show basic probability over time
- Test: Chart renders with data

#### Task 38: Create Position Manager Component (1.5 hours)
- Create `src/components/markets/market-detail/position-manager.tsx`
- Show user position and P&L
- Test: Position data displays

#### Task 39: Create Activity Feed Component (1.5 hours)
- Create `src/components/markets/market-detail/activity-feed.tsx`
- Show recent trades
- Test: Activity displays

#### Task 40: Create User Position Types (30 min)
- Create `src/types/user.ts`
- Test: Types compile

#### Task 41: Create Position Hooks (1 hour)
- Create `src/hooks/use-positions.ts`
- Test: Hooks return position data

#### Task 42: Create Portfolio Page Structure (1 hour)
- Create `src/app/(dashboard)/portfolio/page.tsx`
- Basic layout
- Test: Page renders

#### Task 43: Create Position Card Component (1.5 hours)
- Create `src/components/portfolio/position-card.tsx`
- Show position details
- Test: Card displays position

#### Task 44: Create Claim Rewards Component (2 hours)
- Create `src/components/portfolio/claim-rewards.tsx`
- Implement claiming functionality
- Test: Claims work correctly

### Final Polish Tasks (Day 3, Hours 49-72)

#### Task 45: Create Dashboard Home Page (2 hours)
- Create `src/app/(dashboard)/page.tsx`
- Featured markets, quick stats
- Test: Dashboard loads with overview

#### Task 46: Add Loading States (1.5 hours)
- Create loading spinners and skeletons
- Test: Loading states display

#### Task 47: Add Basic Error Pages (1 hour)
- Create 404 and error pages
- Test: Error pages display

#### Task 48: Implement Responsive Design (1.5 hours)
- Ensure mobile compatibility
- Test: Works on mobile devices

#### Task 49: Create Basic Market Creation Form (3 hours)
- Single-page market creation
- Essential fields only
- Test: Can create markets

#### Task 50: Add Market Creation Validation (1 hour)
- Validate creation inputs
- Test: Validation prevents errors

#### Task 51: Implement Market Creation Hook (2 hours)
- Connect form to factory contract
- Test: Markets deploy successfully

#### Task 52: Add Loading Skeletons (1.5 hours)
- Replace spinners with skeletons
- Test: Loading looks professional

#### Task 53: Optimize Key Animations (1 hour)
- Add basic hover/focus animations
- Test: Animations are smooth

#### Task 54: Fix Mobile Navigation (1.5 hours)
- Ensure mobile menu works
- Test: Mobile navigation functions

#### Task 55: Add Search Functionality (2 hours)
- Basic market search
- Test: Search returns results

#### Task 56: Comprehensive Testing & Bug Fixes (2 hours)
- Test all functionality
- Fix critical bugs
- Test: Core features work

#### Task 57: Performance Optimization (1 hour)
- Bundle optimization
- Image optimization
- Test: App loads quickly

#### Task 58: SEO Basics (1 hour)
- Add meta tags
- Test: Pages have proper metadata

#### Task 59: Final UI Polish (1.5 hours)
- Color adjustments, spacing
- Test: UI looks professional

#### Task 60: Deploy & Demo Prep (30 min)
- Deploy to Vercel
- Prepare demo script
- Test: Production deployment works

## Success Criteria for Hackathon Demo

### Must Have (Core MVP):
1. **Market Display**: View markets with real-time data
2. **Trading**: Deposit into YES/NO positions
3. **Portfolio**: View positions and claim rewards
4. **Web3**: Wallet connection and transactions
5. **Responsive**: Works on mobile and desktop

### Nice to Have (Time Permitting):
1. **Market Creation**: Basic creation flow
2. **Charts**: Simple probability visualization
3. **Search**: Basic market search
4. **Analytics**: Basic user stats

### Demo Flow:
1. Connect wallet
2. Browse markets
3. Make a prediction (deposit)
4. View position in portfolio
5. (Optional) Create a market
6. Show mobile responsiveness

## Time Management Tips

### If Behind Schedule:
- Skip non-essential animations
- Use mock data instead of full GraphQL integration
- Simplify market creation to basic form
- Focus on core trading functionality

### If Ahead of Schedule:
- Add more chart types
- Implement real-time updates
- Add advanced filtering
- Polish animations and transitions

This focused plan prioritizes shipping a working demo over perfect polish, while maintaining the core value proposition of the prediction markets platform.