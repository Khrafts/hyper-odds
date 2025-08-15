// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreateMarket is Script {
    function run() external {
        // Load environment variables
        address factoryAddress = vm.envAddress("FACTORY");
        address sthype = vm.envAddress("STHYPE");

        MarketFactory factory = MarketFactory(factoryAddress);

        // Build MarketParams for HL daily volume > $100M
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "HL Daily Volume > $100M",
            description: "Will HyperLiquid's 24h trading volume exceed $100 million?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("volume_24h"),
                token: address(0),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(100_000_000e18) // $100M with 18 decimals
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 23 hours), // 1 hour before resolution
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500, // 5%
                creatorFeeShareBps: 1000, // 10% of protocol fee
                maxTotalPool: 1_000_000e18, // 1M stake tokens
                timeDecayBps: 2500 // 25% time decay spread
             }),
            isProtocolMarket: false
        });

        console.log("Creating market for HL Daily Volume > $100M");
        console.log("Factory:", factoryAddress);
        console.log("stHYPE:", sthype);
        console.log("Creator:", msg.sender);

        vm.startBroadcast();

        // Approve stHYPE spending
        uint256 stakeRequired = factory.STAKE_PER_MARKET();
        console.log("Approving", stakeRequired / 1e18, "stHYPE...");
        IERC20(sthype).approve(factoryAddress, stakeRequired);

        // Create market
        console.log("Creating market...");
        address market = factory.createMarket(params);

        console.log("Market created at:", market);
        console.log("Title:", params.title);
        console.log("Cutoff time:", params.cutoffTime);
        console.log("Resolve time:", params.window.tEnd);

        vm.stopBroadcast();
    }
}
