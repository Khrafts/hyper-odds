// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreateMarket_Price is Script {
    function run() external {
        // Load environment variables
        address factoryAddress = vm.envAddress("FACTORY");
        address sthype = vm.envAddress("STHYPE");
        address whypeToken = vm.envAddress("WHYPE_TOKEN");

        MarketFactory factory = MarketFactory(factoryAddress);

        // Build MarketParams for HYPE price > $25 at snapshot
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "HYPE Price > $25",
            description: "Will HYPE token price exceed $25 at the snapshot time?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                tokenIdentifier: "hyperliquid",
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(25e18) // $25 with 18 decimals
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 3 days) // Snapshot in 3 days
             }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("coingecko"),
                fallbackSourceId: keccak256("binance"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 2 days + 12 hours), // 12 hours before snapshot
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500, // 5%
                creatorFeeShareBps: 1000, // 10% of protocol fee
                maxTotalPool: 500_000e18, // 500K stake tokens
                timeDecayBps: 2500 // 25% time decay spread
             }),
            isProtocolMarket: false
        });

        console.log("Creating market for HYPE Price > $25");
        console.log("Factory:", factoryAddress);
        console.log("stHYPE:", sthype);
        console.log("WHYPE Token:", whypeToken);
        console.log("Creator:", msg.sender);

        vm.startBroadcast();

        // Approve stHYPE spending
        uint256 stakeRequired = factory.STAKE_PER_MARKET();
        console.log("Approving", stakeRequired / 1e18, "stHYPE...");
        IERC20(sthype).approve(factoryAddress, stakeRequired);

        // Create market
        console.log("Creating market...");
        address market = factory.createParimutuelMarket(params);

        console.log("Market created at:", market);
        console.log("Title:", params.title);
        console.log("Threshold: $", uint256(params.predicate.threshold) / 1e18);
        console.log("Snapshot time:", params.window.tEnd);
        console.log("Cutoff time:", params.cutoffTime);
        console.log("Resolve time:", params.window.tEnd);

        vm.stopBroadcast();
    }
}
