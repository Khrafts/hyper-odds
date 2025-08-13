// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TestOwnable is Ownable {
    constructor(address owner) Ownable(owner) { }
}

contract TestPausable is Pausable, Ownable {
    constructor() Ownable(msg.sender) { }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function requireNotPaused() external view whenNotPaused {
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

    function testOwnableInitialOwner() public view {
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

    function testPausableInitialState() public view {
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
        vm.expectRevert();
        reentrancyGuard.attemptReentry();

        // Counter should still be 1 since the reentrant call reverted
        assertEq(reentrancyGuard.counter(), 1);
    }
}
