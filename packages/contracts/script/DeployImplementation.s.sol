// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../test/mocks/MockWHYPE.sol";
import "../test/mocks/MockHyperLiquidStaking.sol";
import "../src/staking/stHYPE.sol";
import "../test/mocks/MockERC20.sol";
import "../src/oracle/SimpleOracle.sol";
import "../src/MarketFactory.sol";
import "../src/ParimutuelMarketImplementation.sol";
import "../src/CPMMMarketImplementation.sol";
import "../src/MarketRouter.sol";
import "../src/interfaces/IMarket.sol";
import "../src/types/MarketParams.sol";

contract DeployImplementation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Get config from env (use deployer as default instead of zero)
        address treasury = vm.envOr("TREASURY", deployer);
        address resolverEOA = vm.envOr("RESOLVER_EOA", deployer);

        // Override zero addresses with deployer for testnet
        if (treasury == address(0)) treasury = deployer;
        if (resolverEOA == address(0)) resolverEOA = deployer;

        console.log("Deploying contracts to Arbitrum Sepolia with:");
        console.log("  Deployer:", deployer);
        console.log("  Treasury:", treasury);
        console.log("  Resolver:", resolverEOA);
        console.log("  RPC URL:", vm.envString("RPC_URL"));

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock tokens for testnet
        console.log("\n1. Deploying Mock Tokens...");
        MockWHYPE whype = new MockWHYPE();
        console.log("  MockWHYPE deployed at:", address(whype));

        MockERC20 mockUSDC = new MockERC20("Mock USDC", "USDC", 6);
        console.log("  MockUSDC deployed at:", address(mockUSDC));

        MockHyperLiquidStaking hlStaking = new MockHyperLiquidStaking();
        console.log("  MockHLStaking deployed at:", address(hlStaking));

        // 2. Deploy stHYPE
        console.log("\n2. Deploying stHYPE...");
        stHYPE stHypeToken = new stHYPE(address(whype), address(hlStaking));
        console.log("  stHYPE deployed at:", address(stHypeToken));

        // 3. Deploy Oracle
        console.log("\n3. Deploying SimpleOracle...");
        SimpleOracle oracle = new SimpleOracle(600); // 10 minute dispute window for testnet
        oracle.setResolver(resolverEOA, true);
        console.log("  SimpleOracle deployed at:", address(oracle));
        console.log("  Resolver added:", resolverEOA);

        // 4. Deploy Market Implementations
        console.log("\n4. Deploying Market Implementations...");

        // Deploy Parimutuel Implementation
        ParimutuelMarketImplementation parimutuelImpl = new ParimutuelMarketImplementation();
        console.log("  ParimutuelMarketImplementation deployed at:", address(parimutuelImpl));

        // Deploy CPMM Implementation
        CPMMMarketImplementation cpmmImpl = new CPMMMarketImplementation();
        console.log("  CPMMMarketImplementation deployed at:", address(cpmmImpl));

        // 5. Deploy Factory
        console.log("\n5. Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory(
            address(mockUSDC), // stake token
            address(stHypeToken), // stHYPE
            treasury, // treasury
            address(oracle) // oracle
        );

        // Set both implementations
        factory.setImplementation(address(parimutuelImpl));
        factory.setCPMMImplementation(address(cpmmImpl));
        console.log("  MarketFactory deployed at:", address(factory));
        console.log("  Parimutuel implementation set");
        console.log("  CPMM implementation set");

        // 6. Deploy Router
        console.log("\n6. Deploying MarketRouter...");
        MarketRouter router = new MarketRouter();
        console.log("  MarketRouter deployed at:", address(router));

        // 7. Mint test tokens for deployer
        console.log("\n7. Minting test tokens...");

        // Mint WHYPE and USDC for testing
        whype.mint(deployer, 5000 ether); // 5000 WHYPE for multiple markets
        mockUSDC.mint(deployer, 100_000 * 1e6); // 100,000 USDC

        console.log("  Minted 5000 WHYPE to deployer");
        console.log("  Minted 100,000 USDC to deployer");

        // 8. Mint stHYPE for market creation
        console.log("\n8. Minting stHYPE for market testing...");

        // Directly mint stHYPE for testing (3000 stHYPE for multiple markets)
        stHypeToken.testnetMint(deployer, 3000 ether);
        uint256 stHypeBalance = stHypeToken.balanceOf(deployer);
        console.log("  stHYPE balance:", stHypeBalance / 1e18, "stHYPE");

        vm.stopBroadcast();

        // Print summary
        console.log("\n========================================");
        console.log("ARBITRUM SEPOLIA DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("\nDeployed Contract Addresses:");
        console.log("========================================");
        console.log("MockWHYPE:                    ", address(whype));
        console.log("MockUSDC:                     ", address(mockUSDC));
        console.log("MockHLStaking:                ", address(hlStaking));
        console.log("stHYPE:                       ", address(stHypeToken));
        console.log("SimpleOracle:                 ", address(oracle));
        console.log("ParimutuelMarketImplementation:", address(parimutuelImpl));
        console.log("CPMMMarketImplementation:     ", address(cpmmImpl));
        console.log("MarketFactory:                ", address(factory));
        console.log("MarketRouter:                 ", address(router));
        console.log("========================================");

        console.log("\nExport Commands for .env:");
        console.log("========================================");
        console.log("export WHYPE_TOKEN=", address(whype));
        console.log("export STAKE_TOKEN=", address(mockUSDC));
        console.log("export HL_STAKING=", address(hlStaking));
        console.log("export STHYPE=", address(stHypeToken));
        console.log("export ORACLE=", address(oracle));
        console.log("export PARIMUTUEL_IMPLEMENTATION=", address(parimutuelImpl));
        console.log("export CPMM_IMPLEMENTATION=", address(cpmmImpl));
        console.log("export FACTORY=", address(factory));
        console.log("export ROUTER=", address(router));
        console.log("========================================");

        console.log("\nNext steps:");
        console.log("1. Update .env file with the new contract addresses");
        console.log("2. Update frontend configuration with new addresses");
        console.log("3. Deploy test markets using CreateMarket scripts");
        console.log("4. Verify contracts on Arbiscan if needed");
    }
}
