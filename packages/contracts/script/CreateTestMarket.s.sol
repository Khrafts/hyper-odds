// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/types/MarketParams.sol";
import "../src/staking/stHYPE.sol";

contract CreateTestMarket is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get deployed addresses from env
        address factoryAddress = vm.envAddress("FACTORY");
        address stHypeAddress = vm.envAddress("STHYPE");
        
        console.log("Creating test market with:");
        console.log("  Deployer:", deployer);
        console.log("  Factory:", factoryAddress);
        console.log("  stHYPE:", stHypeAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MarketFactory factory = MarketFactory(factoryAddress);
        stHYPE stHypeToken = stHYPE(payable(stHypeAddress));
        
        // Mint stHYPE for market creation (1001 tokens)
        console.log("Minting stHYPE for market creation...");
        stHypeToken.testnetMint(deployer, 1001 ether);
        
        // Approve factory to spend stHYPE
        console.log("Approving factory to spend stHYPE...");
        stHypeToken.approve(factoryAddress, 1001 ether);
        
        // Create market params - resolving in 2 hours
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Will BTC be above $45000 in 2 hours?",
            description: "Test market for webhook integration",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                token: address(0), // BTC
                valueDecimals: 8
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 45000 * 1e8 // $45000 with 8 decimals
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
                maxTotalPool: 100000 * 1e6, // 100k USDC max
                timeDecayBps: 3000 // 30% time decay spread for test markets
            }),
            isProtocolMarket: false
        });
        
        console.log("Creating market...");
        address market = factory.createParimutuelMarket(params);
        console.log("Market created:", market);
        
        vm.stopBroadcast();
        
        console.log("\nMarket will resolve at:", block.timestamp + 2 hours);
        console.log("Current timestamp:", block.timestamp);
    }
}