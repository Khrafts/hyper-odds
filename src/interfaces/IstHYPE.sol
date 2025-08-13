// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

interface IstHYPE is IERC20, IERC20Permit {
    function deposit(uint256 hypeAmount) external returns (uint256 stHypeAmount);
    function withdraw(uint256 stHypeAmount) external returns (uint256 hypeAmount);
    function exchangeRate() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
}