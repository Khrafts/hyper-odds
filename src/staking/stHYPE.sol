// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IHyperLiquidStaking } from "../interfaces/IHyperLiquidStaking.sol";
import { IstHYPE } from "../interfaces/IstHYPE.sol";

contract stHYPE is ERC20, ERC20Permit, IstHYPE {
    using SafeERC20 for IERC20;

    // Staking Storage
    IERC20 public immutable hypeToken;
    IHyperLiquidStaking public immutable hyperLiquidStaking;
    uint256 private _totalAssets;

    // Events
    event Deposit(address indexed from, uint256 assets, uint256 shares);
    event Withdraw(address indexed from, uint256 shares, uint256 assets);

    // Errors
    error ZeroAmount();
    error ZeroShares();
    error InsufficientBalance();

    constructor(
        address _hypeToken,
        address _hyperLiquidStaking
    ) ERC20("Staked HYPE", "stHYPE") ERC20Permit("Staked HYPE") {
        hypeToken = IERC20(_hypeToken);
        hyperLiquidStaking = IHyperLiquidStaking(_hyperLiquidStaking);
    }

    // ============ Core Functions ============

    function deposit(uint256 assets) external returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        
        shares = convertToShares(assets);
        if (shares == 0) revert ZeroShares();

        // Transfer HYPE from user
        hypeToken.safeTransferFrom(msg.sender, address(this), assets);
        
        // Stake HYPE with HyperLiquid
        hypeToken.safeIncreaseAllowance(address(hyperLiquidStaking), assets);
        hyperLiquidStaking.stake(assets);
        
        // Update state
        _totalAssets += assets;
        _mint(msg.sender, shares);
        
        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance();
        
        assets = convertToAssets(shares);
        if (assets == 0) revert ZeroAmount();
        
        // Burn shares first
        _burn(msg.sender, shares);
        
        // Get current balance before unstaking
        uint256 balanceBefore = hypeToken.balanceOf(address(this));
        
        // Calculate proportional unstake amount based on actual staked balance
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 unstakeAmount = assets > stakedBalance ? stakedBalance : assets;
        
        // Unstake from HyperLiquid
        hyperLiquidStaking.unstake(unstakeAmount);
        
        // Calculate actual received amount (includes rewards)
        uint256 actualReceived = hypeToken.balanceOf(address(this)) - balanceBefore;
        
        // Update total assets
        _totalAssets = _totalAssets > unstakeAmount ? _totalAssets - unstakeAmount : 0;
        
        // Transfer HYPE to user
        hypeToken.safeTransfer(msg.sender, actualReceived);
        
        emit Withdraw(msg.sender, shares, actualReceived);
        
        return actualReceived;
    }

    // ============ View Functions ============

    function exchangeRate() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return (totalAssets() * 1e18) / supply;
    }

    function totalAssets() public view returns (uint256) {
        // Include staked balance plus any pending rewards
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 rewards = hyperLiquidStaking.getRewards(address(this));
        return stakedBalance + rewards;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return assets;
        return (assets * supply) / totalAssets();
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
    }

    // ============ Required Overrides ============

    function nonces(address owner) public view override(ERC20Permit, IERC20Permit) returns (uint256) {
        return super.nonces(owner);
    }

    // IstHYPE interface implementation (already inherited from ERC20 and ERC20Permit)
    // The permit function is inherited from ERC20Permit
    // Standard ERC20 functions are inherited from ERC20
}