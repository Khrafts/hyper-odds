// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IstHYPE } from "./interfaces/IstHYPE.sol";
import { ParimutuelMarketImplementation } from "./ParimutuelMarketImplementation.sol";
import { CPMMMarketImplementation } from "./CPMMMarketImplementation.sol";
import { MarketTypes } from "./types/MarketParams.sol";

contract MarketFactory is Ownable {
    using SafeERC20 for IERC20;
    using Clones for address;

    // Market Types
    enum MarketType {
        PARIMUTUEL,
        CPMM
    }

    // Storage
    IERC20 public stakeToken;
    IstHYPE public stHYPE;
    address public treasury;
    address public oracle;
    address public parimutuelImplementation;
    address public cpmmImplementation;
    uint256 public constant STAKE_PER_MARKET = 1000e18; // 1000 stHYPE per market
    uint256 public minCPMMLiquidity = 1000e6; // Default: 1000 USDC (6 decimals), configurable by owner

    mapping(address => address) public marketCreator; // market → creator
    mapping(address => uint256) public creatorLockedStake; // creator → locked stHYPE
    mapping(address => bool) public protocolMarkets; // protocol-created markets
    mapping(address => MarketType) public marketType; // market → type

    // Events
    event MarketCreated(
        address indexed market, address indexed creator, MarketType indexed marketType, MarketTypes.MarketParams params
    );
    event StakeLocked(address indexed creator, address indexed market, uint256 amount);
    event StakeReleased(address indexed creator, address indexed market, uint256 amount);
    event MinCPMMLiquidityUpdated(uint256 newMinLiquidity);

    constructor(address _stakeToken, address _stHYPE, address _treasury, address _oracle) Ownable(msg.sender) {
        stakeToken = IERC20(_stakeToken);
        stHYPE = IstHYPE(_stHYPE);
        treasury = _treasury;
        oracle = _oracle;
    }

    function createMarket(
        MarketTypes.MarketParams memory p,
        MarketType _marketType,
        uint256 liquidityAmount // Only for CPMM markets
    )
        public
        returns (address)
    {
        if (_marketType == MarketType.PARIMUTUEL) {
            require(parimutuelImplementation != address(0), "Parimutuel implementation not set");
        } else {
            require(cpmmImplementation != address(0), "CPMM implementation not set");
            require(liquidityAmount >= minCPMMLiquidity, "Insufficient liquidity");
        }
        address market;

        if (_marketType == MarketType.PARIMUTUEL) {
            market = _createParimutuelMarket(p);
        } else {
            market = _createCPMMMarket(p, liquidityAmount);
        }

        // Track creator and market type
        marketCreator[market] = msg.sender;
        marketType[market] = _marketType;

        emit MarketCreated(market, msg.sender, _marketType, p);

        return market;
    }

    // Convenience function for parimutuel markets (backward compatibility)
    function createParimutuelMarket(MarketTypes.MarketParams memory p) external returns (address) {
        return createMarket(p, MarketType.PARIMUTUEL, 0);
    }

    // Convenience function for CPMM markets
    function createCPMMMarket(MarketTypes.MarketParams memory p, uint256 liquidityAmount) external returns (address) {
        return createMarket(p, MarketType.CPMM, liquidityAmount);
    }

    function createMarketWithPermit(
        MarketTypes.MarketParams memory p,
        MarketType _marketType,
        uint256 liquidityAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        returns (address)
    {
        if (_marketType == MarketType.PARIMUTUEL) {
            // Use permit for gasless stHYPE approval
            stHYPE.permit(msg.sender, address(this), STAKE_PER_MARKET, deadline, v, r, s);
        } else {
            // For CPMM, permit is for stake token approval
            // Note: Assumes stake token supports permit (ERC20Permit)
            // This would need to be implemented based on your stake token
        }

        return createMarket(p, _marketType, liquidityAmount);
    }

    function createProtocolMarket(
        MarketTypes.MarketParams memory p,
        MarketType _marketType,
        uint256 liquidityAmount
    )
        external
        onlyOwner
        returns (address)
    {
        address market;

        if (_marketType == MarketType.PARIMUTUEL) {
            market = _createProtocolParimutuelMarket(p);
        } else {
            market = _createProtocolCPMMMarket(p, liquidityAmount);
        }

        // Mark as protocol market
        protocolMarkets[market] = true;
        marketCreator[market] = msg.sender;
        marketType[market] = _marketType;

        emit MarketCreated(market, msg.sender, _marketType, p);

        return market;
    }

    function releaseStake(address market) external {
        require(marketCreator[market] != address(0), "Market not found");
        require(!protocolMarkets[market], "Protocol market has no stake");
        require(marketType[market] == MarketType.PARIMUTUEL, "Only parimutuel markets have stHYPE stake");

        address creator = marketCreator[market];
        require(msg.sender == creator, "Not market creator");

        // Check market is resolved
        require(ParimutuelMarketImplementation(market).resolved(), "Market not resolved");

        // Release stake
        uint256 stakeToRelease = STAKE_PER_MARKET;
        require(creatorLockedStake[creator] >= stakeToRelease, "Insufficient locked stake");

        creatorLockedStake[creator] -= stakeToRelease;
        IERC20(address(stHYPE)).safeTransfer(creator, stakeToRelease);

        // Clear mapping to prevent double release
        delete marketCreator[market];

        emit StakeReleased(creator, market, stakeToRelease);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setParimutuelImplementation(address _implementation) external onlyOwner {
        parimutuelImplementation = _implementation;
    }

    function setCPMMImplementation(address _implementation) external onlyOwner {
        cpmmImplementation = _implementation;
    }

    // Backward compatibility
    function setImplementation(address _implementation) external onlyOwner {
        parimutuelImplementation = _implementation;
    }

    function setMinCPMMLiquidity(uint256 _minLiquidity) external onlyOwner {
        require(_minLiquidity > 0, "Min liquidity must be greater than zero");
        minCPMMLiquidity = _minLiquidity;
        emit MinCPMMLiquidityUpdated(_minLiquidity);
    }

    // Internal helper functions to avoid stack too deep
    function _createParimutuelMarket(MarketTypes.MarketParams memory p) private returns (address market) {
        // Parimutuel markets require stHYPE staking
        require(IERC20(address(stHYPE)).balanceOf(msg.sender) >= STAKE_PER_MARKET, "Insufficient stHYPE balance");
        require(
            IERC20(address(stHYPE)).allowance(msg.sender, address(this)) >= STAKE_PER_MARKET,
            "Insufficient stHYPE allowance"
        );

        // Lock stHYPE
        IERC20(address(stHYPE)).safeTransferFrom(msg.sender, address(this), STAKE_PER_MARKET);

        // Deploy parimutuel clone
        market = parimutuelImplementation.clone();

        // Initialize parimutuel market
        ParimutuelMarketImplementation(market).initialize(
            address(stakeToken),
            treasury,
            p.creator,
            oracle,
            p.cutoffTime,
            p.cutoffTime + (p.window.tEnd - p.window.tStart), // resolveTime
            p.econ.maxTotalPool,
            p.econ.timeDecayBps,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window))
        );

        // Track locked stake
        creatorLockedStake[msg.sender] += STAKE_PER_MARKET;
        emit StakeLocked(msg.sender, market, STAKE_PER_MARKET);
    }

    function _createCPMMMarket(
        MarketTypes.MarketParams memory p,
        uint256 liquidityAmount
    )
        private
        returns (address market)
    {
        // CPMM markets require upfront liquidity
        require(stakeToken.balanceOf(msg.sender) >= liquidityAmount, "Insufficient balance for liquidity");
        require(
            stakeToken.allowance(msg.sender, address(this)) >= liquidityAmount, "Insufficient allowance for liquidity"
        );

        // Pull liquidity from creator first
        stakeToken.safeTransferFrom(msg.sender, address(this), liquidityAmount);

        // Deploy CPMM clone
        market = cpmmImplementation.clone();

        // Approve the market to pull liquidity from factory
        stakeToken.approve(market, liquidityAmount);

        // Initialize CPMM market (it will pull liquidity during initialization)
        CPMMMarketImplementation(market).initialize(
            p,
            address(stakeToken),
            treasury,
            oracle,
            address(this), // factory address
            liquidityAmount,
            minCPMMLiquidity
        );
    }

    function _createProtocolParimutuelMarket(MarketTypes.MarketParams memory p) private returns (address market) {
        require(parimutuelImplementation != address(0), "Parimutuel implementation not set");

        // Deploy parimutuel clone (no stHYPE required for protocol markets)
        market = parimutuelImplementation.clone();

        // Initialize parimutuel market
        ParimutuelMarketImplementation(market).initialize(
            address(stakeToken),
            treasury,
            p.creator,
            oracle,
            p.cutoffTime,
            p.cutoffTime + (p.window.tEnd - p.window.tStart), // resolveTime
            p.econ.maxTotalPool,
            p.econ.timeDecayBps,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window))
        );
    }

    function _createProtocolCPMMMarket(
        MarketTypes.MarketParams memory p,
        uint256 liquidityAmount
    )
        private
        returns (address market)
    {
        require(cpmmImplementation != address(0), "CPMM implementation not set");
        require(liquidityAmount >= minCPMMLiquidity, "Insufficient liquidity");

        // Protocol provides the liquidity for CPMM
        require(stakeToken.balanceOf(msg.sender) >= liquidityAmount, "Insufficient protocol balance");

        // Pull liquidity from protocol owner first
        stakeToken.safeTransferFrom(msg.sender, address(this), liquidityAmount);

        // Deploy CPMM clone
        market = cpmmImplementation.clone();

        // Approve the market to pull liquidity from factory
        stakeToken.approve(market, liquidityAmount);

        // Initialize CPMM market
        CPMMMarketImplementation(market).initialize(
            p,
            address(stakeToken),
            treasury,
            oracle,
            address(this), // factory address
            liquidityAmount,
            minCPMMLiquidity
        );
    }
}
