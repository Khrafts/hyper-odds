// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

interface IstHYPE is IERC4626, IERC20Permit {
    // Additional functions beyond ERC4626
    function exchangeRate() external view returns (uint256);

    // Backward compatibility functions
    function deposit(uint256 hypeAmount) external returns (uint256 stHypeAmount);
    function withdraw(uint256 stHypeAmount) external returns (uint256 hypeAmount);
}
