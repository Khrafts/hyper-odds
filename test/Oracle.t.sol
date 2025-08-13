// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { SimpleOracle } from "../src/oracle/SimpleOracle.sol";
import { IMarket } from "../src/interfaces/IMarket.sol";

contract MockMarket is IMarket {
    uint8 public outcome;
    bytes32 public dataHash;
    bool public resolutionIngested;
    
    function ingestResolution(uint8 _outcome, bytes32 _dataHash) external override {
        outcome = _outcome;
        dataHash = _dataHash;
        resolutionIngested = true;
    }
}

contract OracleTest is Test {
    SimpleOracle oracle;
    MockMarket market;
    
    address owner = address(this);
    address resolver = address(0x1);
    address user = address(0x2);
    
    uint64 constant DISPUTE_WINDOW = 600;
    
    function setUp() public {
        oracle = new SimpleOracle(DISPUTE_WINDOW);
        market = new MockMarket();
    }
    
    // Task 4.3 tests - commit()
    function testOracleCommitOnlyResolverOrOwner() public {
        // Owner can commit
        oracle.commit(address(market), 1, keccak256("data"));
        
        // Reset for next test
        market = new MockMarket();
        
        // Unauthorized user cannot commit
        vm.prank(user);
        vm.expectRevert("Not authorized");
        oracle.commit(address(market), 1, keccak256("data"));
        
        // Add resolver
        oracle.setResolver(resolver, true);
        
        // Reset market
        market = new MockMarket();
        
        // Resolver can commit
        vm.prank(resolver);
        oracle.commit(address(market), 1, keccak256("data"));
    }
    
    function testOracleCommitPendingSet() public {
        bytes32 testDataHash = keccak256("test data");
        uint8 testOutcome = 1;
        
        oracle.commit(address(market), testOutcome, testDataHash);
        
        (uint8 outcome, bytes32 dataHash, uint64 commitTime, bool committed, bool finalized) 
            = oracle.pending(address(market));
            
        assertEq(outcome, testOutcome);
        assertEq(dataHash, testDataHash);
        assertEq(commitTime, block.timestamp);
        assertTrue(committed);
        assertFalse(finalized);
    }
    
    function testOraclePreventDoubleCommit() public {
        oracle.commit(address(market), 1, keccak256("data"));
        
        vm.expectRevert("Already committed");
        oracle.commit(address(market), 0, keccak256("other data"));
    }
    
    function testOracleInvalidOutcome() public {
        vm.expectRevert("Invalid outcome");
        oracle.commit(address(market), 2, keccak256("data"));
    }
    
    // Task 4.4 tests - finalize()
    function testOracleCannotFinalizeEarly() public {
        oracle.commit(address(market), 1, keccak256("data"));
        
        vm.expectRevert("Dispute window not elapsed");
        oracle.finalize(address(market));
    }
    
    function testOracleFinalizeAfterWindow() public {
        oracle.commit(address(market), 1, keccak256("data"));
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        
        oracle.finalize(address(market));
        
        (,,,, bool finalized) = oracle.pending(address(market));
        assertTrue(finalized);
        
        // Check market was called
        assertTrue(market.resolutionIngested());
        assertEq(market.outcome(), 1);
    }
    
    function testOracleCannotRefinalize() public {
        oracle.commit(address(market), 1, keccak256("data"));
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        oracle.finalize(address(market));
        
        vm.expectRevert("Already finalized");
        oracle.finalize(address(market));
    }
    
    function testOracleCannotFinalizeUncommitted() public {
        vm.expectRevert("Not committed");
        oracle.finalize(address(market));
    }
    
    // Task 4.5 tests - resolver admin
    function testOracleOnlyOwnerCanToggleResolver() public {
        // Owner can set resolver
        oracle.setResolver(resolver, true);
        assertTrue(oracle.resolvers(resolver));
        
        oracle.setResolver(resolver, false);
        assertFalse(oracle.resolvers(resolver));
        
        // Non-owner cannot
        vm.prank(user);
        vm.expectRevert();
        oracle.setResolver(resolver, true);
    }
    
    function testOracleResolversReadCorrectly() public {
        assertFalse(oracle.resolvers(resolver));
        
        oracle.setResolver(resolver, true);
        assertTrue(oracle.resolvers(resolver));
        
        oracle.setResolver(resolver, false);
        assertFalse(oracle.resolvers(resolver));
    }
}