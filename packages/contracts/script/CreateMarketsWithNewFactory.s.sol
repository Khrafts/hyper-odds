// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/types/MarketParams.sol";
import "../src/staking/stHYPE.sol";

contract CreateMarketsWithNewFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Use the new factory and stHYPE addresses from latest deployment
        address factoryAddress = 0x3f4FdBD7F01e813a57cbbb95A38eAB118CafF6a0;
        address stHypeAddress = 0xa88C085Ab4C90fEa3D915539319E9E00fe8Fef40;
        
        console.log("Creating markets with new factory:");
        console.log("  Deployer:", deployer);
        console.log("  Factory:", factoryAddress);
        console.log("  stHYPE:", stHypeAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MarketFactory factory = MarketFactory(factoryAddress);
        stHYPE stHypeToken = stHYPE(payable(stHypeAddress));
        
        // Mint and approve stHYPE for 2 markets
        stHypeToken.testnetMint(deployer, 2000 ether);
        stHypeToken.approve(factoryAddress, 2000 ether);
        
        // Calculate times: Markets resolve in 2 days
        uint64 resolveTime = uint64(block.timestamp + 2 days);
        uint64 cutoffTime = uint64(block.timestamp + 1 days + 12 hours);
        
        // Market 1: Bitcoin Price Prediction
        console.log("\n=== Creating BTC Market ===");
        MarketTypes.MarketParams memory btcParams;
        btcParams.title = "Will Bitcoin exceed $70,000 by August 20, 2025?";
        btcParams.description = "A prediction market on whether Bitcoin will trade above $70,000 USD on major exchanges by August 20, 2025 at 12:00 UTC";
        btcParams.cutoffTime = cutoffTime;
        btcParams.creator = deployer;
        btcParams.isProtocolMarket = false;
        
        btcParams.subject.kind = MarketTypes.SubjectKind.TOKEN_PRICE;
        btcParams.subject.metricId = bytes32("BTC_USD");
        btcParams.subject.token = address(0);
        btcParams.subject.valueDecimals = 8;
        
        btcParams.predicate.op = MarketTypes.PredicateOp.GT;
        btcParams.predicate.threshold = 70000 * 1e8;
        
        btcParams.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        btcParams.window.tStart = uint64(block.timestamp);
        btcParams.window.tEnd = resolveTime;
        
        btcParams.oracle.primarySourceId = bytes32("COINBASE");
        btcParams.oracle.fallbackSourceId = bytes32("BINANCE");
        btcParams.oracle.roundingDecimals = 2;
        
        btcParams.econ.feeBps = 500;
        btcParams.econ.creatorFeeShareBps = 2000;
        btcParams.econ.maxTotalPool = 100000 * 1e6;
        btcParams.econ.timeDecayBps = 2000;
        
        address btcMarket = factory.createParimutuelMarket(btcParams);
        console.log("BTC market created:", btcMarket);
        
        // Market 2: HyperLiquid TVL Prediction
        console.log("\n=== Creating HyperLiquid TVL Market ===");
        MarketTypes.MarketParams memory hlParams;
        hlParams.title = "Will HyperLiquid TVL exceed $1 billion by August 20?";
        hlParams.description = "Prediction on HyperLiquid protocol achieving over $1 billion in Total Value Locked across all vaults and LP positions";
        hlParams.cutoffTime = cutoffTime;
        hlParams.creator = deployer;
        hlParams.isProtocolMarket = false;
        
        hlParams.subject.kind = MarketTypes.SubjectKind.HL_METRIC;
        hlParams.subject.metricId = bytes32("TOTAL_VALUE_LOCKED");
        hlParams.subject.token = address(0);
        hlParams.subject.valueDecimals = 6;
        
        hlParams.predicate.op = MarketTypes.PredicateOp.GT;
        hlParams.predicate.threshold = 1000000000 * 1e6;
        
        hlParams.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        hlParams.window.tStart = uint64(block.timestamp);
        hlParams.window.tEnd = resolveTime;
        
        hlParams.oracle.primarySourceId = bytes32("HYPERLIQUID_API");
        hlParams.oracle.fallbackSourceId = bytes32("DEFI_LLAMA");
        hlParams.oracle.roundingDecimals = 0;
        
        hlParams.econ.feeBps = 500;
        hlParams.econ.creatorFeeShareBps = 2000;
        hlParams.econ.maxTotalPool = 50000 * 1e6;
        hlParams.econ.timeDecayBps = 3000;
        
        address hlMarket = factory.createParimutuelMarket(hlParams);
        console.log("HyperLiquid TVL market created:", hlMarket);
        
        vm.stopBroadcast();
        
        console.log("\n=== Markets created successfully! ===");
        console.log("These markets now emit title and description in their events");
        console.log("The indexer will properly capture and display them");
    }
}