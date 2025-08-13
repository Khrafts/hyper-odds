// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHyperLiquidStaking {
    function stake(uint256 amount) external payable; // Accepts native HYPE
    function unstake(uint256 amount) external; // Returns native HYPE
    function getRewards(address account) external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}
