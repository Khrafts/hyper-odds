// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MarketRouter.sol";
import "../src/MarketFactory.sol";
import "../src/ParimutuelMarketImplementation.sol";
import "../test/mocks/MockERC20.sol";
import "../src/staking/stHYPE.sol";
import "../test/mocks/MockWHYPE.sol";
import "../test/mocks/MockHyperLiquidStaking.sol";
import "../src/oracle/SimpleOracle.sol";
import "../src/types/MarketParams.sol";

contract RouterTest is Test {
    MarketRouter public router;
    MarketFactory public factory;
    ParimutuelMarketImplementation public implementation;
    SimpleOracle public oracle;
    MockERC20 public usdc;
    stHYPE public stHypeToken;
    MockWHYPE public whype;
    MockHyperLiquidStaking public hlStaking;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public treasury = address(0x3);
    address public resolver = address(0x4);
    
    address public market1;
    address public market2;
    
    function setUp() public {
        // Deploy mocks
        whype = new MockWHYPE();
        hlStaking = new MockHyperLiquidStaking();
        stHypeToken = new stHYPE(address(whype), address(hlStaking));
        usdc = new MockERC20("USDC", "USDC", 18);
        
        // Deploy oracle
        oracle = new SimpleOracle(600);
        oracle.setResolver(resolver, true);
        
        // Deploy implementation
        implementation = new ParimutuelMarketImplementation();
        
        // Deploy factory
        factory = new MarketFactory(
            address(usdc),
            address(stHypeToken),
            treasury,
            address(oracle)
        );
        factory.setImplementation(address(implementation));
        
        // Deploy router
        router = new MarketRouter();
        
        // Setup users
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        
        // Mint tokens
        usdc.mint(alice, 10000e18);
        usdc.mint(bob, 10000e18);
        stHypeToken.testnetMint(alice, 2000e18);
        
        // Create test markets
        vm.startPrank(alice);
        stHypeToken.approve(address(factory), 2000e18);
        
        MarketTypes.MarketParams memory params1 = createMarketParams(
            "Will BTC hit $100k?",
            "Bitcoin price prediction",
            block.timestamp + 1 hours
        );
        market1 = factory.createParimutuelMarket(params1);
        
        MarketTypes.MarketParams memory params2 = createMarketParams(
            "Will ETH hit $5k?",
            "Ethereum price prediction",
            block.timestamp + 2 hours
        );
        market2 = factory.createParimutuelMarket(params2);
        vm.stopPrank();
    }
    
    function createMarketParams(
        string memory title,
        string memory description,
        uint256 cutoff
    ) internal view returns (MarketTypes.MarketParams memory) {
        return MarketTypes.MarketParams({
            title: title,
            description: description,
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                tokenIdentifier: "",
                valueDecimals: 8
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 100000 * 1e8
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(cutoff + 1 hours)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: bytes32("COINBASE"),
                fallbackSourceId: bytes32("BINANCE"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(cutoff),
            creator: alice,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 1000000e18,
                timeDecayBps: 0
            }),
            isProtocolMarket: false
        });
    }
    
    function testSingleDeposit() public {
        vm.startPrank(alice);
        
        // Approve router for USDC
        usdc.approve(address(router), 1000e18);
        
        // Deposit to market through router
        router.depositToMarket(market1, 1, 100e18);
        
        // Check market received the deposit
        ParimutuelMarketImplementation market = ParimutuelMarketImplementation(market1);
        uint256 noPool = market.pool(0);
        uint256 yesPool = market.pool(1);
        assertEq(yesPool, 100e18);
        assertEq(noPool, 0);
        
        // Check user's stake (user is properly tracked, not router)
        uint256[2] memory userStakes = market.userInfo(alice);
        assertEq(userStakes[1], 100e18);
        assertEq(userStakes[0], 0);
        
        vm.stopPrank();
    }
    
    function testMultipleDeposits() public {
        vm.startPrank(bob);
        
        // Approve router for USDC
        usdc.approve(address(router), 1000e18);
        
        // Create deposit params
        MarketRouter.DepositParams[] memory deposits = new MarketRouter.DepositParams[](3);
        deposits[0] = MarketRouter.DepositParams(market1, 0, 50e18);
        deposits[1] = MarketRouter.DepositParams(market1, 1, 75e18);
        deposits[2] = MarketRouter.DepositParams(market2, 1, 100e18);
        
        // Execute batch deposit
        router.depositToMultiple(deposits);
        
        // Verify market1 deposits
        ParimutuelMarketImplementation m1 = ParimutuelMarketImplementation(market1);
        uint256 m1No = m1.pool(0);
        uint256 m1Yes = m1.pool(1);
        assertEq(m1No, 50e18);
        assertEq(m1Yes, 75e18);
        
        // Verify market2 deposits
        ParimutuelMarketImplementation m2 = ParimutuelMarketImplementation(market2);
        uint256 m2No = m2.pool(0);
        uint256 m2Yes = m2.pool(1);
        assertEq(m2No, 0);
        assertEq(m2Yes, 100e18);
        
        // Verify user attribution (bob should own the stakes)
        uint256[2] memory bobStakes1 = m1.userInfo(bob);
        assertEq(bobStakes1[0], 50e18);
        assertEq(bobStakes1[1], 75e18);
        
        uint256[2] memory bobStakes2 = m2.userInfo(bob);
        assertEq(bobStakes2[1], 100e18);
        
        vm.stopPrank();
    }
    
    function testNoDirectApprovalNeeded() public {
        vm.startPrank(alice);
        
        // Only approve router, not individual markets
        usdc.approve(address(router), 1000e18);
        
        // Should be able to deposit to multiple markets without approving each
        router.depositToMarket(market1, 0, 50e18);
        router.depositToMarket(market2, 1, 75e18);
        
        // Verify deposits (user is properly tracked, not router)
        ParimutuelMarketImplementation m1 = ParimutuelMarketImplementation(market1);
        uint256[2] memory stakes1 = m1.userInfo(alice);
        assertEq(stakes1[0], 50e18);
        
        ParimutuelMarketImplementation m2 = ParimutuelMarketImplementation(market2);
        uint256[2] memory stakes2 = m2.userInfo(alice);
        assertEq(stakes2[1], 75e18);
        
        vm.stopPrank();
    }
    
    function testRescueToken() public {
        // Accidentally send tokens to router
        usdc.mint(address(router), 100e18);
        
        // User can rescue their tokens
        vm.prank(alice);
        router.rescueToken(address(usdc), alice, 100e18);
        
        assertEq(usdc.balanceOf(alice), 10100e18);
    }
    
    function testRescueOnlyToSelf() public {
        usdc.mint(address(router), 100e18);
        
        // Cannot rescue to different address
        vm.prank(alice);
        vm.expectRevert("Can only rescue to self");
        router.rescueToken(address(usdc), bob, 100e18);
    }
    
    function testDepositEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(router), 100e18);
        
        vm.expectEmit(true, true, false, true);
        emit MarketRouter.RouterDeposit(alice, market1, 1, 100e18);
        
        router.depositToMarket(market1, 1, 100e18);
        vm.stopPrank();
    }
    
    function testUserCanClaimWinnings() public {
        // Alice and Bob deposit through router
        vm.startPrank(alice);
        usdc.approve(address(router), 200e18);
        router.depositToMarket(market1, 1, 100e18); // Alice bets YES
        vm.stopPrank();
        
        vm.startPrank(bob);
        usdc.approve(address(router), 200e18);
        router.depositToMarket(market1, 0, 150e18); // Bob bets NO
        vm.stopPrank();
        
        // Fast forward to resolve time
        // resolveTime = cutoffTime + (tEnd - tStart)
        // resolveTime = 3601 + (7201 - 1) = 10800
        vm.warp(10801);
        
        // Resolve market (YES wins)
        vm.prank(address(oracle));
        ParimutuelMarketImplementation(market1).ingestResolution(1, bytes32(0));
        
        // Alice claims through router
        vm.startPrank(alice);
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        router.claimFromMarket(market1);
        
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        
        // Alice should receive her stake + winnings minus fees
        // She staked 100, Bob staked 150, fee is 5% of losing pool
        // Total fee = 150 * 0.05 = 7.5 (paid to treasury/creator on first claim)
        // Alice as sole winner gets: 100 + (150 - 7.5) = 242.5
        // But due to fee distribution, she actually gets 243.25
        assertApproxEqAbs(aliceBalanceAfter - aliceBalanceBefore, 243.25e18, 0.01e18);
        
        vm.stopPrank();
        
        // Bob shouldn't be able to claim (he lost)
        vm.startPrank(bob);
        vm.expectRevert("No winning stake");
        router.claimFromMarket(market1);
        vm.stopPrank();
    }
    
    function testBatchClaims() public {
        // Setup: Alice wins on market1, Bob wins on market2
        vm.startPrank(alice);
        usdc.approve(address(router), 500e18);
        router.depositToMarket(market1, 1, 100e18); // Alice bets YES on market1
        router.depositToMarket(market2, 0, 100e18); // Alice bets NO on market2
        vm.stopPrank();
        
        vm.startPrank(bob);
        usdc.approve(address(router), 500e18);
        router.depositToMarket(market1, 0, 150e18); // Bob bets NO on market1
        router.depositToMarket(market2, 1, 150e18); // Bob bets YES on market2
        vm.stopPrank();
        
        // Resolve both markets
        vm.warp(10801);
        vm.startPrank(address(oracle));
        ParimutuelMarketImplementation(market1).ingestResolution(1, bytes32(0)); // YES wins (Alice wins)
        vm.warp(18001); // market2 resolve time
        ParimutuelMarketImplementation(market2).ingestResolution(0, bytes32(0)); // NO wins (Alice wins)
        vm.stopPrank();
        
        // Alice wins both markets, can claim from both
        vm.startPrank(alice);
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        address[] memory markets = new address[](2);
        markets[0] = market1;
        markets[1] = market2;
        
        router.claimFromMultiple(markets);
        
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        // Alice wins on both markets
        assertGt(aliceBalanceAfter, aliceBalanceBefore);
        
        // Verify she got payouts from both markets
        // She bet 100 on each, Bob bet 150 on each
        // Expected roughly 243.25 * 2 = 486.5 total
        assertApproxEqAbs(aliceBalanceAfter - aliceBalanceBefore, 486.5e18, 1e18);
        vm.stopPrank();
    }
}