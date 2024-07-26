// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Error
error MigrationII__NotOwner();

contract MigrationII {
  using SafeERC20 for IERC20;

  IERC20 private immutable token;
  address private immutable i_owner;
  uint private constant MULTIPLIER = 1e18;
  uint256 private totalMigrated = 0;

  event TokenReceived(address indexed sender, uint256 indexed amount);
  event MigratedII(
    address indexed to,
    uint256 indexed amount,
    string indexed mintId
  );

  // Modifiers
  modifier onlyOwner() {
    if (msg.sender != i_owner) revert MigrationII__NotOwner();
    _;
  }

  constructor(IERC20 token_) {
    token = token_;
    i_owner = msg.sender;
  }

  function receiveToken() public payable {
    token.safeTransferFrom(msg.sender, address(this), msg.value);
    emit TokenReceived(msg.sender, msg.value);
  }

  function _tokenBalance() internal view returns (uint256) {
    return token.balanceOf(address(this));
  }

  function migrationII(
    address account,
    uint256 amount_,
    string calldata mintId
  ) external onlyOwner {
    _migrationII(account, amount_, mintId);
  }

  function _migrationII(
    address account,
    uint256 amount_,
    string calldata mintId
  ) internal onlyOwner {
    totalMigrated += amount_;
    token.safeTransfer(account, amount_);
    emit MigratedII(account, amount_, mintId);
  }

  function getAssociatedToken() public view returns (IERC20) {
    return token;
  }

  function getOwner() public view returns (address) {
    return i_owner;
  }

  function tokenBalance() external view returns (uint256) {
    return _tokenBalance();
  }

  function getTotalMigrated() public view returns (uint256) {
    return totalMigrated;
  }

  fallback() external payable {
    receiveToken();
  }

  receive() external payable {
    receiveToken();
  }
}
