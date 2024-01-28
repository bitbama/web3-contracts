// SPDX-License-Identifier: LGPL 3.0
pragma solidity ^0.8.24;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract Bama is ERC20Capped {
  address payable private immutable i_owner;
  uint256 internal private i_chainId;
  string internal constant TOKEN_NAME = "Bama";
  string internal constant TOKEN_TICKER = "BAMA";
  uint256 internal constant CAP = 500_000_000;
  uint256 internal constant TOKEN_SIZE = 10 ** 18;
  uint256 internal constant STAKING_TOKENS = (CAP * TOKEN_SIZE) * 0.12 // 12%
  // Allocation Addresses
  address payable internal constant TESTNET_STAKING_ADDR = "0x76f0aAA64b0E4d6e4A783d4842bf4CEEd50C0327"

  constructor() ERC20(TOKEN_NAME, TOKEN_TICKER) ERC20Capped(CAP * TOKEN_SIZE) {
    i_owner = payable(msg.sender);
    i_chainId = block.chainid;
    // Allocate Initial Tokens
    string env = i_chainId == 11155111 ? "TESTNET" : "MAINNET"
    _mint(string.concat(env, "_STAKING_ADDR") , STAKING_TOKENS);
  }

  function mintToken(address account, uint256 amount) public {
    super._mint(account, amount);
  }
}
