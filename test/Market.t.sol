// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MarketTest is Test {
    ParimutuelMarketImplementation market;
    MockERC20 stakeToken;

    address treasury = address(0x1);
    address creator = address(0x2);
    address oracle = address(0x3);
    address user1 = address(0x4);
    address user2 = address(0x5);

    uint64 cutoffTime;
    uint64 resolveTime;

    function setUp() public {
        market = new ParimutuelMarketImplementation();
        stakeToken = new MockERC20();

        cutoffTime = uint64(block.timestamp + 1 hours);
        resolveTime = uint64(block.timestamp + 2 hours);
    }

    // Task 5.2 tests - initialize
    function testMarketInitialize() public {
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        assertEq(address(market.stakeToken()), address(stakeToken));
        assertEq(market.treasury(), treasury);
        assertEq(market.creator(), creator);
        assertEq(market.oracle(), oracle);
        assertEq(market.cutoffTime(), cutoffTime);
        assertEq(market.resolveTime(), resolveTime);
        assertEq(market.maxTotalPool(), 1000e18);
        assertEq(market.feeBps(), 500); // 5%
        assertEq(market.creatorFeeShareBps(), 1000); // 10% of fee
    }

    function testMarketCannotReinitialize() public {
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        vm.expectRevert("Already initialized");
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    function testMarketInitializeBadTimes() public {
        // Cutoff time in past
        vm.expectRevert("Cutoff time in past");
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            uint64(block.timestamp - 1),
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        // New market for next test
        market = new ParimutuelMarketImplementation();

        // Resolve time before cutoff
        vm.expectRevert("Resolve time before cutoff");
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            cutoffTime - 1,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    function testMarketInitializeInvalidAddresses() public {
        // Invalid stake token
        vm.expectRevert("Invalid stake token");
        market.initialize(
            address(0),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        // Invalid treasury
        market = new ParimutuelMarketImplementation();
        vm.expectRevert("Invalid treasury");
        market.initialize(
            address(stakeToken),
            address(0),
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        // Invalid creator
        market = new ParimutuelMarketImplementation();
        vm.expectRevert("Invalid creator");
        market.initialize(
            address(stakeToken),
            treasury,
            address(0),
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );

        // Invalid oracle
        market = new ParimutuelMarketImplementation();
        vm.expectRevert("Invalid oracle");
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            address(0),
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    function testMarketInitializeInvalidMaxPool() public {
        vm.expectRevert("Invalid max pool");
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            0,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    // Helper function to initialize market
    function initializeMarket() internal {
        market.initialize(
            address(stakeToken),
            treasury,
            creator,
            oracle,
            cutoffTime,
            resolveTime,
            1000e18,
            keccak256("subject"),
            keccak256("predicate"),
            keccak256("window")
        );
    }

    // Task 5.3 tests - deposit
    function testMarketDepositHappyPath() public {
        initializeMarket();

        // Give users tokens
        stakeToken.mint(user1, 100e18);
        stakeToken.mint(user2, 100e18);

        // User1 deposits on YES
        vm.startPrank(user1);
        stakeToken.approve(address(market), 50e18);
        market.deposit(1, 50e18);
        vm.stopPrank();

        assertEq(market.pool(1), 50e18);
        assertEq(market.stakeOf(user1, 1), 50e18);

        // User2 deposits on NO
        vm.startPrank(user2);
        stakeToken.approve(address(market), 30e18);
        market.deposit(0, 30e18);
        vm.stopPrank();

        assertEq(market.pool(0), 30e18);
        assertEq(market.stakeOf(user2, 0), 30e18);
    }

    function testMarketDepositAfterCutoff() public {
        initializeMarket();
        stakeToken.mint(user1, 100e18);

        // Warp past cutoff time
        vm.warp(cutoffTime + 1);

        vm.startPrank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.expectRevert("Deposits closed");
        market.deposit(1, 50e18);
        vm.stopPrank();
    }

    function testMarketDepositInvalidOutcome() public {
        initializeMarket();
        stakeToken.mint(user1, 100e18);

        vm.startPrank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.expectRevert("Invalid outcome");
        market.deposit(2, 50e18);
        vm.stopPrank();
    }

    function testMarketDepositZeroAmount() public {
        initializeMarket();

        vm.prank(user1);
        vm.expectRevert("Zero amount");
        market.deposit(1, 0);
    }

    function testMarketDepositPoolCapExceeded() public {
        initializeMarket();
        stakeToken.mint(user1, 2000e18);

        vm.startPrank(user1);
        stakeToken.approve(address(market), 2000e18);

        // First deposit OK
        market.deposit(1, 900e18);

        // Second deposit would exceed cap
        vm.expectRevert("Pool cap exceeded");
        market.deposit(1, 200e18);
        vm.stopPrank();
    }

    // Task 5.4 tests - ingestResolution
    function testMarketIngestResolutionOnlyOracle() public {
        initializeMarket();

        // Warp to resolve time
        vm.warp(resolveTime);

        // Non-oracle cannot resolve
        vm.prank(user1);
        vm.expectRevert("Only oracle");
        market.ingestResolution(1, keccak256("data"));

        // Oracle can resolve
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 1);
        assertEq(market.resolutionDataHash(), keccak256("data"));
    }

    function testMarketIngestResolutionBeforeResolveTime() public {
        initializeMarket();

        // Try to resolve before resolve time
        vm.prank(oracle);
        vm.expectRevert("Too early to resolve");
        market.ingestResolution(1, keccak256("data"));

        // Warp to resolve time and try again
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        assertTrue(market.resolved());
    }

    function testMarketIngestResolutionDoubleResolve() public {
        initializeMarket();
        vm.warp(resolveTime);

        vm.startPrank(oracle);
        market.ingestResolution(1, keccak256("data"));

        vm.expectRevert("Already resolved");
        market.ingestResolution(0, keccak256("other"));
        vm.stopPrank();
    }

    function testMarketIngestResolutionInvalidOutcome() public {
        initializeMarket();
        vm.warp(resolveTime);

        vm.prank(oracle);
        vm.expectRevert("Invalid outcome");
        market.ingestResolution(2, keccak256("data"));
    }

    // Task 5.5 tests - claim
    function testMarketClaimTwoUsersProRata() public {
        initializeMarket();

        // Setup: User1 bets 60 on YES, User2 bets 40 on YES, User3 bets 100 on NO
        stakeToken.mint(user1, 100e18);
        stakeToken.mint(user2, 100e18);
        address user3 = address(0x6);
        stakeToken.mint(user3, 100e18);

        vm.prank(user1);
        stakeToken.approve(address(market), 60e18);
        vm.prank(user1);
        market.deposit(1, 60e18); // YES

        vm.prank(user2);
        stakeToken.approve(address(market), 40e18);
        vm.prank(user2);
        market.deposit(1, 40e18); // YES

        vm.prank(user3);
        stakeToken.approve(address(market), 100e18);
        vm.prank(user3);
        market.deposit(0, 100e18); // NO

        // Resolve to YES wins
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        // Calculate expected payouts
        // Total pool: 200, Winning pool: 100 (YES), Losing pool: 100 (NO)
        // Fee: 5% of losing pool = 5
        // Available winnings: 95
        // User1 gets: 60 + (95 * 60/100) = 60 + 57 = 117
        // User2 gets: 40 + (95 * 40/100) = 40 + 38 = 78

        uint256 balanceBefore1 = stakeToken.balanceOf(user1);
        vm.prank(user1);
        market.claim();
        assertEq(stakeToken.balanceOf(user1) - balanceBefore1, 117e18);

        uint256 balanceBefore2 = stakeToken.balanceOf(user2);
        vm.prank(user2);
        market.claim();
        assertEq(stakeToken.balanceOf(user2) - balanceBefore2, 78e18);

        // Check fees were distributed (5% = 5e18, treasury gets 4.5, creator gets 0.5)
        assertEq(stakeToken.balanceOf(treasury), 45e17); // 4.5
        assertEq(stakeToken.balanceOf(creator), 5e17); // 0.5
    }

    function testMarketClaimOneSidedPool() public {
        initializeMarket();

        // Only YES bets
        stakeToken.mint(user1, 100e18);
        stakeToken.mint(user2, 100e18);

        vm.prank(user1);
        stakeToken.approve(address(market), 60e18);
        vm.prank(user1);
        market.deposit(1, 60e18);

        vm.prank(user2);
        stakeToken.approve(address(market), 40e18);
        vm.prank(user2);
        market.deposit(1, 40e18);

        // Resolve to YES
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        // Users just get their stake back
        uint256 balanceBefore1 = stakeToken.balanceOf(user1);
        vm.prank(user1);
        market.claim();
        assertEq(stakeToken.balanceOf(user1) - balanceBefore1, 60e18);

        uint256 balanceBefore2 = stakeToken.balanceOf(user2);
        vm.prank(user2);
        market.claim();
        assertEq(stakeToken.balanceOf(user2) - balanceBefore2, 40e18);

        // No fees since no losing pool
        assertEq(stakeToken.balanceOf(treasury), 0);
        assertEq(stakeToken.balanceOf(creator), 0);
    }

    function testMarketClaimTwiceReverts() public {
        initializeMarket();

        stakeToken.mint(user1, 100e18);
        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user1);
        market.deposit(1, 50e18);

        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        vm.prank(user1);
        market.claim();

        vm.prank(user1);
        vm.expectRevert("Already claimed");
        market.claim();
    }

    function testMarketClaimBeforeResolution() public {
        initializeMarket();

        stakeToken.mint(user1, 100e18);
        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user1);
        market.deposit(1, 50e18);

        vm.prank(user1);
        vm.expectRevert("Not resolved");
        market.claim();
    }

    function testMarketClaimNoWinningStake() public {
        initializeMarket();

        stakeToken.mint(user1, 100e18);
        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user1);
        market.deposit(0, 50e18); // Bet on NO

        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data")); // YES wins

        vm.prank(user1);
        vm.expectRevert("No winning stake");
        market.claim();
    }

    function testMarketFeeSkimOnce() public {
        initializeMarket();

        // Setup stakes
        stakeToken.mint(user1, 100e18);
        stakeToken.mint(user2, 100e18);
        address user3 = address(0x6);
        stakeToken.mint(user3, 100e18);

        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user1);
        market.deposit(1, 50e18);

        vm.prank(user2);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user2);
        market.deposit(1, 50e18);

        vm.prank(user3);
        stakeToken.approve(address(market), 100e18);
        vm.prank(user3);
        market.deposit(0, 100e18);

        // Resolve
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        // First claim triggers fee
        vm.prank(user1);
        market.claim();

        uint256 treasuryBalanceAfterFirst = stakeToken.balanceOf(treasury);
        uint256 creatorBalanceAfterFirst = stakeToken.balanceOf(creator);

        // Second claim should not trigger fee again
        vm.prank(user2);
        market.claim();

        assertEq(stakeToken.balanceOf(treasury), treasuryBalanceAfterFirst);
        assertEq(stakeToken.balanceOf(creator), creatorBalanceAfterFirst);
    }

    // Task 5.6 tests - view helpers
    function testMarketViewHelpers() public {
        initializeMarket();

        stakeToken.mint(user1, 100e18);

        // Initial state
        assertEq(market.totalPool(), 0);
        uint256[2] memory info = market.userInfo(user1);
        assertEq(info[0], 0);
        assertEq(info[1], 0);

        // After deposit
        vm.startPrank(user1);
        stakeToken.approve(address(market), 75e18);
        market.deposit(0, 25e18);
        market.deposit(1, 50e18);
        vm.stopPrank();

        assertEq(market.totalPool(), 75e18);
        info = market.userInfo(user1);
        assertEq(info[0], 25e18);
        assertEq(info[1], 50e18);
    }

    // Task 5.7 tests - emergency cancel
    function testMarketCancelAndRefund() public {
        initializeMarket();

        // Users deposit
        stakeToken.mint(user1, 100e18);
        stakeToken.mint(user2, 100e18);

        vm.prank(user1);
        stakeToken.approve(address(market), 60e18);
        vm.prank(user1);
        market.deposit(1, 60e18);

        vm.prank(user2);
        stakeToken.approve(address(market), 40e18);
        vm.prank(user2);
        market.deposit(0, 40e18);

        // Owner cancels
        market.cancelAndRefund();

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 2); // Cancelled
        assertTrue(market.paused());

        // Users can claim refunds
        uint256 balanceBefore1 = stakeToken.balanceOf(user1);
        vm.prank(user1);
        market.emergencyClaim();
        assertEq(stakeToken.balanceOf(user1) - balanceBefore1, 60e18);

        uint256 balanceBefore2 = stakeToken.balanceOf(user2);
        vm.prank(user2);
        market.emergencyClaim();
        assertEq(stakeToken.balanceOf(user2) - balanceBefore2, 40e18);
    }

    function testMarketCannotCancelAfterResolution() public {
        initializeMarket();

        // Resolve market
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        // Cannot cancel after resolution
        vm.expectRevert("Already resolved");
        market.cancelAndRefund();
    }

    function testMarketOnlyOwnerCanCancel() public {
        initializeMarket();

        vm.prank(user1);
        vm.expectRevert();
        market.cancelAndRefund();
    }

    function testMarketCannotClaimNormallyAfterCancel() public {
        initializeMarket();

        stakeToken.mint(user1, 100e18);
        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);
        vm.prank(user1);
        market.deposit(1, 50e18);

        market.cancelAndRefund();

        // Normal claim should fail (outcome 2 is out of bounds for array)
        vm.prank(user1);
        vm.expectRevert();
        market.claim();
    }

    function testMarketCannotDepositAfterCancel() public {
        initializeMarket();

        market.cancelAndRefund();

        stakeToken.mint(user1, 100e18);
        vm.prank(user1);
        stakeToken.approve(address(market), 50e18);

        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        market.deposit(1, 50e18);
    }

    // Phase 8.2 - Deposit window tests
    function testMarketDepositWindow() public {
        initializeMarket();
        stakeToken.mint(user1, 200e18);

        // Before cutoff - should work
        vm.startPrank(user1);
        stakeToken.approve(address(market), 200e18);

        // Deposit successfully before cutoff
        vm.warp(cutoffTime - 1);
        market.deposit(1, 50e18);
        assertEq(market.stakeOf(user1, 1), 50e18);

        // After cutoff - should fail
        vm.warp(cutoffTime + 1);
        vm.expectRevert("Deposits closed");
        market.deposit(1, 50e18);
        vm.stopPrank();
    }

    // Phase 8.4 - Payout math correctness
    function testMarketPayoutMath() public {
        initializeMarket();

        // Setup 3 users with different stakes
        address user3 = address(0x6);
        stakeToken.mint(user1, 300e18);
        stakeToken.mint(user2, 200e18);
        stakeToken.mint(user3, 100e18);

        // User1: 300 on YES
        vm.startPrank(user1);
        stakeToken.approve(address(market), 300e18);
        market.deposit(1, 300e18);
        vm.stopPrank();

        // User2: 200 on NO
        vm.startPrank(user2);
        stakeToken.approve(address(market), 200e18);
        market.deposit(0, 200e18);
        vm.stopPrank();

        // User3: 100 on YES
        vm.startPrank(user3);
        stakeToken.approve(address(market), 100e18);
        market.deposit(1, 100e18);
        vm.stopPrank();

        // Total pool: 600, YES: 400, NO: 200
        // Resolve YES wins
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        // Calculate expected payouts
        // Total losing pool: 200
        // Fee: 200 * 5% = 10
        // Treasury fee: 10 * 90% = 9
        // Creator fee: 10 * 10% = 1
        // Remaining for winners: 600 - 10 = 590

        // User1 share: 300/400 * 590 = 442.5
        // User3 share: 100/400 * 590 = 147.5

        uint256 balanceBefore1 = stakeToken.balanceOf(user1);
        uint256 balanceBefore3 = stakeToken.balanceOf(user3);
        uint256 treasuryBefore = stakeToken.balanceOf(treasury);
        uint256 creatorBefore = stakeToken.balanceOf(creator);

        // Claims
        vm.prank(user1);
        market.claim();

        vm.prank(user3);
        market.claim();

        // Verify exact payouts
        assertEq(stakeToken.balanceOf(user1) - balanceBefore1, 442.5e18);
        assertEq(stakeToken.balanceOf(user3) - balanceBefore3, 147.5e18);
        assertEq(stakeToken.balanceOf(treasury) - treasuryBefore, 9e18);
        assertEq(stakeToken.balanceOf(creator) - creatorBefore, 1e18);

        // Verify total conservation
        uint256 totalPaid = (stakeToken.balanceOf(user1) - balanceBefore1)
            + (stakeToken.balanceOf(user3) - balanceBefore3)
            + (stakeToken.balanceOf(treasury) - treasuryBefore)
            + (stakeToken.balanceOf(creator) - creatorBefore);
        assertEq(totalPaid, 600e18);
    }

    // Phase 8.6 - Oracle timing tests
    function testMarketOracleTiming() public {
        initializeMarket();

        // Cannot resolve before resolveTime
        vm.prank(oracle);
        vm.expectRevert("Too early to resolve");
        market.ingestResolution(1, keccak256("data"));

        // Can resolve at resolveTime
        vm.warp(resolveTime);
        vm.prank(oracle);
        market.ingestResolution(1, keccak256("data"));

        assertTrue(market.resolved());
    }

    // Phase 8.7 - Access guards
    function testMarketAccessGuards() public {
        initializeMarket();

        // Only oracle can resolve
        vm.prank(user1);
        vm.expectRevert("Only oracle");
        market.ingestResolution(1, keccak256("data"));

        // Only owner can pause
        vm.prank(user1);
        vm.expectRevert();
        market.pause();

        // Only owner can cancel
        vm.prank(user1);
        vm.expectRevert();
        market.cancelAndRefund();

        // Owner can pause
        market.pause();
        assertTrue(market.paused());

        // Owner can unpause
        market.unpause();
        assertFalse(market.paused());
    }

    // Phase 8.9 - Factory staking tests
    function testMarketFactoryStaking() public {
        // This test is better suited in Factory.t.sol
        // It's already covered by:
        // - testFactoryCreateMarketLocksStHYPE
        // - testFactoryReleaseStakeAfterResolution
        // - testFactoryCreateMarketFlashloanProtection
        // - testFactoryProtocolMarketsNoStakeRelease
    }
}
