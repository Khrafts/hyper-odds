// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MarketFactory } from "../src/MarketFactory.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";

contract CreateProtocolMarket is Script {
    function run() external {
        // Load environment variables
        address factoryAddress = vm.envAddress("FACTORY");
        
        MarketFactory factory = MarketFactory(factoryAddress);
        
        // Create daily volume, price, and TVL markets
        MarketTypes.MarketParams[] memory markets = new MarketTypes.MarketParams[](3);
        
        // Market 1: Daily Volume > $500M
        markets[0] = MarketTypes.MarketParams({
            title: "HL Daily Volume > $500M",
            description: "Will HyperLiquid's 24h trading volume exceed $500 million?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("volume_24h"),
                token: address(0),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(500_000_000e18)
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
            cutoffTime: uint64(block.timestamp + 23 hours),
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 10_000_000e18
            }),
            isProtocolMarket: true
        });
        
        // Market 2: HYPE Price > $30
        markets[1] = MarketTypes.MarketParams({
            title: "HYPE Price > $30",
            description: "Will HYPE token price exceed $30?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                token: vm.envAddress("WHYPE_TOKEN"),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(30e18)
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 7 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("coingecko"),
                fallbackSourceId: keccak256("binance"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 6 days),
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 5_000_000e18
            }),
            isProtocolMarket: true
        });
        
        // Market 3: TVL > $1B
        markets[2] = MarketTypes.MarketParams({
            title: "HL TVL > $1B",
            description: "Will HyperLiquid's Total Value Locked exceed $1 billion?",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("tvl"),
                token: address(0),
                valueDecimals: 18
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: int256(1_000_000_000e18)
            }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: uint64(block.timestamp),
                tEnd: uint64(block.timestamp + 30 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: keccak256("defillama"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 29 days),
            creator: msg.sender,
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 10_000_000e18
            }),
            isProtocolMarket: true
        });
        
        console.log("Creating protocol markets...");
        console.log("Factory:", factoryAddress);
        console.log("Owner:", msg.sender);
        
        vm.startBroadcast();
        
        for (uint256 i = 0; i < markets.length; i++) {
            console.log("Creating market", i + 1, ":", markets[i].title);
            address market = factory.createProtocolMarket(markets[i]);
            console.log("Market created at:", market);
        }
        
        vm.stopBroadcast();
        
        console.log("All protocol markets created successfully");
    }
}