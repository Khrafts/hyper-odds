// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IstHYPE } from "../interfaces/IstHYPE.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { IHyperLiquidStaking } from "../interfaces/IHyperLiquidStaking.sol";
import { SafeTransferLib } from "../libs/SafeTransferLib.sol";

contract stHYPE is IstHYPE {
    using SafeTransferLib for IERC20;

    // ERC20 Storage
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    
    // ERC20 Metadata
    string public constant name = "Staked HYPE";
    string public constant symbol = "stHYPE";
    uint8 public constant decimals = 18;

    // Staking Storage
    IERC20 public immutable hypeToken;
    IHyperLiquidStaking public immutable hyperLiquidStaking;
    uint256 private _totalAssets;

    // EIP-2612 Storage
    bytes32 public constant PERMIT_TYPEHASH = 
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
    uint256 private immutable _CACHED_CHAIN_ID;
    mapping(address => uint256) public nonces;

    // Events
    event Deposit(address indexed from, uint256 assets, uint256 shares);
    event Withdraw(address indexed from, uint256 shares, uint256 assets);

    // Errors
    error ZeroAmount();
    error ZeroShares();
    error InsufficientBalance();
    error InvalidSignature();
    error PermitExpired();

    constructor(address _hypeToken, address _hyperLiquidStaking) {
        hypeToken = IERC20(_hypeToken);
        hyperLiquidStaking = IHyperLiquidStaking(_hyperLiquidStaking);
        
        _CACHED_CHAIN_ID = block.chainid;
        _CACHED_DOMAIN_SEPARATOR = _computeDomainSeparator();
    }

    // ============ Core Functions ============

    function deposit(uint256 assets) external returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        
        shares = convertToShares(assets);
        if (shares == 0) revert ZeroShares();

        // Transfer HYPE from user
        hypeToken.safeTransferFrom(msg.sender, address(this), assets);
        
        // Stake HYPE with HyperLiquid
        hypeToken.safeApprove(address(hyperLiquidStaking), assets);
        hyperLiquidStaking.stake(assets);
        
        // Update state
        _totalAssets += assets;
        _mint(msg.sender, shares);
        
        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();
        if (_balances[msg.sender] < shares) revert InsufficientBalance();
        
        assets = convertToAssets(shares);
        if (assets == 0) revert ZeroAmount();
        
        // Burn shares first
        _burn(msg.sender, shares);
        
        // Get current balance before unstaking
        uint256 balanceBefore = hypeToken.balanceOf(address(this));
        
        // Calculate proportional unstake amount based on actual staked balance
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 unstakeAmount = assets > stakedBalance ? stakedBalance : assets;
        
        // Unstake from HyperLiquid
        hyperLiquidStaking.unstake(unstakeAmount);
        
        // Calculate actual received amount (includes rewards)
        uint256 actualReceived = hypeToken.balanceOf(address(this)) - balanceBefore;
        
        // Update total assets
        _totalAssets = _totalAssets > unstakeAmount ? _totalAssets - unstakeAmount : 0;
        
        // Transfer HYPE to user
        hypeToken.safeTransfer(msg.sender, actualReceived);
        
        emit Withdraw(msg.sender, shares, actualReceived);
        
        return actualReceived;
    }

    // ============ View Functions ============

    function exchangeRate() public view returns (uint256) {
        uint256 supply = _totalSupply;
        if (supply == 0) return 1e18;
        return (totalAssets() * 1e18) / supply;
    }

    function totalAssets() public view returns (uint256) {
        // Include staked balance plus any pending rewards
        uint256 stakedBalance = hyperLiquidStaking.balanceOf(address(this));
        uint256 rewards = hyperLiquidStaking.getRewards(address(this));
        return stakedBalance + rewards;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = _totalSupply;
        if (supply == 0) return assets;
        return (assets * supply) / totalAssets();
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = _totalSupply;
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
    }

    // ============ ERC20 Functions ============

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) revert InsufficientBalance();
            unchecked {
                _approve(from, msg.sender, currentAllowance - value);
            }
        }
        _transfer(from, to, value);
        return true;
    }

    // ============ EIP-2612 Permit ============

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (block.timestamp > deadline) revert PermitExpired();

        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline)
        );

        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0) || signer != owner) revert InvalidSignature();

        _approve(owner, spender, value);
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return block.chainid == _CACHED_CHAIN_ID
            ? _CACHED_DOMAIN_SEPARATOR
            : _computeDomainSeparator();
    }

    // ============ Internal Functions ============

    function _computeDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function _mint(address to, uint256 value) private {
        _totalSupply += value;
        unchecked {
            _balances[to] += value;
        }
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) private {
        _balances[from] -= value;
        unchecked {
            _totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }

    function _transfer(address from, address to, uint256 value) private {
        if (_balances[from] < value) revert InsufficientBalance();
        
        unchecked {
            _balances[from] -= value;
            _balances[to] += value;
        }
        
        emit Transfer(from, to, value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }
}