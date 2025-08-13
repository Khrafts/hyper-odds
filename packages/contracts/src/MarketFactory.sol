// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IstHYPE } from "./interfaces/IstHYPE.sol";
import { ParimutuelMarketImplementation } from "./ParimutuelMarketImplementation.sol";
import { MarketTypes } from "./types/MarketParams.sol";

contract MarketFactory is Ownable {
    using SafeERC20 for IERC20;
    using Clones for address;

    // Storage
    IERC20 public stakeToken;
    IstHYPE public stHYPE;
    address public treasury;
    address public oracle;
    address public implementation;
    uint256 public constant STAKE_PER_MARKET = 1000e18; // 1000 stHYPE per market

    mapping(address => address) public marketCreator; // market → creator
    mapping(address => uint256) public creatorLockedStake; // creator → locked stHYPE
    mapping(address => bool) public protocolMarkets; // protocol-created markets

    // Events
    event MarketCreated(
        address indexed market,
        address indexed creator,
        bytes32 subject,
        bytes32 predicate,
        bytes32 windowSpec,
        bool isProtocolMarket
    );
    event StakeLocked(address indexed creator, address indexed market, uint256 amount);
    event StakeReleased(address indexed creator, address indexed market, uint256 amount);

    constructor(address _stakeToken, address _stHYPE, address _treasury, address _oracle)
        Ownable(msg.sender)
    {
        stakeToken = IERC20(_stakeToken);
        stHYPE = IstHYPE(_stHYPE);
        treasury = _treasury;
        oracle = _oracle;
    }

    function createMarket(MarketTypes.MarketParams memory p) public returns (address) {
        require(implementation != address(0), "Implementation not set");

        // Check stHYPE allowance and balance
        require(
            IERC20(address(stHYPE)).balanceOf(msg.sender) >= STAKE_PER_MARKET,
            "Insufficient stHYPE balance"
        );
        require(
            IERC20(address(stHYPE)).allowance(msg.sender, address(this)) >= STAKE_PER_MARKET,
            "Insufficient stHYPE allowance"
        );

        // Lock stHYPE (actual transfer required for flashloan protection)
        IERC20(address(stHYPE)).safeTransferFrom(msg.sender, address(this), STAKE_PER_MARKET);

        // Deploy clone
        address market = implementation.clone();

        // Initialize market with fixed fees (5% protocol, 10% creator share)
        ParimutuelMarketImplementation(market).initialize(
            address(stakeToken),
            treasury,
            p.creator,
            oracle,
            p.cutoffTime,
            p.cutoffTime + (p.window.tEnd - p.window.tStart), // resolveTime
            p.econ.maxTotalPool,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window))
        );

        // Track creator and locked stake
        marketCreator[market] = msg.sender;
        creatorLockedStake[msg.sender] += STAKE_PER_MARKET;

        emit MarketCreated(
            market,
            msg.sender,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window)),
            false
        );
        emit StakeLocked(msg.sender, market, STAKE_PER_MARKET);

        return market;
    }

    function createMarketWithPermit(
        MarketTypes.MarketParams memory p,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (address) {
        // Use permit for gasless approval
        stHYPE.permit(msg.sender, address(this), STAKE_PER_MARKET, deadline, v, r, s);

        // Now call createMarket
        return createMarket(p);
    }

    function createProtocolMarket(MarketTypes.MarketParams memory p)
        external
        onlyOwner
        returns (address)
    {
        require(implementation != address(0), "Implementation not set");

        // Deploy clone (no stHYPE required for protocol markets)
        address market = implementation.clone();

        // Initialize market with fixed fees
        ParimutuelMarketImplementation(market).initialize(
            address(stakeToken),
            treasury,
            p.creator,
            oracle,
            p.cutoffTime,
            p.cutoffTime + (p.window.tEnd - p.window.tStart), // resolveTime
            p.econ.maxTotalPool,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window))
        );

        // Mark as protocol market
        protocolMarkets[market] = true;
        marketCreator[market] = msg.sender;

        emit MarketCreated(
            market,
            msg.sender,
            keccak256(abi.encode(p.subject)),
            keccak256(abi.encode(p.predicate)),
            keccak256(abi.encode(p.window)),
            true // isProtocolMarket
        );

        return market;
    }

    function releaseStake(address market) external {
        require(marketCreator[market] != address(0), "Market not found");
        require(!protocolMarkets[market], "Protocol market has no stake");

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

    function setImplementation(address _implementation) external onlyOwner {
        implementation = _implementation;
    }
}
