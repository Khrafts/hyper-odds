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
        require(resolvers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(!pending[market].committed, "Already committed");
        require(outcome <= 1, "Invalid outcome");
        
        pending[market] = Pending({
            outcome: outcome,
            dataHash: dataHash,
            commitTime: uint64(block.timestamp),
            committed: true,
            finalized: false
        });
        
        emit Committed(market, outcome, dataHash, uint64(block.timestamp));
    }

    function finalize(address market) external override {
        Pending storage p = pending[market];
        require(p.committed, "Not committed");
        require(!p.finalized, "Already finalized");
        require(block.timestamp >= p.commitTime + disputeWindow, "Dispute window not elapsed");
        
        p.finalized = true;
        
        IMarket(market).ingestResolution(p.outcome, p.dataHash);
        
        emit Finalized(market, p.outcome);
    }
}