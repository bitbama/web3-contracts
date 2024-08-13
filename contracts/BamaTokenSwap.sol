// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Error
error BamaTokenSwap__HaveSwappedBefore();
error BamaTokenWap__NotOwner();

contract BamaTokenSwap {
  using SafeERC20 for IERC20;

  address private immutable i_owner;
  IERC20 private immutable i_newToken;
  uint private constant MULTIPLIER = 10 ** 18;
  uint256 private totalSwapped = 0;

  struct SwappedHolder {
    bool swapped;
  }
  mapping(address => SwappedHolder) public SwappedHolders;

   // Modifiers
  modifier onlyOwner() {
    if (msg.sender != i_owner) revert BamaTokenWap__NotOwner();
    _;
  }

  modifier oneTimeSwap(address account) {
    if(SwappedHolders[account].swapped) revert BamaTokenSwap__HaveSwappedBefore();
    _;
  }

  event TokenSwapped(address indexed to, uint256 indexed amount);
  event Funded(address indexed from, uint256 indexed amount);

  constructor(
    IERC20 newToken_
  ) {
    i_owner = msg.sender;
    i_newToken = newToken_;
  }

  function swapToken(
    address account_,
    uint256 amount_
  ) external onlyOwner oneTimeSwap(account_) {
    totalSwapped += amount_;
    SwappedHolders[account_].swapped = true;
    i_newToken.safeTransfer(account_, amount_);
    emit TokenSwapped(account_, amount_);
  }

  function receiveToken() public payable {
    emit Funded(msg.sender, msg.value);
  }

  function getAssociatedToken() public view returns (IERC20) {
    return i_newToken;
  }

  function getTotalSwapped() public view returns (uint256) {
    return totalSwapped;
  }

  receive() external payable {
    receiveToken();
  }
}
