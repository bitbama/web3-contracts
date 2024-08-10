// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BamaTokenII is ERC20, Ownable {
  // State Variables
  string internal constant TOKEN_NAME = "Bitbama";
  string internal constant TOKEN_TICKER = "BAMA";
  uint256 internal constant TOKEN_SIZE = 10 ** 18;
  uint256 internal constant MAX_SUPPLY = 500_000_000 * TOKEN_SIZE;

  // Events
  event Minted(address indexed to, uint256 indexed amount);

  constructor(address initialOwner) ERC20(TOKEN_NAME, TOKEN_TICKER) Ownable(initialOwner) {
    ERC20._mint(initialOwner, MAX_SUPPLY);
    emit Minted(initialOwner, MAX_SUPPLY);
  }

  function getOwner() public view returns (address) {
    return owner();
  }
}
