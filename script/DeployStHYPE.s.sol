// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { stHYPE } from "../src/staking/stHYPE.sol";

contract DeployStHYPE is Script {
    function run() external {
        // Load environment variables
        address whypeToken = vm.envAddress("WHYPE_TOKEN");
        address hlStaking = vm.envAddress("HL_STAKING");
        address owner = vm.envOr("OWNER", msg.sender);
        
        console.log("Deploying stHYPE...");
        console.log("WHYPE Token:", whypeToken);
        console.log("HL Staking:", hlStaking);
        console.log("Owner:", owner);
        
        vm.startBroadcast();
        
        // Deploy stHYPE
        stHYPE sthype = new stHYPE(whypeToken, hlStaking);
        
        console.log("stHYPE deployed at:", address(sthype));
        
        // Transfer ownership if needed
        if (owner != msg.sender) {
            console.log("Transferring ownership to:", owner);
            // Note: stHYPE doesn't have Ownable, so no transfer needed
            // If it had Ownable, we would do: sthype.transferOwnership(owner);
        }
        
        vm.stopBroadcast();
        
        // Verify initial exchange rate
        uint256 exchangeRate = sthype.exchangeRate();
        console.log("Initial exchange rate:", exchangeRate);
        console.log("Expected: 1e18 (1:1 initially)");
    }
}