// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { stHYPE } from "../src/staking/stHYPE.sol";
import { MockHYPE } from "./mocks/MockHYPE.sol";
import { MockHyperLiquidStaking } from "./mocks/MockHyperLiquidStaking.sol";

contract stHYPETest is Test {
    stHYPE public sthype;
    MockHYPE public hype;
    MockHyperLiquidStaking public staking;
    
    address alice = address(0x1);
    address bob = address(0x2);
    
    function setUp() public {
        hype = new MockHYPE();
        staking = new MockHyperLiquidStaking(address(hype));
        sthype = new stHYPE(address(hype), address(staking));
        
        // Mint HYPE to test users
        hype.mint(alice, 10000e18);
        hype.mint(bob, 10000e18);
    }
    
    function testStHYPEDeposit() public {
        uint256 depositAmount = 1000e18;
        
        vm.startPrank(alice);
        hype.approve(address(sthype), depositAmount);
        
        uint256 sharesBefore = sthype.balanceOf(alice);
        uint256 shares = sthype.deposit(depositAmount);
        uint256 sharesAfter = sthype.balanceOf(alice);
        
        assertEq(shares, depositAmount); // 1:1 initially
        assertEq(sharesAfter - sharesBefore, shares);
        assertEq(sthype.totalSupply(), shares);
        vm.stopPrank();
    }
    
    function testStHYPEWithdraw() public {
        uint256 depositAmount = 1000e18;
        
        // First deposit
        vm.startPrank(alice);
        hype.approve(address(sthype), depositAmount);
        uint256 shares = sthype.deposit(depositAmount);
        
        // Check balance before withdraw
        uint256 hypeBalanceBefore = hype.balanceOf(alice);
        
        // Withdraw
        uint256 assets = sthype.withdraw(shares);
        
        // Should receive deposit + rewards (1% from mock)
        uint256 expectedAssets = depositAmount + (depositAmount * 100) / 10000;
        assertEq(assets, expectedAssets);
        assertEq(hype.balanceOf(alice) - hypeBalanceBefore, assets);
        assertEq(sthype.balanceOf(alice), 0);
        vm.stopPrank();
    }
    
    function testStHYPEExchangeRate() public {
        // Initial exchange rate should be 1:1
        assertEq(sthype.exchangeRate(), 1e18);
        
        // Deposit from alice
        vm.startPrank(alice);
        hype.approve(address(sthype), 1000e18);
        sthype.deposit(1000e18);
        vm.stopPrank();
        
        // Exchange rate changes after deposit due to mock rewards (1%)
        uint256 expectedRate = (1010e18 * 1e18) / 1000e18; // 1.01x
        assertEq(sthype.exchangeRate(), expectedRate);
        
        // Deposit from bob (after alice, so exchange rate matters)
        vm.startPrank(bob);
        hype.approve(address(sthype), 1000e18);
        uint256 bobShares = sthype.deposit(1000e18);
        vm.stopPrank();
        
        // Bob should get fewer shares due to increased exchange rate
        assertLt(bobShares, 1000e18);
    }
    
    function testStHYPEPermit() public {
        uint256 privateKey = 0xBEEF;
        address owner = vm.addr(privateKey);
        
        // Mint HYPE to owner
        hype.mint(owner, 1000e18);
        
        // Deposit first
        vm.startPrank(owner);
        hype.approve(address(sthype), 1000e18);
        sthype.deposit(1000e18);
        vm.stopPrank();
        
        // Create permit signature
        uint256 nonce = sthype.nonces(owner);
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 500e18;
        
        // OpenZeppelin's ERC20Permit uses this typehash
        bytes32 PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                alice,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", sthype.DOMAIN_SEPARATOR(), structHash)
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        
        // Use permit
        sthype.permit(owner, alice, value, deadline, v, r, s);
        
        // Check allowance was set
        assertEq(sthype.allowance(owner, alice), value);
    }
    
    function testStHYPEConversions() public {
        // Test convertToShares and convertToAssets
        
        // Initially 1:1
        assertEq(sthype.convertToShares(1000e18), 1000e18);
        assertEq(sthype.convertToAssets(1000e18), 1000e18);
        
        // After deposit
        vm.startPrank(alice);
        hype.approve(address(sthype), 1000e18);
        sthype.deposit(1000e18);
        vm.stopPrank();
        
        // After deposit, exchange rate changes due to rewards
        // Total assets = 1010e18 (1000 + 1% rewards), shares = 1000e18
        // So 1000e18 assets = 990.099... shares
        uint256 totalAssets = sthype.totalAssets();
        uint256 totalShares = sthype.totalSupply();
        uint256 expectedShares = (1000e18 * totalShares) / totalAssets;
        assertEq(sthype.convertToShares(1000e18), expectedShares);
        
        // And 1000e18 shares = 1010e18 assets
        assertEq(sthype.convertToAssets(1000e18), totalAssets);
    }
    
    function testStHYPETransfer() public {
        // Deposit first
        vm.startPrank(alice);
        hype.approve(address(sthype), 1000e18);
        uint256 shares = sthype.deposit(1000e18);
        
        // Transfer stHYPE to bob
        sthype.transfer(bob, shares / 2);
        
        assertEq(sthype.balanceOf(alice), shares / 2);
        assertEq(sthype.balanceOf(bob), shares / 2);
        vm.stopPrank();
    }
    
    function testStHYPEZeroDeposit() public {
        vm.prank(alice);
        vm.expectRevert(stHYPE.ZeroAmount.selector);
        sthype.deposit(0);
    }
    
    function testStHYPEZeroWithdraw() public {
        vm.prank(alice);
        vm.expectRevert(stHYPE.ZeroShares.selector);
        sthype.withdraw(0);
    }
    
    function testStHYPEInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert(stHYPE.InsufficientBalance.selector);
        sthype.withdraw(100e18);
    }
}