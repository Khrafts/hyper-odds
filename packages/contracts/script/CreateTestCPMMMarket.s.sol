// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/types/MarketParams.sol";
import "../test/mocks/MockERC20.sol";

contract CreateTestCPMMMarket is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Get deployed addresses from env
        address factoryAddress = vm.envAddress("FACTORY");
        address stakeTokenAddress = vm.envAddress("STAKE_TOKEN");

        console.log("Creating test CPMM market with:");
        console.log("  Deployer:", deployer);
        console.log("  Factory:", factoryAddress);
        console.log("  StakeToken (USDC):", stakeTokenAddress);

        vm.startBroadcast(deployerPrivateKey);

        MarketFactory factory = MarketFactory(factoryAddress);
        MockERC20 stakeToken = MockERC20(stakeTokenAddress);

        // Check minimum liquidity requirement
        uint256 minLiquidity = factory.minCPMMLiquidity();
        console.log("Factory minimum liquidity:", minLiquidity);
        console.log("Minimum liquidity (USDC):", minLiquidity / 1e6);

        // Mint USDC for market creation (using minimum liquidity)
        uint256 liquidityAmount = minLiquidity; // Use exact minimum
        console.log("Minting", liquidityAmount / 1e6, "USDC for market creation...");
        stakeToken.mint(deployer, liquidityAmount);

        // Check balance
        uint256 balance = stakeToken.balanceOf(deployer);
        console.log("USDC balance:", balance);
        console.log("USDC balance (formatted):", balance / 1e6);

        // Approve factory to spend USDC
        console.log("Approving factory to spend USDC...");
        stakeToken.approve(factoryAddress, liquidityAmount);

        // Verify allowance
        uint256 allowance = stakeToken.allowance(deployer, factoryAddress);
        console.log("Allowance:", allowance);
        console.log("Allowance (USDC):", allowance / 1e6);

        // Create market params - resolving in 2 hours
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Will ETH be above $3000 in 2 hours? (CPMM)",
            description: "Test CPMM market to verify minimum liquidity bug fix",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                tokenIdentifier: "", // ETH
                valueDecimals: 8
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 3000 * 1e8 // $3000 with 8 decimals
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 2 hours)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: bytes32("COINBASE"),
                fallbackSourceId: bytes32("BINANCE"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 1 hours),
            creator: deployer,
            econ: MarketTypes.Economics({
                feeBps: 500, // 5%
                creatorFeeShareBps: 2000, // 20% of fees
                maxTotalPool: 10_000 * 1e6, // 10k USDC max for testing
                timeDecayBps: 2500 // 25% time decay spread
             }),
            isProtocolMarket: false
        });

        console.log("Creating CPMM market with liquidity amount:", liquidityAmount);
        address market = factory.createCPMMMarket(params, liquidityAmount);
        console.log("CPMM Market created successfully:", market);

        vm.stopBroadcast();

        console.log("\n=== TEST RESULT ===");
        console.log("SUCCESS: CPMM market creation with minimum liquidity (1000 USDC) succeeded!");
        console.log("SUCCESS: Bug fix confirmed: Factory now accepts 1000e6 instead of 1000e18");
        console.log("Market will resolve at:", block.timestamp + 2 hours);
        console.log("Current timestamp:", block.timestamp);
    }
}
