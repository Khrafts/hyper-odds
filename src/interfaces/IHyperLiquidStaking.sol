// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHyperLiquidStaking {
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function getRewards(address account) external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}