// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { MockHYPE } from "./MockHYPE.sol";

contract MockHyperLiquidStaking {
    IERC20 public hypeToken;
    mapping(address => uint256) public balanceOf;
    uint256 public totalStaked;
    uint256 public rewardRate = 100; // 1% rewards per action for testing

    constructor(address _hypeToken) {
        hypeToken = IERC20(_hypeToken);
    }

    function stake(uint256 amount) external {
        hypeToken.transferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        totalStaked += amount;
    }

    function unstake(uint256 amount) external {
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
        uint256 rewards = (amount * rewardRate) / 10000;
        uint256 totalAmount = amount + rewards;
        
        // Mint rewards to this contract first (simulate rewards accrual)
        MockHYPE(address(hypeToken)).mint(address(this), rewards);
        
        // Transfer back with rewards
        hypeToken.transfer(msg.sender, totalAmount);
    }

    function getRewards(address account) external view returns (uint256) {
        // Simulate 1% rewards on staked balance
        return (balanceOf[account] * rewardRate) / 10000;
    }

    function setRewardRate(uint256 newRate) external {
        rewardRate = newRate;
    }
}