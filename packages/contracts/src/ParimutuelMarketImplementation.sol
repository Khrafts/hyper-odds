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
    uint64 public createdAt; // Market creation timestamp
    uint16 public feeBps; // Fixed at 500 (5%)
    uint16 public creatorFeeShareBps; // Fixed at 1000 (10% of protocol fee)
    uint256 public maxTotalPool;
    uint16 public timeDecayBps; // Time decay spread (0-5000 bps, 0-50%)
    bytes32 public subject;
    bytes32 public predicate;
    bytes32 public windowSpec;

    // Mutable state
    uint256[2] public pool; // pool[0]=NO, pool[1]=YES
    uint256[2] public totalEffectiveStakes; // Total effective stakes per outcome
    mapping(address => uint256[2]) public stakeOf;
    mapping(address => uint256[2]) public userEffectiveStakes; // User effective stakes per outcome
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
        uint16 _timeDecayBps,
        bytes32 _subject,
        bytes32 _predicate,
        bytes32 _windowSpec
    )
        external
    {
        require(!initialized, "Already initialized");
        require(_stakeToken != address(0), "Invalid stake token");
        require(_treasury != address(0), "Invalid treasury");
        require(_creator != address(0), "Invalid creator");
        require(_oracle != address(0), "Invalid oracle");
        require(_cutoffTime > block.timestamp, "Cutoff time in past");
        require(_resolveTime > _cutoffTime, "Resolve time before cutoff");
        // No max pool validation - allow unlimited pool sizes
        require(_timeDecayBps <= 5000, "Time decay too high"); // Max 50% spread

        initialized = true;
        createdAt = uint64(block.timestamp);

        stakeToken = IERC20(_stakeToken);
        treasury = _treasury;
        creator = _creator;
        oracle = _oracle;
        cutoffTime = _cutoffTime;
        resolveTime = _resolveTime;
        maxTotalPool = _maxTotalPool;
        timeDecayBps = _timeDecayBps;
        subject = _subject;
        predicate = _predicate;
        windowSpec = _windowSpec;

        // Set fixed fees (5% protocol, 10% creator share of protocol fee)
        feeBps = 500; // 5%
        creatorFeeShareBps = 1000; // 10% of protocol fee
    }

    function _calculateTimeMultiplier() internal view returns (uint256) {
        if (timeDecayBps == 0) return 10_000; // No decay, 1.0x multiplier

        uint256 timeRemaining = cutoffTime > block.timestamp ? cutoffTime - block.timestamp : 0;
        uint256 totalMarketTime = cutoffTime - createdAt;

        // Prevent division by zero
        if (totalMarketTime == 0) {
            return 10_000; // If market duration is 0, no decay
        }

        uint256 timeRatio = (timeRemaining * 10_000) / totalMarketTime;
        if (timeRatio > 10_000) timeRatio = 10_000; // Cap at 100%

        // Formula: multiplier = 1.0 - halfSpread + (timeRatio * timeDecayBps) / 10000
        uint256 halfSpread = timeDecayBps / 2;
        return 10_000 - halfSpread + (timeRatio * timeDecayBps) / 10_000;
    }

    function deposit(uint8 outcome, uint256 amount) external whenNotPaused nonReentrant {
        _depositFor(msg.sender, outcome, amount);
    }

    function depositFor(address user, uint8 outcome, uint256 amount) external whenNotPaused nonReentrant {
        _depositFor(user, outcome, amount);
    }

    function _depositFor(address user, uint8 outcome, uint256 amount) private {
        require(block.timestamp < cutoffTime, "Deposits closed");
        require(outcome <= 1, "Invalid outcome");
        require(amount > 0, "Zero amount");

        // No pool cap validation - allow unlimited pool sizes

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate effective stakes with time multiplier
        uint256 timeMultiplier = _calculateTimeMultiplier();
        uint256 effectiveAmount = (amount * timeMultiplier) / 10_000;

        pool[outcome] += amount;
        stakeOf[user][outcome] += amount;
        totalEffectiveStakes[outcome] += effectiveAmount;
        userEffectiveStakes[user][outcome] += effectiveAmount;

        emit Deposited(user, outcome, amount);
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
        _claimFor(msg.sender);
    }

    function claimFor(address user) external nonReentrant {
        _claimFor(user);
    }

    function _claimFor(address user) private {
        require(resolved, "Not resolved");
        require(!claimed[user], "Already claimed");

        uint256 userEffectiveStake = userEffectiveStakes[user][winningOutcome];
        require(userEffectiveStake > 0, "No winning stake");

        claimed[user] = true;

        uint256 totalLosingPool = pool[1 - winningOutcome];
        uint256 totalWinningEffectiveStakes = totalEffectiveStakes[winningOutcome];

        // Calculate fee only once (first claimer)
        if (feeCollected == 0 && totalLosingPool > 0) {
            feeCollected = (totalLosingPool * feeBps) / 10_000;

            // Split fee: 90% treasury, 10% creator
            uint256 creatorFee = (feeCollected * creatorFeeShareBps) / 10_000;
            uint256 treasuryFee = feeCollected - creatorFee;

            if (treasuryFee > 0) {
                stakeToken.safeTransfer(treasury, treasuryFee);
            }
            if (creatorFee > 0) {
                stakeToken.safeTransfer(creator, creatorFee);
            }

            emit Skimmed(treasury, creator, treasuryFee, creatorFee);
        }

        // Calculate payout using effective stakes for winnings distribution
        uint256 payout;
        uint256 userActualStake = stakeOf[user][winningOutcome];

        if (totalLosingPool == 0) {
            // No losers, just return actual stake
            payout = userActualStake;
        } else if (totalWinningEffectiveStakes == 0) {
            // Edge case: no effective stakes, return actual stake
            payout = userActualStake;
        } else {
            // Return actual stake plus proportional share based on effective stakes
            uint256 availableWinnings = totalLosingPool - feeCollected;
            uint256 winningsShare = (availableWinnings * userEffectiveStake) / totalWinningEffectiveStakes;
            payout = userActualStake + winningsShare;
        }

        stakeToken.safeTransfer(msg.sender, payout);

        emit Claimed(user, payout);
    }

    function totalPool() public view returns (uint256) {
        return pool[0] + pool[1];
    }

    function userInfo(address user) external view returns (uint256[2] memory) {
        return stakeOf[user];
    }

    function userEffectiveInfo(address user) external view returns (uint256[2] memory) {
        return userEffectiveStakes[user];
    }

    function getTimeMultiplier() external view returns (uint256) {
        return _calculateTimeMultiplier();
    }

    function cancelAndRefund() external onlyOwner {
        require(!resolved, "Already resolved");

        // Mark as resolved with special outcome
        resolved = true;
        winningOutcome = 2; // Special value indicating cancellation

        // Pause to prevent further deposits
        _pause();
    }

    function emergencyClaim() external nonReentrant {
        require(resolved && winningOutcome == 2, "Not cancelled");
        require(!claimed[msg.sender], "Already claimed");

        claimed[msg.sender] = true;

        // In cancellation, return actual stakes (not affected by time decay)
        uint256 refund = stakeOf[msg.sender][0] + stakeOf[msg.sender][1];
        require(refund > 0, "Nothing to refund");

        stakeToken.safeTransfer(msg.sender, refund);

        emit Claimed(msg.sender, refund);
    }

    // Admin functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
