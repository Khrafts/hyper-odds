// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MarketRouter.sol";

contract DeployRouter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Router with:");
        console.log("  Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MarketRouter router = new MarketRouter();
        console.log("Router deployed at:", address(router));
        
        vm.stopBroadcast();
        
        console.log("\n========================================");
        console.log("ROUTER DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Router address:", address(router));
    }
}