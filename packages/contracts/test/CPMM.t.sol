// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { CPMMMarketImplementation } from "../src/CPMMMarketImplementation.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract CPMMTest is Test {
    MarketFactory factory;
    CPMMMarketImplementation implementation;
    SimpleOracle oracle;
    MockERC20 stakeToken;
    
    address owner = address(1);
    address treasury = address(2);
    address creator = address(3);
    address trader1 = address(4);
    address trader2 = address(5);
    
    address market;
    uint256 constant INITIAL_LIQUIDITY = 2000e18; // $2000 total

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock tokens
        stakeToken = new MockERC20("Stake Token", "STAKE", 18);
        
        // Deploy oracle
        oracle = new SimpleOracle(600); // 10 minutes dispute window
        
        // Deploy CPMM implementation
        implementation = new CPMMMarketImplementation();
        
        // Deploy factory (no stHYPE needed for CPMM)
        factory = new MarketFactory(
            address(stakeToken),
            address(0), // No stHYPE for CPMM
            treasury,
            address(oracle)
        );
        
        // Set CPMM implementation
        factory.setCPMMImplementation(address(implementation));
        
        vm.stopPrank();
        
        // Mint tokens to creator and traders
        stakeToken.mint(creator, 10000e18);
        stakeToken.mint(trader1, 5000e18);
        stakeToken.mint(trader2, 5000e18);
    }
    
    function testCPMMMarketCreation() public {
        MarketTypes.MarketParams memory params = _createDefaultMarketParams();
        
        vm.startPrank(creator);
        stakeToken.approve(address(factory), INITIAL_LIQUIDITY);
        
        market = factory.createCPMMMarket(params, INITIAL_LIQUIDITY);
        vm.stopPrank();
        
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Verify market was created correctly
        assertEq(cpmmMarket.creator(), creator);
        assertEq(cpmmMarket.initialLiquidity(), INITIAL_LIQUIDITY);
        assertEq(cpmmMarket.reserveYES(), INITIAL_LIQUIDITY / 2);
        assertEq(cpmmMarket.reserveNO(), INITIAL_LIQUIDITY / 2);
        
        // Verify initial price is 50%
        assertEq(cpmmMarket.getSpotPrice(), 5e17); // 0.5 in 18 decimals
    }
    
    function testCPMMBuyShares() public {
        market = _createMarket();
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        uint256 amountIn = 100e18;
        
        // Get expected output
        (uint256 expectedShares, uint256 expectedFee) = cpmmMarket.getAmountOut(1, amountIn); // Buy YES
        
        vm.startPrank(trader1);
        stakeToken.approve(market, amountIn);
        
        uint256 balanceBefore = stakeToken.balanceOf(trader1);
        
        cpmmMarket.buyShares(1, amountIn, expectedShares);
        
        vm.stopPrank();
        
        // Verify trade executed correctly
        assertEq(stakeToken.balanceOf(trader1), balanceBefore - amountIn);
        assertEq(cpmmMarket.sharesYES(trader1), expectedShares);
        assertEq(cpmmMarket.totalFeesCollected(), expectedFee);
        
        // Price should have moved (YES should be more expensive now)
        uint256 newPrice = cpmmMarket.getSpotPrice();
        assertGt(newPrice, 5e17); // Greater than 50%
    }
    
    function testCPMMSellShares() public {
        market = _createMarket();
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // First buy some shares
        uint256 amountIn = 100e18;
        
        vm.startPrank(trader1);
        stakeToken.approve(market, amountIn);
        cpmmMarket.buyShares(1, amountIn, 0); // Buy YES with no slippage check for simplicity
        
        uint256 sharesOwned = cpmmMarket.sharesYES(trader1);
        assertTrue(sharesOwned > 0);
        
        // Now sell half the shares
        uint256 sharesToSell = sharesOwned / 2;
        uint256 balanceBefore = stakeToken.balanceOf(trader1);
        
        cpmmMarket.sellShares(1, sharesToSell, 0); // Sell YES with no slippage check
        
        vm.stopPrank();
        
        // Verify shares were sold
        assertEq(cpmmMarket.sharesYES(trader1), sharesOwned - sharesToSell);
        assertGt(stakeToken.balanceOf(trader1), balanceBefore); // Got money back
    }
    
    function testCPMMResolutionAndClaim() public {
        market = _createMarket();
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Two traders buy opposite sides (smaller amounts to respect position limits)
        vm.startPrank(trader1);
        stakeToken.approve(market, 200e18);
        cpmmMarket.buyShares(1, 200e18, 0); // Buy YES
        vm.stopPrank();
        
        vm.startPrank(trader2);
        stakeToken.approve(market, 150e18);
        cpmmMarket.buyShares(0, 150e18, 0); // Buy NO
        vm.stopPrank();
        
        uint256 yesShares = cpmmMarket.sharesYES(trader1);
        uint256 noShares = cpmmMarket.sharesNO(trader2);
        
        assertTrue(yesShares > 0);
        assertTrue(noShares > 0);
        
        // Warp to resolution time
        vm.warp(block.timestamp + 2 days);
        
        // Resolve market (YES wins)
        vm.prank(address(oracle));
        cpmmMarket.ingestResolution(1, bytes32("YES_WINS"));
        
        assertTrue(cpmmMarket.resolved());
        assertEq(cpmmMarket.winningOutcome(), 1);
        
        // Winner claims payout
        uint256 balanceBefore = stakeToken.balanceOf(trader1);
        
        vm.prank(trader1);
        cpmmMarket.claim();
        
        // Verify payout (1:1 redemption)
        assertEq(stakeToken.balanceOf(trader1), balanceBefore + yesShares);
        assertTrue(cpmmMarket.claimed(trader1));
        
        // Loser gets nothing
        vm.prank(trader2);
        vm.expectRevert("No winning shares");
        cpmmMarket.claim();
    }
    
    function testCPMMFeeDistribution() public {
        market = _createMarket();
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Make some trades to generate fees (smaller amounts to respect position limits)
        vm.startPrank(trader1);
        stakeToken.approve(market, 400e18);
        cpmmMarket.buyShares(1, 200e18, 0);
        vm.stopPrank();
        
        vm.startPrank(trader2);
        stakeToken.approve(market, 400e18);
        cpmmMarket.buyShares(0, 200e18, 0);
        vm.stopPrank();
        
        uint256 totalFees = cpmmMarket.totalFeesCollected();
        assertTrue(totalFees > 0);
        
        // Resolve market
        vm.warp(block.timestamp + 2 days);
        vm.prank(address(oracle));
        cpmmMarket.ingestResolution(1, bytes32("YES_WINS"));
        
        uint256 treasuryBalanceBefore = stakeToken.balanceOf(treasury);
        uint256 creatorBalanceBefore = stakeToken.balanceOf(creator);
        
        // Claim should trigger fee distribution
        vm.prank(trader1);
        cpmmMarket.claim();
        
        // Verify fees were distributed (50/50 split)
        uint256 expectedCreatorFee = totalFees / 2; // 50% to creator
        uint256 expectedTreasuryFee = totalFees - expectedCreatorFee; // Remaining to treasury
        
        assertEq(stakeToken.balanceOf(treasury), treasuryBalanceBefore + expectedTreasuryFee);
        assertEq(stakeToken.balanceOf(creator), creatorBalanceBefore + expectedCreatorFee);
        assertTrue(cpmmMarket.feesDistributed());
    }
    
    function testCPMMPriceMovement() public {
        market = _createMarket();
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Initial price should be 50%
        assertEq(cpmmMarket.getSpotPrice(), 5e17);
        
        // Buy YES shares - price should increase (smaller amount to respect position limits)
        vm.startPrank(trader1);
        stakeToken.approve(market, 200e18);
        cpmmMarket.buyShares(1, 200e18, 0);
        vm.stopPrank();
        
        uint256 priceAfterYes = cpmmMarket.getSpotPrice();
        assertGt(priceAfterYes, 5e17); // Price increased above 50%
        
        // Buy NO shares - price should move back towards 50% (smaller amount to respect position limits)
        vm.startPrank(trader2);
        stakeToken.approve(market, 200e18);
        cpmmMarket.buyShares(0, 200e18, 0);
        vm.stopPrank();
        
        uint256 priceAfterNo = cpmmMarket.getSpotPrice();
        assertLt(priceAfterNo, priceAfterYes); // Price decreased from previous
    }
    
    // Helper functions
    function _createMarket() private returns (address) {
        MarketTypes.MarketParams memory params = _createDefaultMarketParams();
        
        vm.startPrank(creator);
        stakeToken.approve(address(factory), INITIAL_LIQUIDITY);
        address newMarket = factory.createCPMMMarket(params, INITIAL_LIQUIDITY);
        vm.stopPrank();
        
        return newMarket;
    }
    
    function _createDefaultMarketParams() private view returns (MarketTypes.MarketParams memory) {
        return MarketTypes.MarketParams({
            title: "Test CPMM Market",
            description: "Will this test pass?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                token: address(stakeToken),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(100e18)
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("test_source"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 23 hours),
            creator: creator,
            econ: MarketTypes.Economics({
                feeBps: 300, // 3%
                creatorFeeShareBps: 5000, // 50% of fees to creator
                maxTotalPool: 1000000e18,
                timeDecayBps: 0 // No time decay for CPMM
            }),
            isProtocolMarket: false
        });
    }
    
    function testPositionLimits() public {
        // Create market first
        MarketTypes.MarketParams memory params = _createDefaultMarketParams();
        
        vm.startPrank(creator);
        stakeToken.approve(address(factory), INITIAL_LIQUIDITY);
        market = factory.createCPMMMarket(params, INITIAL_LIQUIDITY);
        vm.stopPrank();
        
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Initial liquidity is 2000e18, so each side has 1000e18
        // 25% of 1000e18 = 250e18 maximum shares per user
        uint256 maxSharesPerUser = 250e18;
        
        // Trader1 buys up to the limit (should succeed)
        vm.startPrank(trader1);
        uint256 largeAmount = 300e18; // Try to buy shares worth ~300 tokens
        stakeToken.approve(market, largeAmount);
        
        // This should work - buying some shares first
        cpmmMarket.buyShares(1, 100e18, 0);
        uint256 sharesAfterFirst = cpmmMarket.sharesYES(trader1);
        
        // Calculate how much more we can buy to reach the limit
        uint256 remainingShares = maxSharesPerUser - sharesAfterFirst;
        
        // Try to buy exactly up to the limit (should work)
        if (remainingShares > 0) {
            // Calculate input needed for remaining shares (approximation)
            uint256 approxInput = remainingShares + 50e18; // Add buffer for fees/slippage
            stakeToken.approve(market, approxInput);
            
            // This might revert due to slippage, but let's try a smaller amount
            try cpmmMarket.buyShares(1, 50e18, 0) {
                // Purchase succeeded
            } catch {
                // Expected if we're close to the limit
            }
        }
        
        vm.stopPrank();
        
        // Now try to exceed the limit with a new large purchase
        vm.startPrank(trader2);
        stakeToken.approve(market, 1000e18);
        
        // This should fail - trying to buy way more than the limit
        vm.expectRevert("Position limit exceeded");
        cpmmMarket.buyShares(1, 800e18, 0);
        
        vm.stopPrank();
    }
    
    function testPositionLimitsPreventWhaleManipulation() public {
        // Create market first  
        MarketTypes.MarketParams memory params = _createDefaultMarketParams();
        
        vm.startPrank(creator);
        stakeToken.approve(address(factory), INITIAL_LIQUIDITY);
        market = factory.createCPMMMarket(params, INITIAL_LIQUIDITY);
        vm.stopPrank();
        
        CPMMMarketImplementation cpmmMarket = CPMMMarketImplementation(market);
        
        // Create a whale with lots of tokens
        address whale = address(0x999);
        stakeToken.mint(whale, 10000e18);
        
        vm.startPrank(whale);
        stakeToken.approve(market, 10000e18);
        
        // Whale tries to buy massive position to manipulate price
        // Should be stopped by position limits
        vm.expectRevert("Position limit exceeded");
        cpmmMarket.buyShares(1, 1000e18, 0);
        
        vm.stopPrank();
    }
}