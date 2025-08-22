// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/types/MarketParams.sol";
import "../src/staking/stHYPE.sol";

contract CreateMultipleMarkets is Script {
    MarketFactory factory;
    stHYPE stHypeToken;
    address deployer;
    uint64 resolveTime;
    uint64 cutoffTime;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);
        
        // Deployed contract addresses on Arbitrum Sepolia
        address factoryAddress = 0x00e5A2346C96da6C54f53d2d53bD5536D53Fae5D;
        address stHypeAddress = 0xca185ec9f895E1710003204363e91D5C60ACc7b9;
        
        factory = MarketFactory(factoryAddress);
        stHypeToken = stHYPE(payable(stHypeAddress));
        
        // Calculate times: August 20, 2025 at 12:00 UTC (2 days from now)
        resolveTime = uint64(block.timestamp + 2 days);
        cutoffTime = uint64(block.timestamp + 1 days + 12 hours);
        
        console.log("Creating markets that resolve on:", resolveTime);
        console.log("Betting cutoff:", cutoffTime);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Mint and approve stHYPE for all markets
        stHypeToken.testnetMint(deployer, 6000 ether);
        stHypeToken.approve(factoryAddress, 6000 ether);
        
        // Create markets
        createBTCMarket();
        createETHMarket();
        createHLVolumeMarket();
        createHYPEMarket();
        createHLUsersMarket();
        createSOLMarket();
        
        vm.stopBroadcast();
        
        console.log("\n=== All 6 markets created successfully! ===");
        console.log("Resolution date: August 20, 2025");
    }
    
    function createBTCMarket() internal {
        console.log("\n=== Creating BTC Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will Bitcoin be above $65,000 on August 20, 2025?";
        params.description = "Prediction market on Bitcoin price reaching $65,000 by August 20, 2025 12:00 UTC";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.TOKEN_PRICE;
        params.subject.metricId = bytes32("BTC_USD");
        params.subject.token = address(0);
        params.subject.valueDecimals = 8;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 65000 * 1e8;
        
        params.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        params.window.tStart = uint64(block.timestamp);
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("COINBASE");
        params.oracle.fallbackSourceId = bytes32("BINANCE");
        params.oracle.roundingDecimals = 2;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 50000 * 1e6;
        params.econ.timeDecayBps = 2500;
        
        address market = factory.createParimutuelMarket(params);
        console.log("BTC market created:", market);
    }
    
    function createETHMarket() internal {
        console.log("\n=== Creating ETH Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will Ethereum be above $4,000 on August 20, 2025?";
        params.description = "Prediction market on Ethereum price reaching $4,000 by August 20, 2025 12:00 UTC";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.TOKEN_PRICE;
        params.subject.metricId = bytes32("ETH_USD");
        params.subject.token = address(0);
        params.subject.valueDecimals = 8;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 4000 * 1e8;
        
        params.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        params.window.tStart = uint64(block.timestamp);
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("COINBASE");
        params.oracle.fallbackSourceId = bytes32("BINANCE");
        params.oracle.roundingDecimals = 2;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 40000 * 1e6;
        params.econ.timeDecayBps = 2500;
        
        address market = factory.createParimutuelMarket(params);
        console.log("ETH market created:", market);
    }
    
    function createHLVolumeMarket() internal {
        console.log("\n=== Creating HyperLiquid Volume Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will HyperLiquid daily volume exceed $500M on August 20, 2025?";
        params.description = "Prediction on HyperLiquid DEX achieving over $500M in 24h trading volume";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.HL_METRIC;
        params.subject.metricId = bytes32("DAILY_VOLUME_USD");
        params.subject.token = address(0);
        params.subject.valueDecimals = 6;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 500000000 * 1e6;
        
        params.window.kind = MarketTypes.WindowKind.WINDOW_SUM;
        params.window.tStart = resolveTime - 24 hours;
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("HYPERLIQUID_API");
        params.oracle.fallbackSourceId = bytes32("DEFI_LLAMA");
        params.oracle.roundingDecimals = 0;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 30000 * 1e6;
        params.econ.timeDecayBps = 3000;
        
        address market = factory.createParimutuelMarket(params);
        console.log("HyperLiquid Volume market created:", market);
    }
    
    function createHYPEMarket() internal {
        console.log("\n=== Creating HYPE Token Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will HYPE token be above $30 on August 20, 2025?";
        params.description = "Prediction market on HYPE token price exceeding $30 by August 20, 2025";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.TOKEN_PRICE;
        params.subject.metricId = bytes32("HYPE_USD");
        params.subject.token = address(0);
        params.subject.valueDecimals = 8;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 30 * 1e8;
        
        params.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        params.window.tStart = uint64(block.timestamp);
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("HYPERLIQUID_API");
        params.oracle.fallbackSourceId = bytes32("COINGECKO");
        params.oracle.roundingDecimals = 2;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 25000 * 1e6;
        params.econ.timeDecayBps = 2500;
        
        address market = factory.createParimutuelMarket(params);
        console.log("HYPE token market created:", market);
    }
    
    function createHLUsersMarket() internal {
        console.log("\n=== Creating HyperLiquid Users Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will HyperLiquid have over 10,000 daily active users on August 20, 2025?";
        params.description = "Prediction on HyperLiquid achieving over 10,000 unique daily active users";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.HL_METRIC;
        params.subject.metricId = bytes32("DAILY_ACTIVE_USERS");
        params.subject.token = address(0);
        params.subject.valueDecimals = 0;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 10000;
        
        params.window.kind = MarketTypes.WindowKind.WINDOW_COUNT;
        params.window.tStart = resolveTime - 24 hours;
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("HYPERLIQUID_API");
        params.oracle.fallbackSourceId = bytes32("DUNE_ANALYTICS");
        params.oracle.roundingDecimals = 0;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 20000 * 1e6;
        params.econ.timeDecayBps = 3000;
        
        address market = factory.createParimutuelMarket(params);
        console.log("HyperLiquid Users market created:", market);
    }
    
    function createSOLMarket() internal {
        console.log("\n=== Creating SOL Market ===");
        
        MarketTypes.MarketParams memory params;
        params.title = "Will Solana be above $200 on August 20, 2025?";
        params.description = "Prediction market on Solana price reaching $200 by August 20, 2025";
        params.cutoffTime = cutoffTime;
        params.creator = deployer;
        params.isProtocolMarket = false;
        
        params.subject.kind = MarketTypes.SubjectKind.TOKEN_PRICE;
        params.subject.metricId = bytes32("SOL_USD");
        params.subject.token = address(0);
        params.subject.valueDecimals = 8;
        
        params.predicate.op = MarketTypes.PredicateOp.GT;
        params.predicate.threshold = 200 * 1e8;
        
        params.window.kind = MarketTypes.WindowKind.SNAPSHOT_AT;
        params.window.tStart = uint64(block.timestamp);
        params.window.tEnd = resolveTime;
        
        params.oracle.primarySourceId = bytes32("COINBASE");
        params.oracle.fallbackSourceId = bytes32("BINANCE");
        params.oracle.roundingDecimals = 2;
        
        params.econ.feeBps = 500;
        params.econ.creatorFeeShareBps = 2000;
        params.econ.maxTotalPool = 35000 * 1e6;
        params.econ.timeDecayBps = 2500;
        
        address market = factory.createParimutuelMarket(params);
        console.log("SOL market created:", market);
    }
}