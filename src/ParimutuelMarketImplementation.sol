// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IMarket } from "./interfaces/IMarket.sol";

contract ParimutuelMarketImplementation is IMarket, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable-like params (set via initialize)
    IERC20 public stakeToken;
    address public treasury;
    address public creator;
    address public oracle;
    uint64 public cutoffTime;
    uint64 public resolveTime;
    uint16 public feeBps; // Fixed at 500 (5%)
    uint16 public creatorFeeShareBps; // Fixed at 1000 (10% of protocol fee)
    uint256 public maxTotalPool;
    bytes32 public subject;
    bytes32 public predicate;
    bytes32 public windowSpec;
    
    // Mutable state
    uint256[2] public pool; // pool[0]=NO, pool[1]=YES
    mapping(address => uint256[2]) public stakeOf;
    bool public resolved;
    uint8 public winningOutcome;
    bytes32 public resolutionDataHash;
    uint256 public feeCollected;
    mapping(address => bool) public claimed;
    
    // Initialization guard
    bool private initialized;
    
    // Events
    event Deposited(address indexed user, uint8 outcome, uint256 amount);
    event Resolved(uint8 winningOutcome, bytes32 dataHash);
    event Claimed(address indexed user, uint256 payout);
    event Skimmed(address treasury, address creator, uint256 treasuryFee, uint256 creatorFee);

    constructor() Ownable(msg.sender) {
        // Implementation contract constructor
    }

    function initialize(
        address _stakeToken,
        address _treasury,
        address _creator,
        address _oracle,
        uint64 _cutoffTime,
        uint64 _resolveTime,
        uint256 _maxTotalPool,
        bytes32 _subject,
        bytes32 _predicate,
        bytes32 _windowSpec
    ) external {
        require(!initialized, "Already initialized");
        require(_stakeToken != address(0), "Invalid stake token");
        require(_treasury != address(0), "Invalid treasury");
        require(_creator != address(0), "Invalid creator");
        require(_oracle != address(0), "Invalid oracle");
        require(_cutoffTime > block.timestamp, "Cutoff time in past");
        require(_resolveTime > _cutoffTime, "Resolve time before cutoff");
        require(_maxTotalPool > 0, "Invalid max pool");
        
        initialized = true;
        
        stakeToken = IERC20(_stakeToken);
        treasury = _treasury;
        creator = _creator;
        oracle = _oracle;
        cutoffTime = _cutoffTime;
        resolveTime = _resolveTime;
        maxTotalPool = _maxTotalPool;
        subject = _subject;
        predicate = _predicate;
        windowSpec = _windowSpec;
        
        // Set fixed fees (5% protocol, 10% creator share of protocol fee)
        feeBps = 500; // 5%
        creatorFeeShareBps = 1000; // 10% of protocol fee
    }

    function deposit(uint8 outcome, uint256 amount) external whenNotPaused nonReentrant {
        require(block.timestamp < cutoffTime, "Deposits closed");
        require(outcome <= 1, "Invalid outcome");
        require(amount > 0, "Zero amount");
        
        uint256 newTotalPool = pool[0] + pool[1] + amount;
        require(newTotalPool <= maxTotalPool, "Pool cap exceeded");
        
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        
        pool[outcome] += amount;
        stakeOf[msg.sender][outcome] += amount;
        
        emit Deposited(msg.sender, outcome, amount);
    }

    function ingestResolution(uint8 outcome, bytes32 dataHash) external override {
        require(msg.sender == oracle, "Only oracle");
        require(block.timestamp >= resolveTime, "Too early to resolve");
        require(!resolved, "Already resolved");
        require(outcome <= 1, "Invalid outcome");
        
        resolved = true;
        winningOutcome = outcome;
        resolutionDataHash = dataHash;
        
        emit Resolved(outcome, dataHash);
    }

    function claim() external nonReentrant {
        require(resolved, "Not resolved");
        require(!claimed[msg.sender], "Already claimed");
        
        uint256 userStake = stakeOf[msg.sender][winningOutcome];
        require(userStake > 0, "No winning stake");
        
        claimed[msg.sender] = true;
        
        uint256 totalWinningPool = pool[winningOutcome];
        uint256 totalLosingPool = pool[1 - winningOutcome];
        
        // Calculate fee only once (first claimer)
        if (feeCollected == 0 && totalLosingPool > 0) {
            feeCollected = (totalLosingPool * feeBps) / 10000;
            
            // Split fee: 90% treasury, 10% creator
            uint256 creatorFee = (feeCollected * creatorFeeShareBps) / 10000;
            uint256 treasuryFee = feeCollected - creatorFee;
            
            if (treasuryFee > 0) {
                stakeToken.safeTransfer(treasury, treasuryFee);
            }
            if (creatorFee > 0) {
                stakeToken.safeTransfer(creator, creatorFee);
            }
            
            emit Skimmed(treasury, creator, treasuryFee, creatorFee);
        }
        
        // Calculate payout
        uint256 payout;
        if (totalLosingPool == 0) {
            // No losers, just return stake
            payout = userStake;
        } else {
            // Return stake plus share of losing pool minus fees
            uint256 availableWinnings = totalLosingPool - feeCollected;
            uint256 winningsShare = (availableWinnings * userStake) / totalWinningPool;
            payout = userStake + winningsShare;
        }
        
        stakeToken.safeTransfer(msg.sender, payout);
        
        emit Claimed(msg.sender, payout);
    }

    function totalPool() public view returns (uint256) {
        return pool[0] + pool[1];
    }

    function userInfo(address user) external view returns (uint256[2] memory) {
        return stakeOf[user];
    }
}