// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import { ParimutuelMarketImplementation } from "./ParimutuelMarketImplementation.sol";

/**
 * @title MarketRouter
 * @notice Router contract to improve UX by eliminating per-market approvals
 * @dev Users approve USDC to this router once, then can deposit to any market
 * 
 * Architecture:
 * - Users approve USDC to Router once
 * - Router calls depositFor() on markets
 * - Markets track actual users, not the router
 * - Users can claim winnings directly from markets
 */
contract MarketRouter {
    using SafeERC20 for IERC20;

    struct DepositParams {
        address market;
        uint8 outcome;
        uint256 amount;
    }

    event RouterDeposit(address indexed user, address indexed market, uint8 outcome, uint256 amount);

    function depositToMarket(
        address market,
        uint8 outcome,
        uint256 amount
    ) external {
        _deposit(market, outcome, amount);
    }

    function depositToMultiple(
        DepositParams[] calldata deposits
    ) external {
        for (uint256 i = 0; i < deposits.length; i++) {
            _deposit(deposits[i].market, deposits[i].outcome, deposits[i].amount);
        }
    }

    function depositWithPermit(
        address market,
        uint8 outcome,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20 token = ParimutuelMarketImplementation(market).stakeToken();
        
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        
        _deposit(market, outcome, amount);
    }

    function depositMultipleWithPermit(
        DepositParams[] calldata deposits,
        uint256 totalAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deposits.length > 0, "Empty deposits");
        
        IERC20 token = ParimutuelMarketImplementation(deposits[0].market).stakeToken();
        
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            totalAmount,
            deadline,
            v,
            r,
            s
        );
        
        for (uint256 i = 0; i < deposits.length; i++) {
            _deposit(deposits[i].market, deposits[i].outcome, deposits[i].amount);
        }
    }

    function _deposit(
        address market,
        uint8 outcome,
        uint256 amount
    ) private {
        IERC20 token = ParimutuelMarketImplementation(market).stakeToken();
        
        // Transfer from user to router
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve market to spend
        token.safeIncreaseAllowance(market, amount);
        
        // Deposit on behalf of the actual user
        ParimutuelMarketImplementation(market).depositFor(msg.sender, outcome, amount);
        
        emit RouterDeposit(msg.sender, market, outcome, amount);
    }

    function rescueToken(address token, address to, uint256 amount) external {
        require(msg.sender == to, "Can only rescue to self");
        IERC20(token).safeTransfer(to, amount);
    }
}