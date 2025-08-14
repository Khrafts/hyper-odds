// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/staking/MockWHYPE.sol";
import "../src/staking/MockHyperLiquidStaking.sol";
import "../src/staking/stHYPE.sol";
import "../test/mocks/MockERC20.sol";
import "../src/Oracle.sol";
import "../src/MarketFactory.sol";
import "../src/ParimutuelMarketImplementation.sol";
import "../src/interfaces/IMarketFactory.sol";
import "../src/types/MarketTypes.sol";

contract TestnetDeploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get config from env
        address treasury = vm.envOr("TREASURY", deployer);
        address resolverEOA = vm.envOr("RESOLVER_EOA", deployer);
        
        console.log("Deploying to testnet with:");
        console.log("  Deployer:", deployer);
        console.log("  Treasury:", treasury);
        console.log("  Resolver:", resolverEOA);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Mock tokens for testnet
        console.log("\n1. Deploying Mock Tokens...");
        MockWHYPE whype = new MockWHYPE();
        console.log("  MockWHYPE:", address(whype));
        
        MockERC20 mockUSDC = new MockERC20("Mock USDC", "USDC", 6);
        console.log("  MockUSDC:", address(mockUSDC));
        
        MockHyperLiquidStaking hlStaking = new MockHyperLiquidStaking();
        console.log("  MockHLStaking:", address(hlStaking));
        
        // 2. Deploy stHYPE
        console.log("\n2. Deploying stHYPE...");
        stHYPE stHypeToken = new stHYPE(address(whype), address(hlStaking));
        console.log("  stHYPE:", address(stHypeToken));
        
        // 3. Deploy Oracle
        console.log("\n3. Deploying Oracle...");
        Oracle oracle = new Oracle(600); // 10 minute dispute window for testnet
        oracle.addResolver(resolverEOA, true);
        console.log("  Oracle:", address(oracle));
        console.log("  Resolver added:", resolverEOA);
        
        // 4. Deploy Market Implementation
        console.log("\n4. Deploying Market Implementation...");
        ParimutuelMarketImplementation implementation = new ParimutuelMarketImplementation();
        console.log("  Implementation:", address(implementation));
        
        // 5. Deploy Factory
        console.log("\n5. Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory(
            address(implementation),
            address(stHypeToken),
            address(oracle),
            treasury,
            address(mockUSDC)
        );
        console.log("  Factory:", address(factory));
        
        // 6. Mint test tokens
        console.log("\n6. Minting test tokens...");
        whype.mint(deployer, 10000 * 1e18);
        mockUSDC.mint(deployer, 10000 * 1e6);
        console.log("  Minted 10,000 WHYPE to deployer");
        console.log("  Minted 10,000 USDC to deployer");
        
        // 7. Create a test market
        console.log("\n7. Creating test market...");
        
        // Approve stHYPE to spend WHYPE for staking
        whype.approve(address(stHypeToken), 100 * 1e18);
        
        // Deposit WHYPE to get stHYPE
        stHypeToken.deposit(100 * 1e18, deployer);
        
        // Approve factory to spend stHYPE
        stHypeToken.approve(address(factory), 100 * 1e18);
        
        // Create market params
        MarketParams memory params = MarketParams({
            title: "Will ETH be above $3000 in 1 hour?",
            description: "Test market for testnet deployment",
            subject: SubjectParams({
                kind: SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                token: address(0), // ETH
                valueDecimals: 8
            }),
            predicate: PredicateParams({
                op: PredicateOp.GT,
                threshold: 3000 * 1e8 // $3000 with 8 decimals
            }),
            window: WindowParams({
                kind: WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 hours)
            }),
            oracle: OracleParams({
                primarySourceId: bytes32("COINBASE"),
                fallbackSourceId: bytes32("BINANCE"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 30 minutes),
            creator: deployer,
            econ: EconomicsParams({
                feeBps: 500, // 5%
                creatorFeeShareBps: 2000, // 20% of fees
                maxTotalPool: 1000000 * 1e6 // 1M USDC max
            }),
            isProtocolMarket: false
        });
        
        address market = factory.createMarket(params);
        console.log("  Test market created:", market);
        
        vm.stopBroadcast();
        
        // Print summary
        console.log("\n========================================");
        console.log("TESTNET DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("\nSave these addresses:");
        console.log("{\n");
        console.log('  "mockWHYPE": "', address(whype), '",');
        console.log('  "mockUSDC": "', address(mockUSDC), '",');
        console.log('  "mockHLStaking": "', address(hlStaking), '",');
        console.log('  "stHYPE": "', address(stHypeToken), '",');
        console.log('  "oracle": "', address(oracle), '",');
        console.log('  "marketImplementation": "', address(implementation), '",');
        console.log('  "factory": "', address(factory), '",');
        console.log('  "testMarket": "', market, '"');
        console.log("}\n");
        console.log("\nNext steps:");
        console.log("1. Update indexer/subgraph.yaml with factory address");
        console.log("2. Update runner/.env with oracle and factory addresses");
        console.log("3. Deploy subgraph to Goldsky");
        console.log("4. Start runner service");
    }
}