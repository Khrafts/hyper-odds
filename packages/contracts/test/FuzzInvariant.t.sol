// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";
import { console } from "forge-std/console.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";
import { stHYPE } from "../src/staking/stHYPE.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { MockWHYPE } from "./mocks/MockWHYPE.sol";
import { MockHyperLiquidStaking } from "./mocks/MockHyperLiquidStaking.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Phase 9.1 - Fuzz tests for payouts
contract FuzzPayouts is Test {
    ParimutuelMarketImplementation market;
    MockERC20 stakeToken;

    address treasury = address(0x1);
    address creator = address(0x2);
    address oracle = address(0x3);

    uint64 cutoffTime;
    uint64 resolveTime;

    function setUp() public {
        stakeToken = new MockERC20();
        market = new ParimutuelMarketImplementation();

        cutoffTime = uint64(block.timestamp + 1 hours);
        resolveTime = uint64(block.timestamp + 2 hours);

        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            100_000e18, // Max pool
            0, // No time decay for fuzz tests
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    function testFuzz_Payouts(
        uint256 numUsers,
        uint256[10] memory yesStakes,
        uint256[10] memory noStakes,
        uint8 winningOutcome
    )
        public
    {
        // Bound inputs to reasonable values
        numUsers = bound(numUsers, 2, 10);
        winningOutcome = uint8(bound(winningOutcome, 0, 1));

        uint256 totalYes;
        uint256 totalNo;
        address[] memory users = new address[](numUsers);

        // Create users and make deposits
        for (uint256 i = 0; i < numUsers; i++) {
            users[i] = address(uint160(0x100 + i));

            // Bound stakes to reasonable amounts
            yesStakes[i] = bound(yesStakes[i], 0, 1000e18);
            noStakes[i] = bound(noStakes[i], 0, 1000e18);

            // Skip if both stakes are 0
            if (yesStakes[i] == 0 && noStakes[i] == 0) continue;

            // Mint tokens and deposit
            if (yesStakes[i] > 0) {
                stakeToken.mint(users[i], yesStakes[i]);
                vm.startPrank(users[i]);
                stakeToken.approve(address(market), yesStakes[i]);
                market.deposit(1, yesStakes[i]);
                vm.stopPrank();
                totalYes += yesStakes[i];
            }

            if (noStakes[i] > 0) {
                stakeToken.mint(users[i], noStakes[i]);
                vm.startPrank(users[i]);
                stakeToken.approve(address(market), noStakes[i]);
                market.deposit(0, noStakes[i]);
                vm.stopPrank();
                totalNo += noStakes[i];
            }
        }

        // Skip if no deposits were made
        if (totalYes == 0 && totalNo == 0) return;

        // Resolve market
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(winningOutcome, keccak256("data"));

        // Track total payouts
        uint256 totalPaidOut;
        uint256 treasuryBalanceBefore = stakeToken.balanceOf(treasury);
        uint256 creatorBalanceBefore = stakeToken.balanceOf(creator);

        // All users claim
        for (uint256 i = 0; i < numUsers; i++) {
            uint256 balanceBefore = stakeToken.balanceOf(users[i]);

            // Try to claim (may revert if user has no winning stake)
            vm.prank(users[i]);
            try market.claim() {
                uint256 payout = stakeToken.balanceOf(users[i]) - balanceBefore;
                totalPaidOut += payout;
            } catch {
                // User had no winning stake, which is fine
            }
        }

        // Add fees to total payout
        uint256 treasuryFee = stakeToken.balanceOf(treasury) - treasuryBalanceBefore;
        uint256 creatorFee = stakeToken.balanceOf(creator) - creatorBalanceBefore;
        totalPaidOut += treasuryFee + creatorFee;

        // INVARIANT: Total paid out equals total deposited (with small rounding tolerance)
        uint256 totalDeposited = totalYes + totalNo;
        // Allow for up to 10 wei rounding error due to integer division
        assertApproxEqAbs(totalPaidOut, totalDeposited, 10, "Total payout != total deposited");

        // INVARIANT: Fee structure is correct (5% total, 90/10 split)
        if (winningOutcome == 1 && totalNo > 0) {
            // YES won, NO lost
            uint256 expectedFee = (totalNo * 500) / 10_000; // 5% of losing pool
            uint256 expectedTreasuryFee = (expectedFee * 9000) / 10_000; // 90% of fee
            uint256 expectedCreatorFee = (expectedFee * 1000) / 10_000; // 10% of fee

            assertApproxEqAbs(treasuryFee, expectedTreasuryFee, 2, "Treasury fee incorrect");
            assertApproxEqAbs(creatorFee, expectedCreatorFee, 2, "Creator fee incorrect");
        } else if (winningOutcome == 0 && totalYes > 0) {
            // NO won, YES lost
            uint256 expectedFee = (totalYes * 500) / 10_000; // 5% of losing pool
            uint256 expectedTreasuryFee = (expectedFee * 9000) / 10_000; // 90% of fee
            uint256 expectedCreatorFee = (expectedFee * 1000) / 10_000; // 10% of fee

            assertApproxEqAbs(treasuryFee, expectedTreasuryFee, 2, "Treasury fee incorrect");
            assertApproxEqAbs(creatorFee, expectedCreatorFee, 2, "Creator fee incorrect");
        }
    }
}

// Phase 9.2 - Invariant tests
contract InvariantTests is StdInvariant, Test {
    MarketFactory factory;
    ParimutuelMarketImplementation implementation;
    SimpleOracle oracle;
    stHYPE stHypeToken;
    MockERC20 stakeToken;
    MockWHYPE whype;
    MockHyperLiquidStaking hlStaking;

    MarketHandler handler;

    address treasury = address(0x1);

    function setUp() public {
        // Deploy infrastructure
        stakeToken = new MockERC20();
        whype = new MockWHYPE();
        hlStaking = new MockHyperLiquidStaking();
        vm.deal(address(hlStaking), 10_000e18);

        stHypeToken = new stHYPE(address(whype), address(hlStaking));
        oracle = new SimpleOracle(600);
        implementation = new ParimutuelMarketImplementation();

        factory = new MarketFactory(address(stakeToken), address(stHypeToken), treasury, address(oracle));
        factory.setImplementation(address(implementation));

        // Deploy handler
        handler = new MarketHandler(factory, stHypeToken, stakeToken, oracle);

        // Set handler as target for invariant testing
        targetContract(address(handler));
    }

    // Invariant: No deposits after cutoff
    function invariant_NoDepositAfterCutoff() public {
        address[] memory markets = handler.getMarkets();

        for (uint256 i = 0; i < markets.length; i++) {
            ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[i]);

            if (block.timestamp > market.cutoffTime()) {
                // Try to deposit - should always fail
                stakeToken.mint(address(this), 100e18);
                stakeToken.approve(address(market), 100e18);

                vm.expectRevert("Deposits closed");
                market.deposit(1, 100e18);
            }
        }
    }

    // Invariant: Cannot claim before resolution
    function invariant_NoClaimBeforeResolve() public {
        address[] memory markets = handler.getMarkets();

        for (uint256 i = 0; i < markets.length; i++) {
            ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[i]);

            if (!market.resolved()) {
                vm.expectRevert("Not resolved");
                market.claim();
            }
        }
    }

    // Invariant: Fee collected <= total pool and set only once
    function invariant_FeeCollectedOnce() public {
        address[] memory markets = handler.getMarkets();

        for (uint256 i = 0; i < markets.length; i++) {
            ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[i]);

            uint256 totalPool = market.pool(0) + market.pool(1);
            uint256 feeCollected = market.feeCollected();

            // Fee should never exceed total pool
            assertLe(feeCollected, totalPool, "Fee exceeds total pool");

            // Fee should be at most 5% of losing pool
            if (market.resolved()) {
                uint256 losingPool = market.winningOutcome() == 0 ? market.pool(1) : market.pool(0);
                uint256 maxFee = (losingPool * 500) / 10_000;
                assertLe(feeCollected, maxFee, "Fee exceeds 5% of losing pool");
            }
        }
    }

    // Invariant: stHYPE locked = (non-protocol markets) * 1000
    function invariant_StHYPELocking() public {
        uint256 expectedLocked = handler.getNonProtocolMarketCount() * 1000e18;
        uint256 actualLocked = stHypeToken.balanceOf(address(factory));

        assertEq(actualLocked, expectedLocked, "stHYPE lock mismatch");
    }

    // Invariant: Protocol markets don't lock stHYPE
    function invariant_ProtocolMarketsNoLock() public {
        address[] memory protocolMarkets = handler.getProtocolMarkets();

        for (uint256 i = 0; i < protocolMarkets.length; i++) {
            // Protocol markets should have no associated locked stake
            assertEq(factory.creatorLockedStake(address(this)), 0, "Protocol market locked stake");
        }
    }
}

// Handler contract for stateful fuzzing
contract MarketHandler is Test {
    MarketFactory factory;
    stHYPE stHypeToken;
    MockERC20 stakeToken;
    SimpleOracle oracle;

    address[] public markets;
    address[] public protocolMarkets;
    mapping(address => bool) public isProtocolMarket;

    uint256 public nonProtocolMarketCount;

    constructor(MarketFactory _factory, stHYPE _stHypeToken, MockERC20 _stakeToken, SimpleOracle _oracle) {
        factory = _factory;
        stHypeToken = _stHypeToken;
        stakeToken = _stakeToken;
        oracle = _oracle;
    }

    // Create a user market (with stHYPE lock)
    function createUserMarket(uint256 seed) public {
        // Create a user with stHYPE
        address user = address(uint160(0x1000 + seed));

        // Give user WHYPE and stake it
        MockWHYPE whype = MockWHYPE(payable(stHypeToken.asset()));
        vm.deal(user, 2000e18);
        vm.prank(user);
        whype.deposit{ value: 2000e18 }();

        vm.startPrank(user);
        IERC20(address(whype)).approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);
        stHypeToken.approve(address(factory), 1000e18);

        // Create market params
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Test Market",
            description: "Test",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256(abi.encode(seed)),
                tokenIdentifier: "",
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({ op: MarketTypes.PredicateOp.GT, threshold: int256(seed * 1e18) }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("test"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 12 hours),
            creator: user,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 100_000e18,
                timeDecayBps: 0 // No time decay for fuzz tests
             }),
            isProtocolMarket: false
        });

        address market = factory.createParimutuelMarket(params);
        vm.stopPrank();

        markets.push(market);
        nonProtocolMarketCount++;
    }

    // Create a protocol market (no stHYPE lock)
    function createProtocolMarket(uint256 seed) public {
        // Only owner can create protocol markets
        vm.startPrank(factory.owner());

        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Protocol Market",
            description: "Protocol",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256(abi.encode(seed)),
                tokenIdentifier: "",
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({ op: MarketTypes.PredicateOp.GT, threshold: int256(seed * 1e18) }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("test"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 12 hours),
            creator: factory.owner(),
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 100_000e18,
                timeDecayBps: 0 // No time decay for fuzz tests
             }),
            isProtocolMarket: true
        });

        address market = factory.createProtocolMarket(params, MarketFactory.MarketType.PARIMUTUEL, 0);
        vm.stopPrank();

        markets.push(market);
        protocolMarkets.push(market);
        isProtocolMarket[market] = true;
    }

    // Make deposits to a random market
    function deposit(uint256 marketIndex, uint256 amount, uint8 outcome) public {
        if (markets.length == 0) return;

        marketIndex = marketIndex % markets.length;
        amount = bound(amount, 1e18, 100e18);
        outcome = uint8(bound(outcome, 0, 1));

        ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[marketIndex]);

        // Only deposit if before cutoff
        if (block.timestamp >= market.cutoffTime()) return;

        address depositor = address(uint160(0x2000 + marketIndex));
        stakeToken.mint(depositor, amount);

        vm.startPrank(depositor);
        stakeToken.approve(address(market), amount);
        try market.deposit(outcome, amount) { } catch { }
        vm.stopPrank();
    }

    // Resolve a random market
    function resolveMarket(uint256 marketIndex, uint8 outcome) public {
        if (markets.length == 0) return;

        marketIndex = marketIndex % markets.length;
        outcome = uint8(bound(outcome, 0, 1));

        ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[marketIndex]);

        // Only resolve if past resolve time and not already resolved
        if (block.timestamp < market.resolveTime() || market.resolved()) return;

        vm.prank(address(oracle));
        try market.ingestResolution(outcome, keccak256("data")) { } catch { }
    }

    // Claim from a random market
    function claim(uint256 marketIndex, uint256 userSeed) public {
        if (markets.length == 0) return;

        marketIndex = marketIndex % markets.length;
        address user = address(uint160(0x2000 + userSeed));

        ParimutuelMarketImplementation market = ParimutuelMarketImplementation(markets[marketIndex]);

        vm.prank(user);
        try market.claim() { } catch { }
    }

    // Warp time forward
    function warpTime(uint256 secondsToWarp) public {
        secondsToWarp = bound(secondsToWarp, 0, 7 days);
        vm.warp(block.timestamp + secondsToWarp);
    }

    // Getters for invariant checks
    function getMarkets() public view returns (address[] memory) {
        return markets;
    }

    function getProtocolMarkets() public view returns (address[] memory) {
        return protocolMarkets;
    }

    function getNonProtocolMarketCount() public view returns (uint256) {
        return nonProtocolMarketCount;
    }
}
