// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IWHYPE } from "../../src/interfaces/IWHYPE.sol";

contract MockWHYPE is ERC20, IWHYPE {
    constructor() ERC20("Wrapped HYPE", "WHYPE") { }

    // Testnet mint function for easy testing
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function deposit() public payable override {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public override {
        require(balanceOf(msg.sender) >= wad, "Insufficient balance");
        _burn(msg.sender, wad);
        
        // For testnet: only send ETH if we have enough balance
        if (address(this).balance >= wad) {
            payable(msg.sender).transfer(wad);
        }
        // Always emit the event for tracking
        emit Withdrawal(msg.sender, wad);
    }

    receive() external payable {
        deposit();
    }
}
