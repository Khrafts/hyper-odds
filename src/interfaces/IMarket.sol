// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarket {
    function ingestResolution(uint8 outcome, bytes32 dataHash) external;
}