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

    constructor(
        address _stakeToken,
        address _stHYPE,
        address _treasury,
        address _oracle
    ) Ownable(msg.sender) {
        stakeToken = IERC20(_stakeToken);
        stHYPE = IstHYPE(_stHYPE);
        treasury = _treasury;
        oracle = _oracle;
    }

    function createMarket(MarketTypes.MarketParams memory p) external returns (address) {
        // Implementation will be added in Task 6.2
    }

    function createMarketWithPermit(
        MarketTypes.MarketParams memory p,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (address) {
        // Implementation will be added in Task 6.3
    }

    function createProtocolMarket(MarketTypes.MarketParams memory p) external onlyOwner returns (address) {
        // Implementation will be added in Task 6.4
    }

    function releaseStake(address market) external {
        // Implementation will be added in Task 6.5
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