# **MVP Build Plan (Foundry) — Hyperliquid Parimutuel Prediction Markets**

> Ultra‑granular, single‑concern tasks with clear start/end and testable outcomes.
> 

> Run all commands from repo root unless noted. Use forge test -vvv for detailed traces.
> 

---

## **Phase 0 — Repo Bootstrap**

**Task 0.1 — Initialize Foundry repo**

- **Start:** Empty directory
- **End:** Foundry project scaffolding
- **Steps:**
    1. forge init (we're already in the desired directory)
    2. Add .env.example with RPC_URL, PRIVATE_KEY, CHAIN_ID, STAKE_TOKEN, HYPE_TOKEN, HL_STAKING, STHYPE, TREASURY, RESOLVER_EOA, DISPUTE_WINDOW
    3. Create src/, test/, script/ subfolders if missing
- **Verify:** forge build succeeds

**Task 0.2 — foundry.toml config**

- **Start:** Default foundry.toml
- **End:** Compiler + fmt settings set (solc 0.8.20)
- **Steps:** Set optimizer on, runs=200, evm_version=cancun, fmt rules
- **Verify:** forge fmt --check passes after formatting

**Task 0.3 — Commit baseline**

- **Start:** Untracked files
- **End:** Git commit “chore: init foundry project”
- **Verify:** git log -1 shows commit

---

## **Phase 1 — Access & Utils**

**Task 1.1 — Add access/Ownable.sol**

- **Start:** No access control
- **End:** Minimal Ownable with owner, onlyOwner, transferOwnership
- **Verify:** Compile; unit test later

**Task 1.2 — Add access/Pausable.sol**

- **Start:** None
- **End:** paused flag, setPaused(bool), notPaused modifier
- **Verify:** Compile

**Task 1.3 — Add access/ReentrancyGuard.sol**

- **Start:** None
- **End:** Simple guard using a uint flag
- **Verify:** Compile

**Task 1.4 — Add interfaces/IERC20.sol**

- **Start:** None
- **End:** Minimal ERC‑20 interface
- **Verify:** Compile

**Task 1.5 — Add interfaces/IERC20Permit.sol**

- **Start:** None
- **End:** EIP-2612 permit interface for gasless approvals
- **Verify:** Compile

**Task 1.6 — Add libs/SafeTransferLib.sol**

- **Start:** None
- **End:** Safe transfer, transferFrom, approve (returns bool or reverts)
- **Verify:** Compile

**Task 1.7 — Add libs/Clones.sol (EIP‑1167)**

- **Start:** None
- **End:** clone(impl) and cloneDeterministic(impl, salt) helpers
- **Verify:** Compile

**Task 1.8 — Tests for access libs (sanity)**

- **Start:** No tests
- **End:** test/Access.t.sol covering Ownable transfer and Pausable toggling
- **Verify:** forge test -m Access passes

---

## **Phase 2 — Shared Types**

**Task 2.1 — Add types/MarketParams.sol**

- **Start:** None
- **End:** Enums (SubjectKind, PredicateOp, WindowKind) + structs (SubjectParams, PredicateParams, WindowParams, OracleSpec, Economics, MarketParams with isProtocolMarket flag)
- **Verify:** Compile

**Task 2.2 — Enum/struct encoding test**

- **Start:** No tests
- **End:** test/Types.t.sol that constructs/destroys a MarketParams in memory; asserts fields
- **Verify:** forge test -m Types passes

---

## **Phase 3 — stHYPE LST (Liquid Staking Token)**

**Task 3.1 — Add interfaces/IHyperLiquidStaking.sol**

- **Start:** None
- **End:** Interface for HyperLiquid staking module (stake, unstake, getRewards)
- **Verify:** Compile

**Task 3.2 — Add interfaces/IstHYPE.sol**

- **Start:** None
- **End:** Interface for stHYPE with deposit, withdraw, exchangeRate, permit
- **Verify:** Compile

**Task 3.3 — Implement staking/stHYPE.sol skeleton**

- **Start:** None
- **End:** ERC20 + ERC20Permit contract shell with storage variables
- **Verify:** Compile

**Task 3.4 — Implement deposit(uint256 hypeAmount)**

- **Start:** Skeleton
- **End:** Transfer HYPE, stake with HL, mint stHYPE at exchange rate, emit event
- **Verify:** Unit test: deposits HYPE, receives correct stHYPE amount

**Task 3.5 — Implement withdraw(uint256 stHypeAmount)**

- **Start:** deposit() done
- **End:** Burn stHYPE, unstake from HL, transfer HYPE + rewards, emit event
- **Verify:** Unit test: withdraws correctly with rewards

**Task 3.6 — Implement exchangeRate()**

- **Start:** Basic functions done
- **End:** Returns (totalHYPE + rewards) / totalShares
- **Verify:** Unit test: rate increases with rewards

**Task 3.7 — Add permit functionality**

- **Start:** Basic ERC20
- **End:** EIP-2612 permit for gasless approvals
- **Verify:** Unit test: permit signature works

---

## **Phase 4 — Oracle (On‑chain)**

**Task 4.1 — Add interfaces/IOracle.sol & interfaces/IMarket.sol**

- **Start:** None
- **End:** IOracle{commit,finalize}; IMarket{ingestResolution}
- **Verify:** Compile

**Task 4.2 — Implement oracle/SimpleOracle.sol skeleton**

- **Start:** None
- **End:** Contract with storage for Pending, disputeWindow, resolvers map, events
- **Verify:** Compile

**Task 4.3 — Implement commit()**

- **Start:** Skeleton
- **End:** commit(market, outcome, dataHash) sets pending and emits event; gated by owner/resolvers
- **Verify:** Unit test: only resolver/owner can commit; pending set

**Task 4.4 — Implement finalize()**

- **Start:** commit() done
- **End:** Enforce block.timestamp >= commitTime + disputeWindow, call IMarket(market).ingestResolution(...), mark finalized
- **Verify:** Unit test: cannot finalize early; finalizes after window; re‑finalize reverts

**Task 4.5 — Resolver admin**

- **Start:** None
- **End:** setResolver(address,bool) with onlyOwner
- **Verify:** Unit test: only owner can toggle; reads reflect

---

## **Phase 5 — Market Logic (Implementation contract)**

**Task 5.1 — Create ParimutuelMarketImplementation.sol contract shell**

- **Start:** None
- **End:** Import access libs + interfaces; declare storage variables per spec
- **Verify:** Compile

**Task 5.2 — Add initialize(...)**

- **Start:** Shell
- **End:** Init all params once (with initialized guard), validate times/fee ranges/non‑zero addresses, set fixed fees (5% protocol, 10% creator share)
- **Verify:** Unit test: re‑init reverts; bad times/fees revert

**Task 5.3 — Implement deposit(outcome, amount)**

- **Start:** No deposits
- **End:** Enforce block.timestamp < cutoffTime, outcome ∈ {0,1}, amount>0, pool cap; transferFrom; update pools and user stakes; emit Deposited
- **Verify:** Unit tests:
    - Happy path deposits both sides
    - Revert after cutoff
    - Revert bad outcome
    - Revert zero amount
    - Revert if pool cap exceeded

**Task 5.4 — Implement ingestResolution(winningOutcome, dataHash)**

- **Start:** None
- **End:** onlyOracle, after resolveTime, not resolved, set state, emit Resolved
- **Verify:** Unit tests:
    - Only oracle can call
    - Before resolveTime reverts
    - Double resolve reverts

**Task 5.5 — Implement claim()**

- **Start:** None
- **End:** Require resolved + not claimed; compute fee once (first claimer) at 5% total, split 90% treasury/10% creator; compute pro‑rata payout; transfer winnings; mark claimed; emit Claimed
- **Verify:** Unit tests:
    - Two users on winning side get correct pro‑rata
    - One‑sided pool works (all to winners)
    - Claim twice reverts
    - Sum of payouts + fees == total pool (assert)

**Task 5.6 — View helpers**

- **Start:** None
- **End:** totalPool(), userInfo(address)
- **Verify:** Unit test: returns expected values

**Task 5.7 — (Optional) Emergency cancel**

- **Start:** None
- **End:** onlyOwner cancelAndRefund() before resolution: refunds stakes 1:1, marks terminal state; block deposits/claims afterwards
- **Verify:** Unit tests: cancel happy path; post‑cancel claim reverts

---

## **Phase 6 — Factory (Clones with stHYPE Gating)**

**Task 6.1 — Add MarketFactory.sol shell**

- **Start:** None
- **End:** Store stakeToken, stHYPE, treasury, oracle, implementation, STAKE_PER_MARKET constant; mappings for creator/locked stakes; events
- **Verify:** Compile

**Task 6.2 — Implement createMarket with stHYPE lock**

- **Start:** Shell
- **End:** Check approval, transfer 1000 stHYPE to factory, clone, initialize with fixed fees (5%/10% split), track creator/lock, emit events
- **Verify:** Unit tests:
    - Locks exactly 1000 stHYPE
    - Creates market with correct params
    - Flashloan protection (actual transfer required)

**Task 6.3 — Implement createMarketWithPermit**

- **Start:** Basic createMarket done
- **End:** Accept permit signature, call stHYPE.permit, then createMarket for gasless UX
- **Verify:** Unit test: single tx with permit works

**Task 6.4 — Implement createProtocolMarket**

- **Start:** User markets done
- **End:** Owner-only, no stHYPE required, sets isProtocolMarket flag
- **Verify:** Unit test: only owner can create, no stHYPE locked

**Task 6.5 — Implement releaseStake**

- **Start:** Creation done
- **End:** Check market resolved, transfer stHYPE back to creator, update tracking
- **Verify:** Unit test: releases after resolution, not before

---

## **Phase 7 — Scripts**

**Task 7.1 — script/DeployStHYPE.s.sol**

- **Start:** None
- **End:** Deploy stHYPE(HYPE_TOKEN, HL_STAKING), transfer ownership
- **Verify:** Deploy to testnet, verify exchange rate

**Task 7.2 — script/DeployOracle.s.sol**

- **Start:** None
- **End:** Broadcast deploy SimpleOracle(DISPUTE_WINDOW), set resolver from .env
- **Verify:** forge script ... --broadcast --verify dry‑run then deploy to testnet

**Task 7.3 — script/DeployFactory.s.sol**

- **Start:** None
- **End:** Deploy ParimutuelMarketImplementation, then MarketFactory(stakeToken, stHYPE, treasury, oracle), set implementation
- **Verify:** Deploy on testnet; record addresses

**Task 7.4 — script/CreateMarket.s.sol (Example A: HL volume)**

- **Start:** None
- **End:** Approve stHYPE, build MarketParams, call createMarket, print address
- **Verify:** Run script; confirm MarketCreated in tx logs

**Task 7.5 — script/CreateProtocolMarket.s.sol**

- **Start:** None
- **End:** Owner creates daily volume/price/TVL markets without stHYPE
- **Verify:** Run successfully

**Task 7.6 — script/CreateMarket_Price.s.sol (Example B: HYPE price)**

- **Start:** None
- **End:** Same as 6.3 for SNAPSHOT_AT predicate
- **Verify:** Run successfully

**Task 7.7 — script/PauseAndCancel.s.sol**

- **Start:** None
- **End:** Owner tool: pause/unpause market, optional cancel
- **Verify:** Dry‑run success

---

## **Phase 8 — Unit Tests (Behavioral)**

**Task 8.1 — stHYPE tests**

- **Start:** None
- **End:** test/stHYPE.t.sol testing deposit, withdraw, exchange rate, permit
- **Verify:** forge test -m stHYPE

**Task 8.2 — Deposit window tests**

- **Start:** Basic tests exist
- **End:** In Market.t.sol, assert: before cutoff OK; after cutoff reverts
- **Verify:** forge test -m DepositWindow

**Task 8.3 — Fee skim once**

- **Start:** None
- **End:** Two winners claim; assert fee transferred once and not on second claim
- **Verify:** forge test -m FeeSkimOnce

**Task 8.4 — Payout math correctness**

- **Start:** None
- **End:** 3 users distribution; compare exact pro‑rata values with 5% fee (90% treasury, 10% creator); include 0‑decimals and 2‑decimals stake token variants
- **Verify:** forge test -m PayoutMath

**Task 8.5 — One‑sided pool**

- **Start:** None
- **End:** Only YES staked; resolve YES; winners receive total‑fee; NO users get 0
- **Verify:** forge test -m OneSided

**Task 8.6 — Oracle timing**

- **Start:** None
- **End:** commit allowed at/after tEnd; finalize only after window; ingestResolution before tEnd reverts
- **Verify:** forge test -m OracleTiming

**Task 8.7 — Access guards**

- **Start:** None
- **End:** Only oracle may resolve; only owner can pause; non‑owner can’t set params
- **Verify:** forge test -m AccessGuards

**Task 8.8 — Cancel flow (if implemented)**

- **Start:** None
- **End:** Cancel before resolve refunds; post‑cancel deposits/claims disabled
- **Verify:** forge test -m CancelRefund

**Task 8.9 — Factory stHYPE gating**

- **Start:** None
- **End:** Test stHYPE lock/release, flashloan protection, protocol markets bypass
- **Verify:** forge test -m FactoryStaking

---

## **Phase 9 — Fuzz & Invariants**

**Task 9.1 — Fuzz payouts**

- **Start:** None
- **End:** Randomized stakes on both sides; resolve YES and NO cases; assert: sum(payouts) + fees == totalPool
- **Verify:** forge test -m Fuzz_Payouts

**Task 9.2 — Invariants**

- **Start:** None
- **End:** Invariant tests:
    - No deposit after cutoff
    - Claim before resolve reverts
    - FeeCollected ≤ totalPool and set once
    - stHYPE locked = activeMarkets * 1000
    - Protocol markets don't lock stHYPE
- **Verify:** forge test -m Invariants

---

## **Phase 10 — Local "Manual" Integration**

**Task 10.1 — Mock tokens**

- **Start:** None
- **End:** MockERC20.sol, MockHYPE.sol, MockHyperLiquidStaking.sol
- **Verify:** Unit tests mint/spend

**Task 10.2 — End‑to‑end happy path with stHYPE**

- **Start:** Pieces exist
- **End:** Test that deploys oracle + factory + market; users deposit; advance time; commit + finalize; users claim
- **Verify:** forge test -m E2E_HappyPath passes

---

## **Phase 10 — Testnet Smoke**

**Task 10.1 — Deploy oracle & factory to testnet**

- **Start:** Config prepared
- **End:** On testnet, deployed addresses recorded in README
- **Verify:** cast code shows non‑empty; events visible on explorer

**Task 10.2 — Create two example markets**

- **Start:** Scripts ready
- **End:** One HL volume, one HYPE price; addresses recorded
- **Verify:** MarketCreated events emitted

**Task 10.3 — Dry‑run deposits**

- **Start:** Test wallets funded with stake token
- **End:** Two wallets deposit on opposite sides
- **Verify:** Deposited events; balances updated

**Task 10.4 — Resolve & claim demo**

- **Start:** Await tEnd (or set short times)
- **End:** commit + finalize; both wallets claim; fee arrives to treasury + creator
- **Verify:** On‑chain balances reflect payouts; events emitted

---

## **Phase 11 — Docs & Guardrails**

**Task 11.1 — README usage section**

- **Start:** Placeholder README
- **End:** Steps: deploy, create market, deposit, resolve, claim; Subject/Predicate/Window explanation
- **Verify:** Teammate can follow README and reproduce on local/testnet

**Task 11.2 — Risk notes**

- **Start:** None
- **End:** Document dispute window, oracle failure behavior, emergency cancel, fee policy, cutoff semantics, tie semantics
- **Verify:** README updated; reviewed for clarity

**Task 11.3 — Lint/format pass**

- **Start:** Mixed formatting
- **End:** forge fmt applied; forge build clean
- **Verify:** CI (optional) or local checks pass

---

## **Phase 12 — Nice‑to‑Have (Time Permitting)**

**Task 12.1 — CREATE2 deterministic markets**

- **End:** Factory uses cloneDeterministic with salt = keccak256(creator, resolveTime, subject)
- **Verify:** Address matches precomputed; add test

**Task 12.2 — Per‑market pause toggles**

- **End:** Ensure owner can setPaused(true) on market; test that deposit reverts when paused
- **Verify:** Test passes

**Task 12.3 — Indexer events doc**

- **End:** List all events and indexed fields for subgraph
- **Verify:** README “Indexing” section present

---

### **Runbook Summary (what to run frequently)**

- Build: forge build
- Unit tests: forge test
- Specific test: forge test -m <Name>
- Deploy oracle: forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --broadcast
- Deploy factory: forge script script/DeployFactory.s.sol --rpc-url $RPC_URL --broadcast
- Create market: forge script script/CreateMarket.s.sol --rpc-url $RPC_URL --broadcast

---

This plan keeps every step single‑concern and verifiable so you (or an engineering LLM) can execute task‑by‑task and you can validate progress after each one.