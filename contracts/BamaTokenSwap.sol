// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Error
error MigrationII__NotOwner();

contract BamaTokenSwap {
  using SafeERC20 for IERC20;

  IERC20 private immutable oldToken;
  IERC20 private immutable newToken;
  uint private constant MULTIPLIER = 10 ** 18;
  uint256 private totalSwapped = 0;
  address immutable burnAccount = 0x0000000000000000000000000000000000000000;

  event TokenReceived(address indexed sender, uint256 indexed amount);
  event TokenSwapped(address indexed to, uint256 indexed amount);

  constructor(IERC20 oldToken_, IERC20 newToken_) {
    newToken = newToken_;
    oldToken = oldToken_;
  }

  function receiveToken() public payable {
    uint256 amount = msg.value;
    address account = msg.sender;
    oldToken.safeTransferFrom(account, burnAccount, amount);
    _swapToken(account, amount);
    emit TokenReceived(account, amount);
  }

  function _swapToken(address account, uint256 amount_) internal {
    totalSwapped += amount_;
    newToken.safeTransfer(account, amount_);
    emit TokenSwapped(account, amount_);
  }

  function getAssociatedToken() public view returns (IERC20) {
    return newToken;
  }

  function getTotalMigrated() public view returns (uint256) {
    return totalSwapped;
  }

  //   fallback() external payable {
  //     receiveToken();
  //   }

  receive() external payable {
    receiveToken();
  }
}
