// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { MarketTypes } from "../src/types/MarketParams.sol";

contract TypesTest is Test {
    using MarketTypes for *;

    function testTypesMarketParamsConstruction() public {
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Will HL volume exceed $1B?",
            description: "Resolves YES if Hyperliquid 24h volume exceeds $1 billion",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("volume_24h"),
                tokenIdentifier: "",
                valueDecimals: 2
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 1_000_000_000 * 100 // $1B with 2 decimals
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: 0,
                tEnd: uint64(block.timestamp + 7 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: keccak256("coingecko_api"),
                roundingDecimals: 0
            }),
            cutoffTime: uint64(block.timestamp + 6 days),
            creator: address(0x123),
            econ: MarketTypes.Economics({
                feeBps: 500, // 5%
                creatorFeeShareBps: 1000, // 10% of protocol fee
                maxTotalPool: 1_000_000e18,
                timeDecayBps: 0 // No time decay for type tests
            }),
            isProtocolMarket: false
        });

        // Verify fields are set correctly
        assertEq(params.title, "Will HL volume exceed $1B?");
        assertEq(params.description, "Resolves YES if Hyperliquid 24h volume exceeds $1 billion");
        assertEq(uint8(params.subject.kind), uint8(MarketTypes.SubjectKind.HL_METRIC));
        assertEq(params.subject.metricId, keccak256("volume_24h"));
        assertEq(params.subject.tokenIdentifier, "");
        assertEq(params.subject.valueDecimals, 2);
        assertEq(uint8(params.predicate.op), uint8(MarketTypes.PredicateOp.GT));
        assertEq(params.predicate.threshold, 1_000_000_000 * 100);
        assertEq(uint8(params.window.kind), uint8(MarketTypes.WindowKind.SNAPSHOT_AT));
        assertEq(params.window.tStart, 0);
        assertTrue(params.window.tEnd > block.timestamp);
        assertEq(params.oracle.primarySourceId, keccak256("hyperliquid_api"));
        assertEq(params.oracle.fallbackSourceId, keccak256("coingecko_api"));
        assertEq(params.oracle.roundingDecimals, 0);
        assertTrue(params.cutoffTime > block.timestamp);
        assertEq(params.creator, address(0x123));
        assertEq(params.econ.feeBps, 500);
        assertEq(params.econ.creatorFeeShareBps, 1000);
        assertEq(params.econ.maxTotalPool, 1_000_000e18);
        assertFalse(params.isProtocolMarket);
    }

    function testTypesEnumValues() public {
        // Test SubjectKind enum
        assertEq(uint8(MarketTypes.SubjectKind.HL_METRIC), 0);
        assertEq(uint8(MarketTypes.SubjectKind.TOKEN_PRICE), 1);

        // Test PredicateOp enum
        assertEq(uint8(MarketTypes.PredicateOp.GT), 0);
        assertEq(uint8(MarketTypes.PredicateOp.GTE), 1);
        assertEq(uint8(MarketTypes.PredicateOp.LT), 2);
        assertEq(uint8(MarketTypes.PredicateOp.LTE), 3);

        // Test WindowKind enum
        assertEq(uint8(MarketTypes.WindowKind.SNAPSHOT_AT), 0);
        assertEq(uint8(MarketTypes.WindowKind.WINDOW_SUM), 1);
        assertEq(uint8(MarketTypes.WindowKind.WINDOW_COUNT), 2);
    }

    function testTypesProtocolMarket() public {
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Daily Volume Market",
            description: "Protocol-created daily volume market",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.HL_METRIC,
                metricId: keccak256("volume_24h"),
                tokenIdentifier: "",
                valueDecimals: 2
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GT,
                threshold: 500_000_000 * 100 // $500M
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: 0,
                tEnd: uint64(block.timestamp + 1 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("hyperliquid_api"),
                fallbackSourceId: bytes32(0),
                roundingDecimals: 0
            }),
            cutoffTime: uint64(block.timestamp + 23 hours),
            creator: address(0x999), // Protocol address
            econ: MarketTypes.Economics({
                feeBps: 500, // Fixed 5%
                creatorFeeShareBps: 1000, // Fixed 10% of protocol fee
                maxTotalPool: 10_000_000e18,
                timeDecayBps: 0 // No time decay for type tests
            }),
            isProtocolMarket: true
        });

        assertTrue(params.isProtocolMarket);
        assertEq(params.econ.feeBps, 500);
        assertEq(params.econ.creatorFeeShareBps, 1000);
    }

    function testTypesTokenPriceMarket() public {
        MarketTypes.MarketParams memory params = MarketTypes.MarketParams({
            title: "Will HYPE reach $30?",
            description: "Resolves YES if HYPE price >= $30 at snapshot time",
            subject: MarketTypes.SubjectParams({
                kind: MarketTypes.SubjectKind.TOKEN_PRICE,
                metricId: bytes32(0),
                tokenIdentifier: "test-token", // HYPE token identifier
                valueDecimals: 8
            }),
            predicate: MarketTypes.PredicateParams({
                op: MarketTypes.PredicateOp.GTE,
                threshold: 30 * 10 ** 8 // $30 with 8 decimals
             }),
            window: MarketTypes.WindowParams({
                kind: MarketTypes.WindowKind.SNAPSHOT_AT,
                tStart: 0,
                tEnd: uint64(block.timestamp + 30 days)
            }),
            oracle: MarketTypes.OracleSpec({
                primarySourceId: keccak256("chainlink_hype_usd"),
                fallbackSourceId: keccak256("pyth_hype_usd"),
                roundingDecimals: 2
            }),
            cutoffTime: uint64(block.timestamp + 29 days),
            creator: address(0x789),
            econ: MarketTypes.Economics({
                feeBps: 500,
                creatorFeeShareBps: 1000,
                maxTotalPool: 500_000e18,
                timeDecayBps: 0 // No time decay for type tests
            }),
            isProtocolMarket: false
        });

        assertEq(uint8(params.subject.kind), uint8(MarketTypes.SubjectKind.TOKEN_PRICE));
        assertEq(params.subject.tokenIdentifier, "test-token");
        assertEq(params.predicate.threshold, 30 * 10 ** 8);
        assertEq(uint8(params.predicate.op), uint8(MarketTypes.PredicateOp.GTE));
    }
}
