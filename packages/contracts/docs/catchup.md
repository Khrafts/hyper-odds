# Time Decay Implementation Catchup Plan

This plan outlines the steps to implement the time decay mechanism in HyperOdds prediction markets to solve the last-minute sniping problem.

## Overview

Currently, our markets use standard parimutuel betting where all depositors get equal shares regardless of timing. We need to implement time decay multipliers that reward early depositors and penalize late snipers.

## Target Implementation

- **Early depositors**: Get bonus multipliers (up to 1.25x)
- **Late depositors**: Get penalty multipliers (down to 0.75x)
- **Configurable decay**: `timeDecayBps` parameter (0-5000, max 50% spread)
- **Backward compatible**: `timeDecayBps = 0` disables decay

## Implementation Tasks

### Phase 1: Core Contract Updates

#### Task 1.1: Update MarketParams.sol
**File**: `src/types/MarketParams.sol`
**Changes**:
- Add `uint16 timeDecayBps` field to `Economics` struct
- Add validation in factory (max 5000 = 50% spread)

#### Task 1.2: Update ParimutuelMarketImplementation.sol  
**File**: `src/ParimutuelMarketImplementation.sol`
**Changes**:
- Add `timeDecayBps` storage variable
- Add `totalEffectiveStakes[2]` array for tracking effective stakes per outcome
- Add `userEffectiveStakes[address][2]` mapping
- Implement `_calculateTimeMultiplier()` function
- Update `deposit()` to calculate and store effective stakes
- Update `claim()` to use effective stakes for payout calculation
- Update `emergencyClaim()` to handle effective stakes in cancellation

#### Task 1.3: Update MarketFactory.sol
**File**: `src/MarketFactory.sol`  
**Changes**:
- Pass `timeDecayBps` from MarketParams to market initialization
- Add validation for timeDecayBps ≤ 5000

### Phase 2: Testing Infrastructure

#### Task 2.1: Create TimeDecay.t.sol
**File**: `test/TimeDecay.t.sol`
**Test Coverage**:
- Time multiplier calculation accuracy
- Effective stakes tracking
- Proportional payouts with decay
- Zero decay mode (backward compatibility)
- Maximum decay bounds (5000 bps)
- Early vs late depositor advantage
- Cancellation refunds with effective stakes
- Edge cases (deposits at exact cutoff, etc.)

#### Task 2.2: Update Existing Tests
**Files**: `test/Market.t.sol`, `test/Factory.t.sol`
**Changes**:
- Add timeDecayBps parameter to test market creation
- Update payout assertions to account for effective stakes
- Test both zero-decay and decay-enabled scenarios

#### Task 2.3: Add Fuzz Tests
**File**: `test/FuzzInvariant.t.sol`
**Coverage**:
- Random timeDecayBps values (0-5000)
- Random deposit timings
- Invariant: sum(effective_payouts) + fees = total_pool
- Invariant: effective_stakes ≤ actual_stakes

### Phase 3: Deployment Scripts

#### Task 3.1: Update CreateMarket Scripts
**Files**: `script/CreateMarket.s.sol`, `script/CreateProtocolMarket.s.sol`
**Changes**:
- Add timeDecayBps to example market parameters
- Default to 2500 (25% spread) for demonstration

#### Task 3.2: Update Factory Deployment
**File**: `script/DeployFactory.s.sol`
**Changes**:
- Ensure new implementation supports timeDecayBps
- Test deployment with decay-enabled markets

### Phase 4: Documentation & Integration

#### Task 4.1: Update Architecture Documentation
**File**: `docs/architecture.md`
**Changes**:
- Add time decay mechanism explanation
- Update market lifecycle with effective stakes
- Document multiplier formula and examples

#### Task 4.2: Update README
**File**: `README.md`
**Changes**:
- Add time decay feature to contract descriptions
- Update usage examples with timeDecayBps
- Add anti-sniping benefits to architecture section

#### Task 4.3: API Documentation
**New File**: `docs/time-decay-api.md`
**Content**:
- Detailed API for time decay functions
- Integration guide for frontend
- Event definitions for effective stakes

### Phase 5: Integration Testing

#### Task 5.1: End-to-End Testing
**File**: `test/E2E.t.sol`
**Updates**:
- Create decay-enabled market
- Simulate early and late deposits
- Verify payout advantages
- Test full lifecycle with time decay

#### Task 5.2: Gas Optimization
**Analysis**:
- Measure gas costs vs baseline
- Optimize effective stakes calculations
- Ensure <10k gas overhead per deposit

#### Task 5.3: Testnet Deployment
**Environment**: Arbitrum Sepolia
**Steps**:
- Deploy updated contracts
- Create time decay test markets
- Verify multiplier calculations on-chain
- Test frontend integration

## Implementation Details

### Time Multiplier Formula
```solidity
function _calculateTimeMultiplier(uint64 depositTime) internal view returns (uint256) {
    if (timeDecayBps == 0) return 10000; // No decay
    
    uint256 timeRemaining = cutoffTime > depositTime ? cutoffTime - depositTime : 0;
    uint256 totalTime = cutoffTime - block.timestamp; // Time at market creation
    uint256 timeRatio = totalTime > 0 ? (timeRemaining * 10000) / totalTime : 0;
    
    uint256 halfSpread = timeDecayBps / 2;
    return 10000 - halfSpread + (timeRatio * timeDecayBps) / 10000;
}
```

### Effective Stakes Storage
```solidity
mapping(address => uint256[2]) public userEffectiveStakes;
uint256[2] public totalEffectiveStakes;
```

### Updated Payout Logic
```solidity
uint256 userEffectiveStake = userEffectiveStakes[msg.sender][winningOutcome];
uint256 totalWinningEffectiveStakes = totalEffectiveStakes[winningOutcome];
// Payout = (userEffectiveStake / totalWinningEffectiveStakes) * availablePool
```

## Success Criteria

- [ ] All existing tests pass with timeDecayBps = 0
- [ ] New tests demonstrate sniping prevention
- [ ] Gas costs increase <15% from baseline
- [ ] Backward compatibility maintained
- [ ] Frontend can display effective stakes
- [ ] Testnet deployment successful

## Risk Mitigation

1. **Regression Testing**: Extensive test coverage for zero-decay mode
2. **Bounded Parameters**: Hard limit of 5000 bps (50% max spread)
3. **Gradual Rollout**: Deploy with conservative 2500 bps default
4. **Emergency Controls**: Existing pause/cancel mechanisms still work
5. **Gas Monitoring**: Track costs and optimize if needed

## Timeline

- **Week 1**: Tasks 1.1-1.3 (Core contracts)
- **Week 2**: Tasks 2.1-2.3 (Testing)
- **Week 3**: Tasks 3.1-4.3 (Scripts & docs)
- **Week 4**: Tasks 5.1-5.3 (Integration & deployment)

This implementation will solve the timing game problem while maintaining all existing functionality and adding minimal complexity.