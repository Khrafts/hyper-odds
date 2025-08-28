// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHyperLiquidStaking } from "../../src/interfaces/IHyperLiquidStaking.sol";

contract MockHyperLiquidStaking is IHyperLiquidStaking {
    mapping(address => uint256) public balanceOf;
    uint256 public totalStaked;
    uint256 public rewardRate = 100; // 1% rewards per action for testing

    function stake(uint256 amount) external payable override {
        require(msg.value == amount, "Value mismatch");
        balanceOf[msg.sender] += amount;
        totalStaked += amount;
    }

    function unstake(uint256 amount) external override {
        // For simplicity in testing, we'll allow unstaking if total is sufficient
        require(totalStaked >= amount, "Insufficient total stake");

        // Reduce balance of the caller
        if (balanceOf[msg.sender] >= amount) {
            balanceOf[msg.sender] -= amount;
        } else {
            balanceOf[msg.sender] = 0;
        }
        totalStaked -= amount;

        // Add some rewards (1% for testing)
        uint256 rewards = (amount * rewardRate) / 10_000;
        uint256 totalAmount = amount + rewards;

        // Send native HYPE back with rewards
        (bool success,) = msg.sender.call{ value: totalAmount }("");
        require(success, "Transfer failed");
    }

    function getRewards(address account) external view override returns (uint256) {
        // Simulate 1% rewards on staked balance
        return (balanceOf[account] * rewardRate) / 10_000;
    }

    function setRewardRate(uint256 newRate) external {
        rewardRate = newRate;
    }

    // Allow contract to receive native HYPE
    receive() external payable { }
}
