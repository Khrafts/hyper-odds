// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CPMMMarketImplementation.sol";
import "../src/MarketFactory.sol";

contract DeployNewCPMM is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY");
        
        console.log("=== Deploying New CPMM Implementation ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Current Factory:", factoryAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new CPMM implementation with fixed USDC decimals
        CPMMMarketImplementation newCPMMImpl = new CPMMMarketImplementation();
        console.log("New CPMM Implementation deployed at:", address(newCPMMImpl));
        
        // Verify the fixed constants
        console.log("MIN_TOTAL_LIQUIDITY:", newCPMMImpl.MIN_TOTAL_LIQUIDITY()); // Should be 1000e6
        console.log("MIN_TRADE_AMOUNT:", newCPMMImpl.MIN_TRADE_AMOUNT()); // Should be 1e6
        
        // Update factory to use new implementation
        MarketFactory factory = MarketFactory(factoryAddress);
        factory.setCPMMImplementation(address(newCPMMImpl));
        console.log("Factory updated with new CPMM implementation");
        
        // Verify the update
        address currentImpl = factory.cpmmImplementation();
        require(currentImpl == address(newCPMMImpl), "Implementation not updated");
        console.log("Verified: Factory now uses new implementation at", currentImpl);
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("New CPMM Implementation:", address(newCPMMImpl));
        console.log("Fixed MIN_TOTAL_LIQUIDITY: $1000 (1000e6 USDC)");
        console.log("Fixed MIN_TRADE_AMOUNT: $1 (1e6 USDC)");
        console.log("Factory updated successfully");
    }
}