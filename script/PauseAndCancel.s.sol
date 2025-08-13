// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { ParimutuelMarketImplementation } from "../src/ParimutuelMarketImplementation.sol";

contract PauseAndCancel is Script {
    function run() external {
        // Load market address from environment or command line
        address marketAddress = vm.envAddress("MARKET");
        bool shouldPause = vm.envBool("PAUSE");
        bool shouldUnpause = vm.envBool("UNPAUSE");
        bool shouldCancel = vm.envBool("CANCEL");
        
        ParimutuelMarketImplementation market = ParimutuelMarketImplementation(marketAddress);
        
        console.log("Market:", marketAddress);
        console.log("Current paused state:", market.paused());
        
        vm.startBroadcast();
        
        // Handle pause/unpause
        if (shouldPause && !market.paused()) {
            console.log("Pausing market...");
            market.pause();
            console.log("Market paused");
        } else if (shouldUnpause && market.paused()) {
            console.log("Unpausing market...");
            market.unpause();
            console.log("Market unpaused");
        }
        
        // Handle cancel (only if not resolved)
        if (shouldCancel) {
            // Check if market is already resolved
            if (market.resolved()) {
                console.log("ERROR: Market is already resolved, cannot cancel");
            } else {
                console.log("Cancelling market and refunding all deposits...");
                market.cancelAndRefund();
                console.log("Market cancelled, all deposits refunded");
            }
        }
        
        vm.stopBroadcast();
        
        // Print final state
        console.log("Final paused state:", market.paused());
        if (shouldCancel && !market.resolved()) {
            console.log("Market has been cancelled");
        }
    }
    
    function help() external pure {
        console.log("Usage:");
        console.log("  Set MARKET=<address> to specify the market");
        console.log("  Set PAUSE=true to pause the market");
        console.log("  Set UNPAUSE=true to unpause the market");
        console.log("  Set CANCEL=true to cancel and refund the market");
        console.log("");
        console.log("Examples:");
        console.log("  MARKET=0x123... PAUSE=true forge script script/PauseAndCancel.s.sol");
        console.log("  MARKET=0x123... UNPAUSE=true forge script script/PauseAndCancel.s.sol");
        console.log("  MARKET=0x123... CANCEL=true forge script script/PauseAndCancel.s.sol");
    }
}