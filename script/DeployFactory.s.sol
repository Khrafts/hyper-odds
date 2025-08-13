// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";
import { MarketFactory } from "../src/MarketFactory.sol";

contract DeployFactory is Script {
    function run() external {
        // Load environment variables
        address stakeToken = vm.envAddress("STAKE_TOKEN");
        address sthype = vm.envAddress("STHYPE");
        address treasury = vm.envAddress("TREASURY");
        address oracle = vm.envAddress("ORACLE");
        address owner = vm.envOr("OWNER", msg.sender);
        
        console.log("Deploying MarketFactory...");
        console.log("Stake Token:", stakeToken);
        console.log("stHYPE:", sthype);
        console.log("Treasury:", treasury);
        console.log("Oracle:", oracle);
        console.log("Owner:", owner);
        
        vm.startBroadcast();
        
        // Deploy ParimutuelMarketImplementation
        console.log("Deploying ParimutuelMarketImplementation...");
        ParimutuelMarketImplementation implementation = new ParimutuelMarketImplementation();
        console.log("Implementation deployed at:", address(implementation));
        
        // Deploy MarketFactory
        console.log("Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory(
            stakeToken,
            sthype,
            treasury,
            oracle
        );
        console.log("MarketFactory deployed at:", address(factory));
        
        // Set implementation
        console.log("Setting implementation...");
        factory.setImplementation(address(implementation));
        
        // Transfer ownership if needed
        if (owner != msg.sender) {
            console.log("Transferring ownership to:", owner);
            factory.transferOwnership(owner);
        }
        
        vm.stopBroadcast();
        
        // Verify configuration
        console.log("Implementation set:", factory.implementation());
        console.log("Stake per market:", factory.STAKE_PER_MARKET());
    }
}