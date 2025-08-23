// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

// Core contracts
import { MarketFactory } from "../src/MarketFactory.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";
import { stHYPE } from "../src/staking/stHYPE.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";

// Mocks
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockWHYPE } from "./mocks/MockWHYPE.sol";
import { MockHyperLiquidStaking } from "./mocks/MockHyperLiquidStaking.sol";

contract E2EHappyPath is Test {
    // Core contracts
    MarketFactory factory;
    ParimutuelMarketImplementation implementation;
    SimpleOracle oracle;
    stHYPE stHypeToken;

    // Mock contracts
    MockERC20 stakeToken;
    MockWHYPE whype;
    MockHyperLiquidStaking hlStaking;

    // Addresses
    address treasury = address(0x1000);
    address protocolOwner = address(0x2000);
    address resolver = address(0x3000);
    address marketCreator = address(0x4000);
    address alice = address(0x5000);
    address bob = address(0x6000);
    address charlie = address(0x7000);

    // Market address
    address market;

    uint64 constant DISPUTE_WINDOW = 600; // 10 minutes
    uint256 constant STAKE_PER_MARKET = 1000e18;

    function setUp() public {
        console.log("=== E2E Happy Path Test Setup ===");

        // Deploy all mocks
        _deployMocks();

        // Deploy core protocol
        _deployProtocol();

        // Setup roles
        _setupRoles();

        // Fund users
        _fundUsers();
    }

    function _deployMocks() internal {
        console.log("Deploying mocks...");

        // Deploy stake token (e.g., USDC)
        stakeToken = new MockERC20("USD Coin", "USDC", 6);

        // Deploy WHYPE and HyperLiquid staking
        whype = new MockWHYPE();
        hlStaking = new MockHyperLiquidStaking();

        // Fund staking contract with rewards
        vm.deal(address(hlStaking), 10000e18);

        console.log("  Stake Token:", address(stakeToken));
        console.log("  WHYPE:", address(whype));
        console.log("  HL Staking:", address(hlStaking));
    }

    function _deployProtocol() internal {
        console.log("Deploying protocol...");

        vm.startPrank(protocolOwner);

        // Deploy stHYPE
        stHypeToken = new stHYPE(address(whype), address(hlStaking));
        console.log("  stHYPE:", address(stHypeToken));

        // Deploy oracle
        oracle = new SimpleOracle(DISPUTE_WINDOW);
        console.log("  Oracle:", address(oracle));

        // Deploy implementation
        implementation = new ParimutuelMarketImplementation();
        console.log("  Implementation:", address(implementation));

        // Deploy factory
        factory =
            new MarketFactory(address(stakeToken), address(stHypeToken), treasury, address(oracle));
        console.log("  Factory:", address(factory));

        // Set implementation
        factory.setImplementation(address(implementation));

        vm.stopPrank();
    }

    function _setupRoles() internal {
        console.log("Setting up roles...");

        vm.prank(protocolOwner);
        oracle.setResolver(resolver, true);

        console.log("  Resolver configured");
    }

    function _fundUsers() internal {
        console.log("Funding users...");

        // Fund market creator with native HYPE for staking
        vm.deal(marketCreator, 5000e18);

        // Fund traders with stake tokens
        stakeToken.mint(alice, 1000e6); // 1000 USDC
        stakeToken.mint(bob, 1000e6); // 1000 USDC
        stakeToken.mint(charlie, 1000e6); // 1000 USDC

        console.log("  Market creator funded with HYPE");
        console.log("  Traders funded with USDC");
    }

    function testE2E_HappyPath() public {
        console.log("\n=== Starting E2E Happy Path ===\n");

        // Step 1: Market creator gets stHYPE
        _step1_CreatorGetsStHYPE();

        // Step 2: Create prediction market
        _step2_CreateMarket();

        // Step 3: Users place bets
        _step3_UsersDeposit();

        // Step 4: Wait for market to end
        _step4_WaitForMarketEnd();

        // Step 5: Oracle commits resolution
        _step5_OracleCommits();

        // Step 6: Oracle finalizes after dispute window
        _step6_OracleFinalizesResolution();

        // Step 7: Winners claim payouts
        _step7_WinnersClaim();

        // Step 8: Creator releases locked stake
        _step8_CreatorReleasesStake();

        // Step 9: Verify final state
        _step9_VerifyFinalState();

        console.log("\n=== E2E Happy Path Complete ===");
    }

    function _step1_CreatorGetsStHYPE() internal {
        console.log("Step 1: Market creator gets stHYPE");

        vm.startPrank(marketCreator);

        // Wrap native HYPE to WHYPE
        whype.deposit{ value: 2000e18 }();
        assertEq(whype.balanceOf(marketCreator), 2000e18);

        // Approve and deposit WHYPE to get stHYPE
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);

        uint256 stHypeBalance = stHypeToken.balanceOf(marketCreator);
        assertGe(stHypeBalance, 2000e18); // Should be at least 2000 stHYPE
        console.log("  Creator stHYPE balance:", stHypeBalance / 1e18);

        vm.stopPrank();
    }

    function _step2_CreateMarket() internal {
        console.log("Step 2: Create prediction market");

        vm.startPrank(marketCreator);

        // Approve factory to spend stHYPE
        stHypeToken.approve(address(factory), STAKE_PER_MARKET);

        // Create market params - "Will Hyperliquid volume exceed $1B tomorrow?"
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Hyperliquid Daily Volume > $1B",
            description: "Will Hyperliquid's 24h trading volume exceed $1 billion USD?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("daily_volume"),
                tokenIdentifier: "",
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 1_000_000_000e18 // $1B
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: keccak256("coingecko"),
                roundingDecimals: 0
            }),
            cutoffTime: uint64(block.timestamp + 20 hours), // Betting closes 4 hours before end
            creator: marketCreator,
            econ: MarketTypes.Economics({
                feeBps: 500, // 5% fee
                creatorFeeShareBps: 1000, // Creator gets 10% of fees
                maxTotalPool: 10000e6, // Max 10,000 USDC
                timeDecayBps: 0 // No time decay for E2E tests
             }),
            isProtocolMarket: false
        });

        // Create market
        market = factory.createParimutuelMarket(params);
        console.log("  Market created at:", market);

        // Verify stHYPE was locked
        assertEq(factory.creatorLockedStake(marketCreator), STAKE_PER_MARKET);
        console.log("  Locked 1000 stHYPE");

        vm.stopPrank();
    }

    function _step3_UsersDeposit() internal {
        console.log("Step 3: Users place bets");

        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);

        // Alice bets YES (believes volume > $1B)
        vm.startPrank(alice);
        stakeToken.approve(market, 500e6);
        marketContract.deposit(1, 500e6); // YES with 500 USDC
        console.log("  Alice bet 500 USDC on YES");
        vm.stopPrank();

        // Bob bets NO
        vm.startPrank(bob);
        stakeToken.approve(market, 300e6);
        marketContract.deposit(0, 300e6); // NO with 300 USDC
        console.log("  Bob bet 300 USDC on NO");
        vm.stopPrank();

        // Charlie bets YES
        vm.startPrank(charlie);
        stakeToken.approve(market, 200e6);
        marketContract.deposit(1, 200e6); // YES with 200 USDC
        console.log("  Charlie bet 200 USDC on YES");
        vm.stopPrank();

        // Verify pools
        assertEq(marketContract.pool(0), 300e6); // NO pool
        assertEq(marketContract.pool(1), 700e6); // YES pool
        assertEq(marketContract.totalPool(), 1000e6);
        console.log("  Total pool: 1000 USDC (YES: 700, NO: 300)");
    }

    function _step4_WaitForMarketEnd() internal {
        console.log("Step 4: Wait for market to end");

        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);
        uint64 resolveTime = marketContract.resolveTime();

        // Warp to after window.tEnd (market resolve time)
        vm.warp(resolveTime + 1);
        console.log("  Warped to resolve time");
    }

    function _step5_OracleCommits() internal {
        console.log("Step 5: Oracle commits resolution");

        // Volume was $1.2B, so YES wins (outcome = 1)
        vm.prank(resolver);
        oracle.commit(market, 1, keccak256("volume=1200000000"));

        console.log("  Oracle committed: YES wins (volume = $1.2B)");
    }

    function _step6_OracleFinalizesResolution() internal {
        console.log("Step 6: Oracle finalizes after dispute window");

        // Wait for dispute window
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        console.log("  Dispute window passed");

        // Finalize resolution
        vm.prank(resolver);
        oracle.finalize(market);

        // Verify market is resolved
        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);
        assertTrue(marketContract.resolved());
        assertEq(marketContract.winningOutcome(), 1);
        console.log("  Market resolved: YES wins");
    }

    function _step7_WinnersClaim() internal {
        console.log("Step 7: Winners claim payouts");

        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);

        // Calculate expected payouts
        // Total pool: 1000 USDC
        // Losing pool (NO): 300 USDC
        // Fee: 5% of losing pool = 15 USDC
        // Treasury fee: 90% of 15 = 13.5 USDC
        // Creator fee: 10% of 15 = 1.5 USDC
        // Available for winners: 1000 - 15 = 985 USDC
        // Alice gets: 985 * (500/700) = 703.57 USDC
        // Charlie gets: 985 * (200/700) = 281.43 USDC

        uint256 aliceBalanceBefore = stakeToken.balanceOf(alice);
        uint256 charlieBalanceBefore = stakeToken.balanceOf(charlie);
        uint256 treasuryBalanceBefore = stakeToken.balanceOf(treasury);
        uint256 creatorBalanceBefore = stakeToken.balanceOf(marketCreator);

        // Alice claims
        vm.prank(alice);
        marketContract.claim();
        uint256 alicePayout = stakeToken.balanceOf(alice) - aliceBalanceBefore;
        console.log("  Alice received:", alicePayout / 1e6, "USDC");

        // Charlie claims
        vm.prank(charlie);
        marketContract.claim();
        uint256 charliePayout = stakeToken.balanceOf(charlie) - charlieBalanceBefore;
        console.log("  Charlie received:", charliePayout / 1e6, "USDC");

        // Bob tries to claim (should fail as he lost)
        vm.prank(bob);
        vm.expectRevert("No winning stake");
        marketContract.claim();
        console.log("  Bob cannot claim (lost bet)");

        // Check fees
        uint256 treasuryFee = stakeToken.balanceOf(treasury) - treasuryBalanceBefore;
        uint256 creatorFee = stakeToken.balanceOf(marketCreator) - creatorBalanceBefore;
        console.log("  Treasury received:", treasuryFee / 1e6, "USDC in fees");
        console.log("  Creator received:", creatorFee / 1e6, "USDC in fees");

        // Verify total conservation (allow 1 unit rounding due to 6 decimal precision)
        uint256 totalPaid = alicePayout + charliePayout + treasuryFee + creatorFee;
        assertApproxEqAbs(totalPaid, 1000e6, 1, "Total payout mismatch");
    }

    function _step8_CreatorReleasesStake() internal {
        console.log("Step 8: Creator releases locked stake");

        uint256 stHypeBalanceBefore = stHypeToken.balanceOf(marketCreator);

        vm.prank(marketCreator);
        factory.releaseStake(market);

        uint256 stHypeReleased = stHypeToken.balanceOf(marketCreator) - stHypeBalanceBefore;
        assertEq(stHypeReleased, STAKE_PER_MARKET);
        assertEq(factory.creatorLockedStake(marketCreator), 0);

        console.log("  Released 1000 stHYPE back to creator");
    }

    function _step9_VerifyFinalState() internal {
        console.log("Step 9: Verify final state");

        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);

        // Market state
        assertTrue(marketContract.resolved(), "Market should be resolved");
        assertEq(marketContract.winningOutcome(), 1, "YES should have won");

        // Claims state
        assertTrue(marketContract.claimed(alice), "Alice should have claimed");
        assertTrue(marketContract.claimed(charlie), "Charlie should have claimed");
        assertFalse(marketContract.claimed(bob), "Bob should not have claimed");

        // Factory state
        assertEq(factory.creatorLockedStake(marketCreator), 0, "Creator stake should be released");

        console.log("  All verifications passed!");
    }

    function testE2E_ProtocolMarket() public {
        console.log("\n=== E2E Protocol Market Test ===\n");

        vm.startPrank(protocolOwner);

        // Create protocol market (no stHYPE required)
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Daily Hyperliquid TVL > $500M",
            description: "Protocol-sponsored market for TVL tracking",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("tvl"),
                tokenIdentifier: "",
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 500_000_000e18
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 0
            }),
            cutoffTime: uint64(block.timestamp + 12 hours),
            creator: protocolOwner,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 0, // All fees to treasury
                maxTotalPool: 50000e6,
                timeDecayBps: 0 // No time decay for E2E tests
            }),
            isProtocolMarket: true
        });

        address protocolMarket = factory.createProtocolMarket(params, MarketFactory.MarketType.PARIMUTUEL, 0);
        console.log("Protocol market created at:", protocolMarket);

        // Verify no stHYPE was locked
        assertEq(factory.creatorLockedStake(protocolOwner), 0);
        assertTrue(factory.protocolMarkets(protocolMarket));

        vm.stopPrank();

        console.log("Protocol market created successfully without stHYPE lock");
    }
}
