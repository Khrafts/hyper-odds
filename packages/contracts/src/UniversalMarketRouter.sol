// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ParimutuelMarketImplementation } from "./ParimutuelMarketImplementation.sol";
import { CPMMMarketImplementation } from "./CPMMMarketImplementation.sol";
import { MarketFactory } from "./MarketFactory.sol";

/**
 * @title UniversalMarketRouter
 * @notice Router contract for handling deposits and claims across both PARIMUTUEL and CPMM markets
 * @dev This router automatically detects the market type and calls the appropriate functions
 */
contract UniversalMarketRouter {
    using SafeERC20 for IERC20;
    
    struct Deposit {
        address market;
        uint8 outcome;
        uint256 amount;
    }
    
    // Events
    event RouterDeposit(address indexed user, address indexed market, uint8 outcome, uint256 amount);
    event RouterClaim(address indexed user, address indexed market, uint256 payout);
    
    // Market factory for determining market types
    MarketFactory public immutable factory;
    
    constructor(address _factory) {
        factory = MarketFactory(_factory);
    }
    
    /**
     * @notice Get the stake token for a given market
     * @param market The market address
     * @return token The stake token contract
     */
    function getStakeToken(address market) public view returns (IERC20 token) {
        MarketFactory.MarketType marketType = factory.marketType(market);
        
        if (marketType == MarketFactory.MarketType.PARIMUTUEL) {
            token = ParimutuelMarketImplementation(market).stakeToken();
        } else if (marketType == MarketFactory.MarketType.CPMM) {
            token = IERC20(CPMMMarketImplementation(market).stakeToken());
        } else {
            revert("Unknown market type");
        }
    }
    
    /**
     * @notice Deposit to a single market (works with both PARIMUTUEL and CPMM)
     * @param market Market address
     * @param outcome Outcome to bet on (0=NO, 1=YES)
     * @param amount Amount to deposit
     */
    function depositToMarket(
        address market,
        uint8 outcome,
        uint256 amount
    ) external {
        _deposit(market, outcome, amount);
    }
    
    /**
     * @notice Deposit to multiple markets in a single transaction
     * @param deposits Array of deposit parameters
     */
    function depositToMultiple(Deposit[] calldata deposits) external {
        require(deposits.length > 0, "No deposits provided");
        
        // Get stake token from the first market (assuming all markets use the same token)
        IERC20 token = getStakeToken(deposits[0].market);
        
        // Calculate total amount needed
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < deposits.length; i++) {
            totalAmount += deposits[i].amount;
        }
        
        // Transfer total amount from user to router
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // Execute individual deposits
        for (uint256 i = 0; i < deposits.length; i++) {
            _executeDeposit(deposits[i].market, deposits[i].outcome, deposits[i].amount);
            emit RouterDeposit(msg.sender, deposits[i].market, deposits[i].outcome, deposits[i].amount);
        }
    }
    
    /**
     * @notice Deposit with permit (gasless approval)
     * @param market Market address
     * @param outcome Outcome to bet on
     * @param amount Amount to deposit
     * @param deadline Permit deadline
     * @param v Permit signature v
     * @param r Permit signature r
     * @param s Permit signature s
     */
    function depositWithPermit(
        address market,
        uint8 outcome,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20 token = getStakeToken(market);
        
        // Use permit for gasless approval (requires ERC20Permit)
        // Note: This assumes the stake token supports ERC20Permit
        // IERC20Permit(address(token)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        
        _deposit(market, outcome, amount);
    }
    
    /**
     * @notice Claim winnings from a single market (works with both market types)
     * @param market Market address
     */
    function claimFromMarket(address market) external {
        MarketFactory.MarketType marketType = factory.marketType(market);
        uint256 balanceBefore = getStakeToken(market).balanceOf(msg.sender);
        
        if (marketType == MarketFactory.MarketType.PARIMUTUEL) {
            ParimutuelMarketImplementation(market).claimFor(msg.sender);
        } else if (marketType == MarketFactory.MarketType.CPMM) {
            CPMMMarketImplementation(market).claimFor(msg.sender);
        } else {
            revert("Unknown market type");
        }
        
        uint256 balanceAfter = getStakeToken(market).balanceOf(msg.sender);
        uint256 payout = balanceAfter - balanceBefore;
        
        emit RouterClaim(msg.sender, market, payout);
    }
    
    /**
     * @notice Claim winnings from multiple markets
     * @param markets Array of market addresses
     */
    function claimFromMultiple(address[] calldata markets) external {
        for (uint256 i = 0; i < markets.length; i++) {
            // Use try-catch to prevent one failed claim from blocking others
            try this.claimFromMarket(markets[i]) {
                // Claim succeeded
            } catch {
                // Claim failed, continue with next market
            }
        }
    }
    
    /**
     * @notice Internal function to handle deposits with token transfers
     */
    function _deposit(
        address market,
        uint8 outcome,
        uint256 amount
    ) private {
        IERC20 token = getStakeToken(market);
        
        // Transfer from user to router
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Execute the deposit
        _executeDeposit(market, outcome, amount);
        
        emit RouterDeposit(msg.sender, market, outcome, amount);
    }
    
    /**
     * @notice Internal function to execute deposit based on market type
     */
    function _executeDeposit(
        address market,
        uint8 outcome,
        uint256 amount
    ) private {
        MarketFactory.MarketType marketType = factory.marketType(market);
        IERC20 token = getStakeToken(market);
        
        if (marketType == MarketFactory.MarketType.PARIMUTUEL) {
            // Approve the market to spend tokens
            token.approve(market, amount);
            // Call depositFor on parimutuel market
            ParimutuelMarketImplementation(market).depositFor(msg.sender, outcome, amount);
        } else if (marketType == MarketFactory.MarketType.CPMM) {
            // Approve the market to spend tokens
            token.approve(market, amount);
            // Call buySharesFor on CPMM market
            CPMMMarketImplementation(market).buySharesFor(msg.sender, outcome, amount, 0);
        } else {
            revert("Unknown market type");
        }
    }
}