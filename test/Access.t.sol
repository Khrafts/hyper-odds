// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Ownable } from "../src/access/Ownable.sol";
import { Pausable } from "../src/access/Pausable.sol";
import { ReentrancyGuard } from "../src/access/ReentrancyGuard.sol";

contract TestOwnable is Ownable {
    constructor(address owner) Ownable(owner) { }
}

contract TestPausable is Pausable {
    function pause() external {
        _setPaused(true);
    }

    function unpause() external {
        _setPaused(false);
    }

    function requireNotPaused() external view notPaused {
        // This function will revert if paused
    }
}

contract TestReentrancyGuard is ReentrancyGuard {
    uint256 public counter;
    
    function protectedFunction() external nonReentrant {
        counter++;
    }
    
    function attemptReentry() external nonReentrant {
        counter++;
        // Try to re-enter
        this.protectedFunction();
    }
}

contract AccessTest is Test {
    TestOwnable ownable;
    TestPausable pausable;
    TestReentrancyGuard reentrancyGuard;
    
    address owner = address(0x1);
    address user = address(0x2);
    
    function setUp() public {
        ownable = new TestOwnable(owner);
        pausable = new TestPausable();
        reentrancyGuard = new TestReentrancyGuard();
    }
    
    function testOwnableInitialOwner() public {
        assertEq(ownable.owner(), owner);
    }
    
    function testOwnableTransferOwnership() public {
        vm.prank(owner);
        ownable.transferOwnership(user);
        assertEq(ownable.owner(), user);
    }
    
    function testOwnableOnlyOwnerReverts() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        ownable.transferOwnership(user);
    }
    
    function testOwnableRenounceOwnership() public {
        vm.prank(owner);
        ownable.renounceOwnership();
        assertEq(ownable.owner(), address(0));
    }
    
    function testOwnableInvalidOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new TestOwnable(address(0));
    }
    
    function testPausableInitialState() public {
        assertFalse(pausable.paused());
    }
    
    function testPausableToggle() public {
        pausable.pause();
        assertTrue(pausable.paused());
        
        pausable.unpause();
        assertFalse(pausable.paused());
    }
    
    function testPausableNotPausedModifier() public {
        pausable.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        pausable.requireNotPaused();
        
        pausable.unpause();
        pausable.requireNotPaused(); // Should not revert
    }
    
    function testReentrancyGuardPreventsReentrancy() public {
        // Should be able to call normally
        reentrancyGuard.protectedFunction();
        assertEq(reentrancyGuard.counter(), 1);
        
        // Attempting reentry should revert
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        reentrancyGuard.attemptReentry();
        
        // Counter should still be 1 since the reentrant call reverted
        assertEq(reentrancyGuard.counter(), 1);
    }
}