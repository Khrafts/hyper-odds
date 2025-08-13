// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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
}