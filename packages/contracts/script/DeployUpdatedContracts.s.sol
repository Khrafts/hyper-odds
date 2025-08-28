// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/ParimutuelMarketImplementation.sol";
import "../src/CPMMMarketImplementation.sol";

contract DeployUpdatedContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Get existing contract addresses from env
        address stakeToken = vm.envAddress("STAKE_TOKEN"); // Use existing USDC
        address stHYPE = vm.envAddress("STHYPE"); // Use existing stHYPE
        address treasury = vm.envOr("TREASURY", deployer);
        address oracle = vm.envAddress("ORACLE"); // Use existing oracle

        console.log("Deploying updated contracts with:");
        console.log("  Deployer:", deployer);
        console.log("  StakeToken (USDC):", stakeToken);
        console.log("  stHYPE:", stHYPE);
        console.log("  Treasury:", treasury);
        console.log("  Oracle:", oracle);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new Parimutuel implementation
        console.log("\n1. Deploying new ParimutuelMarketImplementation...");
        ParimutuelMarketImplementation parimutuelImpl = new ParimutuelMarketImplementation();
        console.log("  ParimutuelImplementation:", address(parimutuelImpl));

        // 2. Deploy new CPMM implementation
        console.log("\n2. Deploying new CPMMMarketImplementation...");
        CPMMMarketImplementation cpmmImpl = new CPMMMarketImplementation();
        console.log("  CPMMImplementation:", address(cpmmImpl));

        // 3. Deploy new Factory with bug fixes
        console.log("\n3. Deploying new MarketFactory...");
        MarketFactory factory = new MarketFactory(
            stakeToken, // USDC
            stHYPE, // stHYPE
            treasury, // treasury
            oracle // oracle
        );
        console.log("  Factory:", address(factory));

        // 4. Set both implementations
        console.log("\n4. Setting implementations...");
        factory.setParimutuelImplementation(address(parimutuelImpl));
        factory.setCPMMImplementation(address(cpmmImpl));
        console.log("  Set ParimutuelImplementation");
        console.log("  Set CPMMImplementation");

        // 5. Verify minimum CPMM liquidity setting
        uint256 minLiquidity = factory.minCPMMLiquidity();
        console.log("\n5. Factory configuration:");
        console.log("  minCPMMLiquidity:", minLiquidity);
        console.log("  minCPMMLiquidity (USDC):", minLiquidity / 1e6);

        vm.stopBroadcast();

        // 6. Output addresses for env file
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("FACTORY=", address(factory));
        console.log("PARIMUTUEL_IMPLEMENTATION=", address(parimutuelImpl));
        console.log("CPMM_IMPLEMENTATION=", address(cpmmImpl));
        console.log("MARKET_IMPLEMENTATION=", address(parimutuelImpl)); // Legacy compatibility
    }
}
