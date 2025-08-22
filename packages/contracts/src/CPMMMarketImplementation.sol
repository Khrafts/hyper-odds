// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IMarket.sol";
import { MarketTypes } from "./types/MarketParams.sol";

/**
 * @title CPMMMarketImplementation
 * @notice Constant Product Market Maker for binary prediction markets
 * @dev Clone implementation for gas-efficient market deployment
 */
contract CPMMMarketImplementation is IMarket, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant MIN_TOTAL_LIQUIDITY = 1000e18; // $1000 minimum
    uint256 public constant FEE_BPS = 300; // 3% fee
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MIN_TRADE_AMOUNT = 1e15; // 0.001 tokens minimum
    uint256 public constant MAX_POSITION_BPS = 2500; // 25% max position

    // ============ Core State ============
    uint256 public reserveYES;
    uint256 public reserveNO;
    uint256 public initialLiquidity;
    
    // ============ Market Configuration ============
    IERC20 public stakeToken;
    address public treasury;
    address public creator;
    address public oracle;
    address public factory;
    
    uint64 public cutoffTime;
    uint64 public resolveTime;
    uint16 public creatorFeeShareBps; // Creator's share of fees (50% = 5000)
    
    // ============ User Balances ============
    mapping(address => uint256) public sharesYES;
    mapping(address => uint256) public sharesNO;
    
    // ============ Market State ============
    bool public initialized;
    bool public resolved;
    uint8 public winningOutcome; // 0 = NO, 1 = YES
    bytes32 public resolutionDataHash;
    
    // ============ Fee Accounting ============
    uint256 public totalFeesCollected;
    bool public feesDistributed;
    
    // ============ Claim Tracking ============
    mapping(address => bool) public claimed;
    
    // ============ Market Metadata ============
    MarketTypes.MarketParams public params;

    // ============ Events ============
    event MarketInitialized(
        address indexed creator,
        uint256 liquidityAmount,
        uint64 cutoffTime,
        uint64 resolveTime
    );
    
    event SharesPurchased(
        address indexed buyer,
        uint8 outcome,
        uint256 amountIn,
        uint256 sharesOut,
        uint256 feeAmount,
        uint256 newPrice
    );
    
    event SharesSold(
        address indexed seller,
        uint8 outcome,
        uint256 sharesIn,
        uint256 amountOut,
        uint256 feeAmount,
        uint256 newPrice
    );
    
    event Resolved(uint8 winningOutcome, bytes32 dataHash);
    
    event Claimed(address indexed user, uint256 payout);
    
    event FeesDistributed(
        address treasury,
        address creator,
        uint256 treasuryFee,
        uint256 creatorFee
    );

    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }
    
    modifier beforeCutoff() {
        require(block.timestamp < cutoffTime, "Trading closed");
        _;
    }
    
    modifier afterResolution() {
        require(resolved, "Not resolved");
        _;
    }
    
    modifier notResolved() {
        require(!resolved, "Already resolved");
        _;
    }

    // ============ Initialization ============
    function initialize(
        MarketTypes.MarketParams memory _params,
        address _stakeToken,
        address _treasury,
        address _oracle,
        address _factory,
        uint256 _liquidityAmount
    ) external {
        require(!initialized, "Already initialized");
        require(_liquidityAmount >= MIN_TOTAL_LIQUIDITY, "Insufficient liquidity");
        require(_params.window.tEnd > block.timestamp, "Invalid resolve time");
        require(_params.cutoffTime > block.timestamp, "Invalid cutoff time");
        require(_params.cutoffTime <= _params.window.tEnd, "Cutoff after resolve");
        
        // Set core addresses
        factory = _factory;
        stakeToken = IERC20(_stakeToken);
        treasury = _treasury;
        creator = _params.creator;
        oracle = _oracle;
        
        // Set market parameters
        params = _params;
        cutoffTime = _params.cutoffTime;
        resolveTime = _params.window.tEnd;
        creatorFeeShareBps = _params.econ.creatorFeeShareBps;
        
        // Initialize liquidity
        initialLiquidity = _liquidityAmount;
        reserveYES = _liquidityAmount / 2;
        reserveNO = _liquidityAmount / 2;
        
        // Pull liquidity from creator (factory should transfer to us)
        stakeToken.safeTransferFrom(_factory, address(this), _liquidityAmount);
        
        initialized = true;
        
        emit MarketInitialized(
            creator,
            _liquidityAmount,
            cutoffTime,
            resolveTime
        );
    }

    // ============ View Functions ============
    
    /**
     * @notice Get current spot price for YES shares
     * @return Price in 18 decimals (1e18 = 100%)
     */
    function getSpotPrice() external view returns (uint256) {
        if (reserveYES == 0 || reserveNO == 0) return PRECISION / 2; // 50%
        return (reserveYES * PRECISION) / (reserveYES + reserveNO);
    }
    
    /**
     * @notice Get current spot price for a specific outcome
     * @param outcome 0 for NO, 1 for YES
     */
    function getOutcomePrice(uint8 outcome) external view returns (uint256) {
        require(outcome <= 1, "Invalid outcome");
        uint256 totalReserves = reserveYES + reserveNO;
        if (totalReserves == 0) return PRECISION / 2;
        
        if (outcome == 1) {
            return (reserveYES * PRECISION) / totalReserves;
        } else {
            return (reserveNO * PRECISION) / totalReserves;
        }
    }
    
    /**
     * @notice Calculate output amount for a given input
     * @param outcome 0 for NO, 1 for YES
     * @param amountIn Amount of stake tokens to spend
     * @return sharesOut Amount of shares to receive (after fees)
     * @return feeAmount Fee amount in shares
     */
    function getAmountOut(
        uint8 outcome,
        uint256 amountIn
    ) public view returns (uint256 sharesOut, uint256 feeAmount) {
        require(outcome <= 1, "Invalid outcome");
        require(amountIn > 0, "Zero input");
        
        uint256 reserveIn;
        uint256 reserveOut;
        
        if (outcome == 1) { // Buying YES
            reserveIn = reserveNO;
            reserveOut = reserveYES;
        } else { // Buying NO
            reserveIn = reserveYES;
            reserveOut = reserveNO;
        }
        
        // Calculate output using constant product formula
        // dy = (y * dx) / (x + dx)
        uint256 sharesOutGross = (reserveOut * amountIn) / (reserveIn + amountIn);
        
        // Calculate fee
        feeAmount = (sharesOutGross * FEE_BPS) / BPS_DIVISOR;
        sharesOut = sharesOutGross - feeAmount;
        
        // Ensure we don't drain the pool
        require(sharesOut < reserveOut * 9 / 10, "Exceeds max slippage");
    }
    
    /**
     * @notice Calculate input amount needed for desired output
     * @param outcome 0 for NO, 1 for YES
     * @param sharesOut Desired amount of shares
     * @return amountIn Amount of stake tokens needed
     */
    function getAmountIn(
        uint8 outcome,
        uint256 sharesOut
    ) public view returns (uint256 amountIn) {
        require(outcome <= 1, "Invalid outcome");
        require(sharesOut > 0, "Zero output");
        
        uint256 reserveIn;
        uint256 reserveOut;
        
        if (outcome == 1) { // Buying YES
            reserveIn = reserveNO;
            reserveOut = reserveYES;
        } else { // Buying NO
            reserveIn = reserveYES;
            reserveOut = reserveNO;
        }
        
        // Account for fees in desired output
        uint256 sharesOutGross = (sharesOut * BPS_DIVISOR) / (BPS_DIVISOR - FEE_BPS);
        
        require(sharesOutGross < reserveOut * 9 / 10, "Exceeds max slippage");
        
        // Calculate required input using constant product formula
        // dx = (x * dy) / (y - dy)
        amountIn = (reserveIn * sharesOutGross) / (reserveOut - sharesOutGross);
    }
    
    // ============ Market Info ============
    function totalPool() external view returns (uint256) {
        return stakeToken.balanceOf(address(this));
    }
    
    function userInfo(address user) external view returns (
        uint256 yesShares,
        uint256 noShares,
        bool hasClaimed
    ) {
        return (sharesYES[user], sharesNO[user], claimed[user]);
    }

    // ============ Core Trading Functions ============
    
    /**
     * @notice Buy shares of a specific outcome
     * @param outcome 0 for NO, 1 for YES
     * @param amountIn Amount of stake tokens to spend
     * @param minSharesOut Minimum shares expected (slippage protection)
     */
    function buyShares(
        uint8 outcome,
        uint256 amountIn,
        uint256 minSharesOut
    ) external nonReentrant whenNotPaused beforeCutoff notResolved {
        require(outcome <= 1, "Invalid outcome");
        require(amountIn >= MIN_TRADE_AMOUNT, "Below minimum");
        
        (uint256 sharesOut, uint256 feeAmount) = getAmountOut(outcome, amountIn);
        require(sharesOut >= minSharesOut, "Slippage exceeded");
        
        // Check position limits to prevent whale manipulation
        _checkPositionLimit(msg.sender, outcome, sharesOut);
        
        // Transfer payment from user
        stakeToken.safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Update reserves using constant product formula
        if (outcome == 1) { // Buying YES
            reserveYES += amountIn; // Add payment to YES reserves
            reserveNO -= sharesOut + feeAmount; // Remove shares from NO reserves
            sharesYES[msg.sender] += sharesOut;
        } else { // Buying NO
            reserveNO += amountIn; // Add payment to NO reserves
            reserveYES -= sharesOut + feeAmount; // Remove shares from YES reserves
            sharesNO[msg.sender] += sharesOut;
        }
        
        // Track fees for distribution
        totalFeesCollected += feeAmount;
        
        uint256 newPrice = (reserveYES * PRECISION) / (reserveYES + reserveNO);
        
        emit SharesPurchased(
            msg.sender,
            outcome,
            amountIn,
            sharesOut,
            feeAmount,
            newPrice
        );
    }
    
    /**
     * @notice Sell shares back to the AMM
     * @param outcome 0 for NO, 1 for YES
     * @param sharesIn Amount of shares to sell
     * @param minAmountOut Minimum tokens expected (slippage protection)
     */
    function sellShares(
        uint8 outcome,
        uint256 sharesIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused beforeCutoff notResolved {
        require(outcome <= 1, "Invalid outcome");
        require(sharesIn > 0, "Zero shares");
        
        // Check user has enough shares
        if (outcome == 1) {
            require(sharesYES[msg.sender] >= sharesIn, "Insufficient YES shares");
        } else {
            require(sharesNO[msg.sender] >= sharesIn, "Insufficient NO shares");
        }
        
        uint256 reserveIn;
        uint256 reserveOut;
        
        if (outcome == 1) { // Selling YES
            reserveIn = reserveYES;
            reserveOut = reserveNO;
        } else { // Selling NO
            reserveIn = reserveNO;
            reserveOut = reserveYES;
        }
        
        // Calculate payout using constant product formula
        // dx = (x * dy) / (y + dy)
        uint256 amountOutGross = (reserveOut * sharesIn) / (reserveIn + sharesIn);
        
        // Apply fee to output
        uint256 feeAmount = (amountOutGross * FEE_BPS) / BPS_DIVISOR;
        uint256 amountOut = amountOutGross - feeAmount;
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        
        // Update user shares
        if (outcome == 1) {
            sharesYES[msg.sender] -= sharesIn;
            reserveNO += sharesIn; // Add shares back to NO reserves
            reserveYES -= amountOutGross; // Remove payout from YES reserves
        } else {
            sharesNO[msg.sender] -= sharesIn;
            reserveYES += sharesIn; // Add shares back to YES reserves  
            reserveNO -= amountOutGross; // Remove payout from NO reserves
        }
        
        // Track fees for distribution
        totalFeesCollected += feeAmount;
        
        // Transfer payout to user
        stakeToken.safeTransfer(msg.sender, amountOut);
        
        uint256 newPrice = (reserveYES * PRECISION) / (reserveYES + reserveNO);
        
        emit SharesSold(
            msg.sender,
            outcome,
            sharesIn,
            amountOut,
            feeAmount,
            newPrice
        );
    }

    // ============ Resolution & Claims ============
    
    /**
     * @notice Resolve market with winning outcome (oracle only)
     */
    function ingestResolution(
        uint8 outcome,
        bytes32 dataHash
    ) external override onlyOracle {
        require(block.timestamp >= resolveTime, "Too early");
        require(!resolved, "Already resolved");
        require(outcome <= 1, "Invalid outcome");
        
        resolved = true;
        winningOutcome = outcome;
        resolutionDataHash = dataHash;
        
        emit Resolved(outcome, dataHash);
    }
    
    /**
     * @notice Claim winning shares after resolution
     */
    function claim() external nonReentrant afterResolution {
        require(!claimed[msg.sender], "Already claimed");
        
        uint256 winningShares;
        
        if (winningOutcome == 1) {
            winningShares = sharesYES[msg.sender];
        } else {
            winningShares = sharesNO[msg.sender];
        }
        
        require(winningShares > 0, "No winning shares");
        
        claimed[msg.sender] = true;
        
        // First claimer distributes fees
        if (!feesDistributed && totalFeesCollected > 0) {
            _distributeFees();
        }
        
        // Winning shares redeem 1:1
        uint256 payout = winningShares;
        stakeToken.safeTransfer(msg.sender, payout);
        
        emit Claimed(msg.sender, payout);
    }
    
    /**
     * @notice Distribute collected fees to treasury and creator
     */
    function _distributeFees() private {
        if (feesDistributed || totalFeesCollected == 0) return;
        
        uint256 creatorShare = (totalFeesCollected * creatorFeeShareBps) / BPS_DIVISOR;
        uint256 treasuryShare = totalFeesCollected - creatorShare;
        
        feesDistributed = true;
        
        if (treasuryShare > 0) {
            stakeToken.safeTransfer(treasury, treasuryShare);
        }
        
        if (creatorShare > 0) {
            stakeToken.safeTransfer(creator, creatorShare);
        }
        
        emit FeesDistributed(treasury, creator, treasuryShare, creatorShare);
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @notice Emergency pause (owner only)
     */
    function setPaused(bool _paused) external {
        require(msg.sender == treasury, "Only owner"); // Treasury acts as owner
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    // ============ Internal Security Functions ============
    
    /**
     * @notice Check if buying these shares would exceed position limits
     * @param user Address attempting to buy
     * @param outcome 0 for NO, 1 for YES  
     * @param additionalShares Amount of shares they want to buy
     */
    function _checkPositionLimit(
        address user, 
        uint8 outcome, 
        uint256 additionalShares
    ) internal view {
        // Calculate current shares user owns for this outcome
        uint256 currentShares = outcome == 1 ? sharesYES[user] : sharesNO[user];
        uint256 newUserShares = currentShares + additionalShares;
        
        // Check if user would own > MAX_POSITION_BPS% of initial outcome liquidity
        // Use initial liquidity as baseline to prevent manipulation of the limit
        uint256 maxAllowedShares = (initialLiquidity / 2) * MAX_POSITION_BPS / BPS_DIVISOR;
        
        require(newUserShares <= maxAllowedShares, "Position limit exceeded");
    }
}