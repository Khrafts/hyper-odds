// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";

contract DeployOracle is Script {
    function run() external {
        // Load environment variables
        uint256 disputeWindow = vm.envUint("DISPUTE_WINDOW");
        address resolverEOA = vm.envAddress("RESOLVER_EOA");
        address owner = vm.envOr("OWNER", msg.sender);

        console.log("Deploying SimpleOracle...");
        console.log("Dispute Window:", disputeWindow, "seconds");
        console.log("Resolver EOA:", resolverEOA);
        console.log("Owner:", owner);

        vm.startBroadcast();

        // Deploy SimpleOracle
        SimpleOracle oracle = new SimpleOracle(uint64(disputeWindow));

        console.log("SimpleOracle deployed at:", address(oracle));

        // Set resolver
        console.log("Setting resolver:", resolverEOA);
        oracle.setResolver(resolverEOA, true);

        // Transfer ownership if needed
        if (owner != msg.sender) {
            console.log("Transferring ownership to:", owner);
            oracle.transferOwnership(owner);
        }

        vm.stopBroadcast();

        // Verify configuration
        console.log("Dispute window configured:", oracle.disputeWindow());
        console.log("Resolver set:", oracle.resolvers(resolverEOA));
    }
}
