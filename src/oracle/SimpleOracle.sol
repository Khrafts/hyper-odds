// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IOracle } from "../interfaces/IOracle.sol";
import { IMarket } from "../interfaces/IMarket.sol";

contract SimpleOracle is IOracle, Ownable {
    struct Pending {
        uint8 outcome;
        bytes32 dataHash;
        uint64 commitTime;
        bool committed;
        bool finalized;
    }

    // Storage
    mapping(address => Pending) public pending;
    uint64 public disputeWindow;
    mapping(address => bool) public resolvers;

    // Events
    event Committed(address indexed market, uint8 outcome, bytes32 dataHash, uint64 commitTime);
    event Finalized(address indexed market, uint8 outcome);

    constructor(uint64 _disputeWindow) Ownable(msg.sender) {
        disputeWindow = _disputeWindow;
    }

    function commit(address market, uint8 outcome, bytes32 dataHash) external override {
        // Implementation will be added in Task 4.3
    }

    function finalize(address market) external override {
        // Implementation will be added in Task 4.4
    }
}