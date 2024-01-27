// SPDX-License-Identifier: LGPL 3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract Bama is ERC20Capped {
  //address payable public owner;
  string internal constant TOKEN_NAME = "Bama";
  string internal constant TOKEN_TICKER = "BAMA";
  uint256 internal constant CAP = 500_000_000;
  uint256 internal constant TOKEN_SIZE = 10 ** 18;
  uint256 internal constant OWNER_TOKENS = 70_000_000;
  uint256 internal constant OWNER_TOKENS = 70_000_000;
  address private immutable i_owner;

  constructor() ERC20(TOKEN_NAME, TOKEN_TICKER) ERC20Capped(CAP * TOKEN_SIZE) {
    owner = payable(msg.sender);
    _mint(owner, OWNER_TOKENS * TOKEN_SIZE);
  }

  function mintToken(address account, uint256 amount) public {
    super._mint(account, amount);
  }
}
