# **Hyperliquid Prediction Markets — Smart Contracts Repo Architecture (Foundry)**

> Minimal, safe, hackathon‑ready parimutuel binary markets with stHYPE-gated creation, per‑market clones, simple oracle, and creator fee sharing.
> 

---

## **0. Tech Stack & Assumptions**

- **Language:** Solidity ^0.8.20
- **Tooling:** Foundry (forge + cast), git
- **Pattern:** EIP‑1167 **minimal proxy clones** per market (Clones lib)
- **Token:** Single ERC‑20 stake token (e.g., USDC) for deposits, fees, payouts
- **Staking:** stHYPE LST (Liquid Staking Token) - 1000 stHYPE locked per market created
- **Oracle:** Trusted **SimpleOracle** with short dispute window (commit → finalize)
- **Access Control:** Ownable (owner = protocol multisig during demo, your EOA if needed)
- **Security knobs:** ReentrancyGuard, Pausable, per‑market pool cap, emergency cancel, flashloan protection

---

## **1. Repo Layout (Files & Folders)**

```
.
├── foundry.toml
├── .env.example
├── script/
│   ├── DeployStHYPE.s.sol
│   ├── DeployFactory.s.sol
│   ├── DeployOracle.s.sol
│   ├── CreateMarket.s.sol
│   ├── CreateProtocolMarket.s.sol
│   ├── PauseAndCancel.s.sol
│   └── utils/Broadcast.s.sol
├── src/
│   ├── staking/
│   │   ├── stHYPE.sol              // LST token with exchange rate
│   │   └── IHyperLiquidStaking.sol // Interface to HL staking module
│   ├── MarketFactory.sol
│   ├── ParimutuelMarketImplementation.sol
│   ├── oracle/
│   │   └── SimpleOracle.sol
│   ├── access/
│   │   ├── Ownable.sol
│   │   ├── Pausable.sol
│   │   └── ReentrancyGuard.sol
│   ├── interfaces/
│   │   ├── IERC20.sol
│   │   ├── IERC20Permit.sol       // EIP-2612 for gasless approvals
│   │   ├── IstHYPE.sol            // stHYPE interface
│   │   ├── IMarket.sol
│   │   ├── IOracle.sol
│   │   └── IClones.sol            // or use OpenZeppelin's Clones port
│   ├── libs/
│   │   ├── Clones.sol             // minimal proxy
│   │   └── SafeTransferLib.sol    // safe ERC20 ops
│   └── types/
│       └── MarketParams.sol       // structs/enums shared by Factory & Market
├── test/
│   ├── stHYPE.t.sol
│   ├── Market.t.sol
│   ├── Factory.t.sol
│   ├── Oracle.t.sol
│   ├── Fuzz_Payouts.t.sol
│   ├── Invariants.t.sol
│   └── mocks/
│       ├── MockERC20.sol
│       ├── MockHYPE.sol
│       ├── MockHyperLiquidStaking.sol
│       └── MockOracleResolver.s.sol
└── README.md
```

---

## **2. Contracts & Responsibilities**

### **2.1**

### **src/types/MarketParams.sol**

- **Purpose:** Source of truth for **Subject × Predicate × Window** model and economics.
- **Contains:**
    - enum SubjectKind { HL_METRIC, TOKEN_PRICE }
    - enum PredicateOp { GT, GTE, LT, LTE }
    - enum WindowKind { SNAPSHOT_AT, WINDOW_SUM, WINDOW_COUNT }
    - struct SubjectParams { SubjectKind kind; bytes32 metricId; address token; uint8 valueDecimals; }
    - struct PredicateParams { PredicateOp op; int256 threshold; }
    - struct WindowParams { WindowKind kind; uint64 tStart; uint64 tEnd; }
    - struct OracleSpec { bytes32 primarySourceId; bytes32 fallbackSourceId; uint8 roundingDecimals; }
    - struct Economics { uint16 feeBps; uint16 creatorFeeShareBps; uint256 maxTotalPool; }
    - struct MarketParams { string title; string description; SubjectParams subject; PredicateParams predicate; WindowParams window; OracleSpec oracle; uint64 cutoffTime; address creator; Economics econ; bool isProtocolMarket; }

> Why separate file?
> 

---

### **2.2**

### **src/access/***

- **Ownable.sol:** owner state, onlyOwner, transferOwnership.
- **Pausable.sol:** paused flag, setPaused(bool), notPaused modifier.
- **ReentrancyGuard.sol:** simple non‑reentrant guard (uint flag).

> State lives here:
> 

---

### **2.3**

### **src/libs/***

- **Clones.sol:** EIP‑1167 minimal proxy library (clone(address implementation) and cloneDeterministic(address, bytes32)).
- **SafeTransferLib.sol:** safeTransfer, safeTransferFrom, safeApprove supporting non‑standard ERC‑20s.

---

### **2.4**

### **src/interfaces/***

- **IERC20.sol** – standard minimal ERC‑20.
- **IOracle.sol** – commit(address market, uint8 outcome, bytes32 dataHash), finalize(address market).
- **IMarket.sol** – ingestResolution(uint8 outcome, bytes32 dataHash), getters for UI/indexer.

---

### **2.5**

### **src/staking/stHYPE.sol**

**Role:** **Liquid Staking Token** for HYPE that enables market creation.

- **State:**
    - uint256 totalHYPEStaked; // Total HYPE deposited
    - uint256 totalShares; // Total stHYPE minted
    - address hyperLiquidStaking; // HL official staking module
    - mapping(address => uint256) shares; // stHYPE balances
- **Key functions:**
    - deposit(uint256 hypeAmount) → mints stHYPE at current exchange rate
    - withdraw(uint256 stHypeAmount) → burns stHYPE, returns HYPE + rewards
    - exchangeRate() → (totalHYPE + rewards) / totalShares
    - permit(...) → EIP-2612 for gasless approvals
- **Integration:**
    - Stakes HYPE with HyperLiquid official module on deposit
    - Unstakes on withdrawal
    - Accrues staking rewards automatically via exchange rate
- **Events:**
    - Deposited(user, hypeAmount, stHypeAmount)
    - Withdrawn(user, stHypeAmount, hypeAmount)

---

### **2.6**

### **src/oracle/SimpleOracle.sol**

**Role:** **Resolver** with optimistic, two‑step finalize.

- **State:**
    - mapping(address => Pending) where Pending{ uint8 outcome; bytes32 dataHash; uint64 commitTime; bool committed; bool finalized; }
    - uint64 disputeWindow
    - mapping(address => bool) resolvers (authorized bots/signers)
- **Flow:**
    1. commit(market, outcome, dataHash) by resolver/owner at tEnd (or slightly after).
    2. Wait disputeWindow seconds.
    3. finalize(market) callable by anyone → calls IMarket(market).ingestResolution(outcome, dataHash).
- **Access:** Owner manages resolvers.
- **Events:** Committed, Finalized.

> Where state lives:
> 
> 
> **pending resolutions**
> 
> **market**
> 

---

### **2.7**

### **src/ParimutuelMarketImplementation.sol**

**Role:** **Logic** for one parimutuel binary market (YES/NO). Cloned per market.

- **Immutable‑like params (set via initialize)**
    
    (Stored as regular storage since we use clones)
    
    - IERC20 stakeToken;
    - address treasury;
    - address creator;
    - address oracle;
    - uint64 cutoffTime;
    - uint64 resolveTime;
    - uint16 feeBps; // Fixed at 500 (5%)
    - uint16 creatorFeeShareBps; // Fixed at 1000 (10% of protocol fee)
    - uint256 maxTotalPool;
    - bytes32 subject; bytes32 predicate; bytes32 windowSpec; (opaque UI labels)
- **Mutable state**
    - uint256[2] pool; // pool[0]=NO, pool[1]=YES
    - mapping(address => uint256[2]) stakeOf;
    - bool resolved; uint8 winningOutcome; bytes32 resolutionDataHash;
    - uint256 feeCollected;
    - mapping(address => bool) claimed;
- **Key functions**
    - initialize(...) – **one‑time** initializer (guarded to prevent re‑init)
    - deposit(uint8 outcome, uint256 amount) – before cutoffTime, notPaused, nonReentrant
    - ingestResolution(uint8 outcome, bytes32 dataHash) – only oracle, after resolveTime, marks final result
    - claim() – pro‑rata payout; first claimer pulls fee and splits to treasury/creator
    - **(optional)** cancelAndRefund() – onlyOwner emergency path if oracle breaks (refunds stakes)
    - View helpers: totalPool(), userInfo(address)
- **Events**
    - Deposited(user, outcome, amount)
    - Resolved(outcome, dataHash)
    - Claimed(user, payout)
    - Skimmed(treasury, creator, treasuryFee, creatorFee)

> Where state lives:
> 
> 
> **All user stakes & resolution**
> 
> **inside each market clone**
> 

---

### **2.8**

### **src/MarketFactory.sol**

**Role:** Deploy markets as **clones** with stHYPE-gated creation and automatic stake management.

- **State:**
    - IERC20 stakeToken;
    - IstHYPE stHYPE;
    - address treasury;
    - address oracle;
    - address implementation;
    - uint256 constant STAKE_PER_MARKET = 1000e18; // 1000 stHYPE per market
    - mapping(address => address) marketCreator; // market → creator
    - mapping(address => uint256) creatorLockedStake; // creator → locked stHYPE
    - mapping(address => bool) protocolMarkets; // protocol-created markets
- **Functions:**
    - createMarket(MarketParams p) → locks stHYPE → clones → initializes → emit
    - createMarketWithPermit(MarketParams p, deadline, v, r, s) → gasless approval + create
    - createProtocolMarket(MarketParams p) → owner-only, no stHYPE required
    - releaseStake(address market) → returns stHYPE to creator after resolution
    - setTreasury, setOracle, setImplementation (owner‑only)
- **Clean UX Flow:**
    1. Check stHYPE balance & approval
    2. Lock 1000 stHYPE (transfer to factory)
    3. Deploy clone & initialize
    4. Track creator & locked amount
    5. Auto-release on market resolution
- **Events:**
    - MarketCreated(address indexed market, address indexed creator, bytes32 subject, bytes32 predicate, bytes32 windowSpec, bool isProtocolMarket)
    - StakeLocked(address indexed creator, address indexed market, uint256 amount)
    - StakeReleased(address indexed creator, address indexed market, uint256 amount)

> Where state lives:
> 
> 
> **addresses**
> 
> **events**
> 
> **no funds**
> 

---

## **3. Script Layer (**

## **script/**

## **)**

- **DeployStHYPE.s.sol**
    - Deploy stHYPE(hyperLiquidStaking)
    - Transfer ownership to multisig
- **DeployOracle.s.sol**
    - Deploy SimpleOracle(disputeWindow)
    - Set resolver (your bot EOA)
- **DeployFactory.s.sol**
    - Deploy ParimutuelMarketImplementation
    - Deploy MarketFactory(stakeToken, stHYPE, treasury, oracle)
    - factory.setImplementation(impl)
- **CreateMarket.s.sol**
    - Approve stHYPE if needed
    - Example params (HL volume, HYPE price)
    - Calls createMarket(p) and prints address
- **CreateProtocolMarket.s.sol**
    - Owner creates protocol markets without stHYPE
    - Daily volume, price snapshots, TVL targets
- **PauseAndCancel.s.sol**
    - Owner utility to pause a market or call emergency cancelAndRefund()

> Broadcast utils
> 

---

## **4. Tests (**

## **test/**

## **)**

- **Market.t.sol**
    - Happy path: deposit both sides → cutoff enforced → oracle resolve → claim payouts → fee split
    - One‑sided pool
    - Tiny pools & precision tests
    - Reentrancy checks
- **stHYPE.t.sol**
    - Deposit/withdraw HYPE
    - Exchange rate updates with rewards
    - Permit functionality
- **Factory.t.sol**
    - Clone works, params set, events emitted
    - stHYPE lock/release mechanics
    - Flashloan protection (requires actual transfer)
    - Protocol vs user markets
- **Oracle.t.sol**
    - Commit then finalize after window
    - Prevent re‑commit during pending
    - Only resolvers can commit
- **Fuzz_Payouts.t.sol**
    - Random distributions in pools, invariant: **sum of all payouts + fees = total pool**
- **Invariants.t.sol**
    - No deposits after cutoff
    - No claims before resolution
    - Single fee skim total
- **mocks/**
    - MockERC20.sol for stake token
    - MockOracleResolver.s.sol to simulate commit/finalize in unit tests

---

## **5. State Model & Connections**

### **Storage Boundaries**

- **Per Market (clone):**
    - Pools (YES/NO), per‑user stakes, resolution flags, fee accounting
- **Oracle:**
    - Pending commits per market (temporary), dispute window
- **Factory:**
    - Global addresses (token, stHYPE, oracle, treasury), implementation
    - Locked stHYPE per creator
    - Market creator registry
- **stHYPE:**
    - Total HYPE staked with HyperLiquid
    - Exchange rate (increases with rewards)
    - User share balances

### **How Services Connect**

```
[Frontend / Creator UI]
      │  stake HYPE → get stHYPE
      │  approve/permit stHYPE
      │  createMarket(p)
      ▼
[ stHYPE ] <--locks 1000--> [ MarketFactory ] --clones--> [ ParimutuelMarket clone ]
      ▲                              │
      │ events                       │ deposit/claim
      │                              ▼
      │                         [ Users ]
      │
      └──(resolver reads params for T)──► [ Oracle Runner (backend) ]
                                   │
                  commit(outcome, dataHash) / finalize()
                                   │
                                   ▼
                         [ SimpleOracle ]
                                   │  ingestResolution()
                                   ▼
                      [ ParimutuelMarket clone ]
```

---

## **6. foundry.toml & Env**

**foundry.toml**

```
[profile.default]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
libs = ["lib"]
src = "src"
test = "test"
out = "out"
evm_version = "cancun"
ffi = false

[fmt]
line_length = 100
tab_width = 4
bracket_spacing = true
```

**.env.example**

```
RPC_URL=https://...
PRIVATE_KEY=0x...
CHAIN_ID=...
STAKE_TOKEN=0x...     # e.g., USDC on HyperEVM
HYPE_TOKEN=0x...      # HYPE token address
HL_STAKING=0x...      # HyperLiquid staking module
STHYPE=0x...          # Deployed stHYPE address
TREASURY=0x...
RESOLVER_EOA=0x...
DISPUTE_WINDOW=600
```

---

## **7. Safety & Upgrade Notes**

- **Isolation:** Per‑market clones limit blast radius.
- **Pausable:** Pause a misbehaving market immediately.
- **Emergency cancel:** Owner‑only refund if oracle is unavailable (documented and demo‑only).
- **Fee structure:** Fixed 5% protocol fee, creators get 10% of protocol fee (0.5% total).
- **Flashloan protection:** stHYPE locked in factory during market lifetime.
- **Stake requirements:** 1000 stHYPE per market (protocol markets exempt).
- **No upgrades on clones:** Treat the **implementation** as immutable for hackathon. If logic changes, deploy a new implementation and point the Factory at it for *new* markets.
- **Treasury key:** Use a multisig if possible; otherwise keep funds in market contracts until claim.

---

## **8. What to Document in README**

- **How markets work** (parimutuel, cutoff, resolution, fees)
- **stHYPE staking** (deposit HYPE, get stHYPE, 1000 per market)
- **Subject / Predicate / Window** spec
- **Dispute window** & snapshot hashing
- **Create a market** (stake → approve → create flow)
- **Oracle runner** (how it schedules commit/finalize; snapshot JSON)
- **Risk notices** (oracle failure, emergency cancel, fee policy)

---

## **9. Minimal ABIs/Events for Indexer**

- **stHYPE**
    - event Deposited(address indexed user, uint256 hypeAmount, uint256 stHypeAmount);
    - event Withdrawn(address indexed user, uint256 stHypeAmount, uint256 hypeAmount);
- **Factory**
    - event MarketCreated(address indexed market, address indexed creator, bytes32 subject, bytes32 predicate, bytes32 windowSpec, bool isProtocolMarket);
    - event StakeLocked(address indexed creator, address indexed market, uint256 amount);
    - event StakeReleased(address indexed creator, address indexed market, uint256 amount);
- **Market**
    - event Deposited(address indexed user, uint8 outcome, uint256 amount);
    - event Resolved(uint8 winningOutcome, bytes32 dataHash);
    - event Claimed(address indexed user, uint256 payout);
    - event Skimmed(address treasury, address creator, uint256 treasuryFee, uint256 creatorFee);
- **Oracle**
    - event Committed(address indexed market, uint8 outcome, bytes32 dataHash, uint64 commitTime);
    - event Finalized(address indexed market, uint8 outcome);

---

## **10. Next Steps (build order)**

1. **Implement** types/MarketParams.sol, access libs, SafeTransferLib.
2. **Build** stHYPE.sol LST with HyperLiquid staking integration.
3. **Write** ParimutuelMarketImplementation.sol with initialize.
4. **Build** SimpleOracle.sol.
5. **Build** MarketFactory.sol with stHYPE-gated clone deployment.
6. **Unit tests**: stHYPE → Market → Oracle → Factory; fuzz payouts.
7. **Scripts**: DeployStHYPE, DeployOracle, DeployFactory, CreateMarket (user + protocol).
8. **README**: staking flow, usage + demo steps.

---

**This structure gives you a clean, auditable codebase with stHYPE-gated creation, composable LST, and protocol markets - ready to become a core DeFi primitive on HyperEVM.**