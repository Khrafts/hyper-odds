// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IHyperLiquidStaking } from "../interfaces/IHyperLiquidStaking.sol";
import { IstHYPE } from "../interfaces/IstHYPE.sol";

contract stHYPE is ERC4626, ERC20Permit, IstHYPE {
    using SafeERC20 for IERC20;
    using Math for uint256;

    IHyperLiquidStaking public immutable hyperLiquidStaking;

    // Errors
    error ZeroAmount();
    error ZeroShares();

    constructor(
        address _hypeToken,
        address _hyperLiquidStaking
    ) 
        ERC4626(IERC20(_hypeToken))
        ERC20("Staked HYPE", "stHYPE") 
        ERC20Permit("Staked HYPE") 
    {
        hyperLiquidStaking = IHyperLiquidStaking(_hyperLiquidStaking);
    }

    // ============ ERC4626 Overrides ============

    function totalAssets() public view override(ERC4626, IERC4626) returns (uint256) {
        // Include staked balance plus any pending rewards
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 rewards = hyperLiquidStaking.getRewards(address(this));
        uint256 unstakedBalance = IERC20(asset()).balanceOf(address(this));
        return stakedBalance + rewards + unstakedBalance;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        // Transfer HYPE from caller
        SafeERC20.safeTransferFrom(IERC20(asset()), caller, address(this), assets);
        
        // Stake HYPE with HyperLiquid
        IERC20(asset()).approve(address(hyperLiquidStaking), assets);
        hyperLiquidStaking.stake(assets);
        
        // Mint shares to receiver
        _mint(receiver, shares);
        
        emit Deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }
        
        // Burn shares from owner
        _burn(owner, shares);
        
        // Get current balance before unstaking
        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        
        // Calculate proportional unstake amount based on actual staked balance
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 unstakeAmount = assets > stakedBalance ? stakedBalance : assets;
        
        // Unstake from HyperLiquid
        if (unstakeAmount > 0) {
            hyperLiquidStaking.unstake(unstakeAmount);
        }
        
        // Calculate actual received amount (includes rewards)
        uint256 actualReceived = IERC20(asset()).balanceOf(address(this)) - balanceBefore;
        
        // If we have more than needed (from rewards), use what we have
        uint256 toTransfer = actualReceived > assets ? assets : actualReceived;
        
        // Transfer HYPE to receiver
        SafeERC20.safeTransfer(IERC20(asset()), receiver, toTransfer);
        
        emit Withdraw(caller, receiver, owner, toTransfer, shares);
    }

    // ============ Additional View Functions ============

    function exchangeRate() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return (totalAssets() * 1e18) / supply;
    }

    // ============ Required Overrides ============

    function decimals() public view override(ERC4626, ERC20, IERC20Metadata) returns (uint8) {
        return super.decimals();
    }

    function nonces(address owner) public view override(ERC20Permit, IERC20Permit) returns (uint256) {
        return super.nonces(owner);
    }

    // ============ Backward Compatibility ============
    
    // Keep these for compatibility with existing code
    function deposit(uint256 assets) external returns (uint256 shares) {
        return deposit(assets, msg.sender);
    }
    
    function withdraw(uint256 shares) external returns (uint256 assets) {
        return redeem(shares, msg.sender, msg.sender);
    }
}