// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracle {
    function commit(address market, uint8 outcome, bytes32 dataHash) external;
    function finalize(address market) external;
}
