// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IWHYPE } from "../../src/interfaces/IWHYPE.sol";

contract MockWHYPE is ERC20, IWHYPE {
    constructor() ERC20("Wrapped HYPE", "WHYPE") { }

    function deposit() public payable override {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public override {
        require(balanceOf(msg.sender) >= wad, "Insufficient balance");
        _burn(msg.sender, wad);
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    receive() external payable {
        deposit();
    }
}
