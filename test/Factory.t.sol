// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { stHYPE } from "../src/staking/stHYPE.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { MockWHYPE } from "./mocks/MockWHYPE.sol";
import { MockHyperLiquidStaking as MockHLS } from "./mocks/MockHyperLiquidStaking.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FactoryTest is Test {
    MarketFactory factory;
    ParimutuelMarketImplementation implementation;
    stHYPE stHypeToken;
    SimpleOracle oracle;
    MockERC20 stakeToken;
    MockWHYPE whype;
    MockHLS hlStaking;

    address treasury = address(0x1);
    address user = address(0x2);
    address owner = address(this);

    function setUp() public {
        // Deploy mocks
        stakeToken = new MockERC20("USDC", "USDC");
        whype = new MockWHYPE();
        hlStaking = new MockHLS();

        // Fund staking contract with native HYPE for rewards
        vm.deal(address(hlStaking), 10000e18);

        // Deploy stHYPE
        stHypeToken = new stHYPE(address(whype), address(hlStaking));

        // Deploy oracle
        oracle = new SimpleOracle(600);

        // Deploy implementation
        implementation = new ParimutuelMarketImplementation();

        // Deploy factory
        factory =
            new MarketFactory(address(stakeToken), address(stHypeToken), treasury, address(oracle));

        // Set implementation
        factory.setImplementation(address(implementation));
    }

    function createDefaultMarketParams() internal view returns (MarketTypes.MarketParams memory) {
        return MarketTypes.MarketParams({
            title: "Test Market",
            description: "Test Description",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("volume"),
                token: address(0),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 1000000e18
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("primary"),
                fallbackSourceId: keccak256("secondary"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 12 hours),
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 1000000e18
            }),
            isProtocolMarket: false
        });
    }

    // Task 6.2 tests - createMarket with stHYPE lock
    function testFactoryCreateMarketLocksStHYPE() public {
        // Give user native HYPE and wrap it to WHYPE
        vm.deal(user, 2000e18);
        vm.prank(user);
        whype.deposit{ value: 2000e18 }();
        vm.startPrank(user);
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);

        // Approve factory to spend stHYPE
        stHypeToken.approve(address(factory), 1000e18);

        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = user;

        // Create market
        address market = factory.createMarket(params);
        vm.stopPrank();

        // Verify stHYPE was locked
        assertEq(factory.creatorLockedStake(user), 1000e18);
        assertEq(stHypeToken.balanceOf(address(factory)), 1000e18);
        assertEq(factory.marketCreator(market), user);
    }

    function testFactoryCreateMarketCorrectParams() public {
        // Setup user with stHYPE
        vm.deal(user, 2000e18);
        vm.prank(user);
        whype.deposit{ value: 2000e18 }();
        vm.startPrank(user);
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);
        stHypeToken.approve(address(factory), 1000e18);

        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = user;

        // Create market
        address market = factory.createMarket(params);
        vm.stopPrank();

        // Verify market was initialized with correct params
        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);
        assertEq(marketContract.oracle(), address(oracle));
        assertEq(marketContract.cutoffTime(), params.cutoffTime);
        assertEq(marketContract.creator(), user);
    }

    function testFactoryCreateMarketFlashloanProtection() public {
        // This should fail because we need actual stHYPE transfer, not just approval
        vm.startPrank(user);

        // Just approve without having balance
        stHypeToken.approve(address(factory), 1000e18);

        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = user;

        // Should revert due to insufficient balance
        vm.expectRevert();
        factory.createMarket(params);

        vm.stopPrank();
    }

    // Task 6.3 tests - createMarketWithPermit
    function testFactoryCreateMarketWithPermit() public {
        // Use a known private key for testing
        uint256 privateKey = 0xBEEF;
        address signer = vm.addr(privateKey);

        // Fund signer with native HYPE and wrap to WHYPE
        vm.deal(signer, 2000e18);
        vm.prank(signer);
        whype.deposit{ value: 2000e18 }();

        // Deposit WHYPE to get stHYPE
        vm.startPrank(signer);
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);
        vm.stopPrank();

        // Prepare permit parameters
        uint256 value = 1000e18; // STAKE_PER_MARKET
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = stHypeToken.nonces(signer);

        // Create permit signature using EIP-712
        bytes32 PERMIT_TYPEHASH = keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

        bytes32 structHash =
            keccak256(abi.encode(PERMIT_TYPEHASH, signer, address(factory), value, nonce, deadline));

        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", stHypeToken.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        // Prepare market params
        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = signer;

        // Create market with permit (no prior approval needed!)
        vm.prank(signer);
        address market = factory.createMarketWithPermit(params, deadline, v, r, s);

        // Verify market was created and stake locked
        assertEq(factory.marketCreator(market), signer);
        assertEq(factory.creatorLockedStake(signer), 1000e18);
        assertEq(stHypeToken.balanceOf(address(factory)), 1000e18);
    }

    // Task 6.4 tests - createProtocolMarket
    function testFactoryCreateProtocolMarket() public {
        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.isProtocolMarket = true;

        // Only owner can create protocol markets
        address market = factory.createProtocolMarket(params);

        // Verify no stHYPE was locked
        assertEq(factory.creatorLockedStake(owner), 0);
        assertEq(stHypeToken.balanceOf(address(factory)), 0);
        assertEq(factory.marketCreator(market), owner);

        // Verify market was created as protocol market
        assertTrue(factory.protocolMarkets(market));
    }

    function testFactoryOnlyOwnerCanCreateProtocolMarket() public {
        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.isProtocolMarket = true;

        vm.prank(user);
        vm.expectRevert();
        factory.createProtocolMarket(params);
    }

    // Task 6.5 tests - releaseStake
    function testFactoryReleaseStakeAfterResolution() public {
        // Create market first
        vm.deal(user, 2000e18);
        vm.prank(user);
        whype.deposit{ value: 2000e18 }();
        vm.startPrank(user);
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);
        stHypeToken.approve(address(factory), 1000e18);

        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = user;
        params.window.tEnd = uint64(block.timestamp + 1 hours);
        params.cutoffTime = uint64(block.timestamp + 30 minutes);

        address market = factory.createMarket(params);
        vm.stopPrank();

        // Simulate resolution
        vm.warp(block.timestamp + 2 hours);
        vm.prank(address(oracle));
        ParimutuelMarketImplementation(market).ingestResolution(0, keccak256("data"));

        // Release stake
        uint256 balanceBefore = stHypeToken.balanceOf(user);
        vm.prank(user);
        factory.releaseStake(market);

        // Verify stake was released
        assertEq(factory.creatorLockedStake(user), 0);
        assertEq(stHypeToken.balanceOf(user), balanceBefore + 1000e18);
    }

    function testFactoryCannotReleaseBeforeResolution() public {
        // Create market
        vm.deal(user, 2000e18);
        vm.prank(user);
        whype.deposit{ value: 2000e18 }();
        vm.startPrank(user);
        whype.approve(address(stHypeToken), 2000e18);
        stHypeToken.deposit(2000e18);
        stHypeToken.approve(address(factory), 1000e18);

        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.creator = user;

        address market = factory.createMarket(params);

        // Try to release before resolution
        vm.expectRevert("Market not resolved");
        factory.releaseStake(market);

        vm.stopPrank();
    }

    function testFactoryProtocolMarketsNoStakeRelease() public {
        // Create protocol market
        MarketTypes.MarketParams memory params = createDefaultMarketParams();
        params.isProtocolMarket = true;
        params.window.tEnd = uint64(block.timestamp + 1 hours);
        params.cutoffTime = uint64(block.timestamp + 30 minutes);

        address market = factory.createProtocolMarket(params);

        // Get the actual resolveTime from the market
        ParimutuelMarketImplementation marketContract = ParimutuelMarketImplementation(market);
        uint64 resolveTime = marketContract.resolveTime();

        // Warp past resolveTime
        vm.warp(resolveTime + 1);
        vm.prank(address(oracle));
        marketContract.ingestResolution(0, keccak256("data"));

        // Try to release stake (should fail as no stake was locked for protocol markets)
        vm.expectRevert("Protocol market has no stake");
        factory.releaseStake(market);
    }
}
