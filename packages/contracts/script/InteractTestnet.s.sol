// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ParimutuelMarketImplementation.sol";
import "../src/types/MarketParams.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InteractTestnet is Script {
    function deposit(address market, uint8 outcome, uint256 amount) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address stakeToken = vm.envAddress("STAKE_TOKEN");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve token spend
        IERC20(stakeToken).approve(market, amount);
        
        // Make deposit
        ParimutuelMarketImplementation(market).deposit(outcome, amount);
        
        console.log("Deposited", amount, "to outcome", outcome);
        
        vm.stopBroadcast();
    }
    
    function claim(address market) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ParimutuelMarketImplementation(market).claim();
        
        console.log("Claimed winnings from market", market);
        
        vm.stopBroadcast();
    }
    
    function checkMarket(address market) external view {
        ParimutuelMarketImplementation m = ParimutuelMarketImplementation(market);
        
        console.log("\n=== Market Status ===");
        console.log("Address:", market);
        console.log("Pool YES:", m.pool(1));
        console.log("Pool NO:", m.pool(0));
        console.log("Total Pool:", m.totalPool());
        console.log("Resolved:", m.resolved());
        
        if (m.resolved()) {
            console.log("Winning outcome:", m.winningOutcome());
        }
        
        console.log("\n=== Market Details ===");
        console.log("Cutoff time:", m.cutoffTime());
        console.log("Resolve time:", m.resolveTime());
        console.log("Time decay BPS:", m.timeDecayBps());
        console.log("Current time multiplier:", m.getTimeMultiplier());
        
        uint256 timeLeft = 0;
        if (block.timestamp < m.cutoffTime()) {
            timeLeft = m.cutoffTime() - block.timestamp;
            console.log("Time until cutoff:", timeLeft, "seconds");
        } else if (block.timestamp < m.resolveTime()) {
            timeLeft = m.resolveTime() - block.timestamp;
            console.log("Time until resolution:", timeLeft, "seconds");
        } else {
            console.log("Ready for resolution!");
        }
    }
    
    function mintTestTokens() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // These would be the mock token addresses from deployment
        address mockUSDC = vm.envAddress("STAKE_TOKEN");
        address mockWHYPE = vm.envAddress("WHYPE_TOKEN");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Mint tokens (assuming MockERC20 interface)
        MockERC20(mockUSDC).mint(deployer, 10000 * 1e6);
        MockERC20(mockWHYPE).mint(deployer, 10000 * 1e18);
        
        console.log("Minted test tokens to", deployer);
        
        vm.stopBroadcast();
    }
}

interface MockERC20 {
    function mint(address to, uint256 amount) external;
}