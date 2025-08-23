// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library MarketTypes {
    enum SubjectKind {
        HL_METRIC,
        TOKEN_PRICE
    }

    enum PredicateOp {
        GT,
        GTE,
        LT,
        LTE
    }

    enum WindowKind {
        SNAPSHOT_AT,
        WINDOW_SUM,
        WINDOW_COUNT
    }

    struct SubjectParams {
        SubjectKind kind;
        bytes32 metricId;
        bytes32 tokenIdentifier; // Changed from address to bytes32 for CMC ID/symbol
        uint8 valueDecimals;
    }

    struct PredicateParams {
        PredicateOp op;
        int256 threshold;
    }

    struct WindowParams {
        WindowKind kind;
        uint64 tStart;
        uint64 tEnd;
    }

    struct OracleSpec {
        bytes32 primarySourceId;
        bytes32 fallbackSourceId;
        uint8 roundingDecimals;
    }

    struct Economics {
        uint16 feeBps;
        uint16 creatorFeeShareBps;
        uint256 maxTotalPool;
        uint16 timeDecayBps;
    }

    struct MarketParams {
        string title;
        string description;
        SubjectParams subject;
        PredicateParams predicate;
        WindowParams window;
        OracleSpec oracle;
        uint64 cutoffTime;
        address creator;
        Economics econ;
        bool isProtocolMarket;
    }
}
