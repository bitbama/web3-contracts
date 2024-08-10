// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Chainlink, ChainlinkClient} from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "./CustomUtility.sol";

// Error 
error BamaTokenSwap__NotEligibleForSwap();

contract BamaTokenSwap is ChainlinkClient, ConfirmedOwner, CustomUtility {
  using SafeERC20 for IERC20;
  using Chainlink for Chainlink.Request;

  IERC20 private immutable i_oldToken;
  IERC20 private immutable i_newToken;
  bytes32 private immutable i_jobId;
  uint256 private immutable i_fee;
  string private apiUrl;
  bool private approved;
  uint private constant MULTIPLIER = 10 ** 18;
  uint256 private totalSwapped = 0;
  address private immutable burnAccount = 0x0000000000000000000000000000000000000000;

  event TokenBurned(address indexed from, uint256 indexed amount);
  event TokenSwapped(address indexed to, uint256 indexed amount);

  constructor(
    IERC20 oldToken_, IERC20 newToken_, 
    address chainlinkToken_, address chainlinkOracle_,
     string memory apiUrl_
    ) ConfirmedOwner(msg.sender) {
    i_newToken = newToken_;
    i_oldToken = oldToken_;
    i_jobId = "";
    i_fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 * 10**18 (Varies by network and job)
    apiUrl = apiUrl_;
     _setChainlinkToken(chainlinkToken_);
    _setChainlinkOracle(chainlinkOracle_);
  }

  function _request(address account_) private returns (bytes32 requestId) {
    Chainlink.Request memory req = _buildChainlinkRequest(
      i_jobId,
      address(this),
      this.fulfill.selector
    );
    string memory account = CustomUtility.toString(account_);
    string memory fullUrl = string.concat(apiUrl, account);
    req._add("get", fullUrl);
    req._add("path", "approved");
    return _sendChainlinkRequest(req, i_fee);
  }

  // Receive the response in the form of a boolean
  function fulfill(
    bytes32 _requestId,
    bool _approved
  ) public recordChainlinkFulfillment(_requestId) {
    approved = _approved;
  }

  function _swapToken(address account_, uint256 amount_) internal {
    totalSwapped += amount_;
    i_newToken.safeTransfer(account_, amount_);
    emit TokenSwapped(account_, amount_);
  }

  function receiveToken() public payable {
    uint256 amount = msg.value;
    address account = msg.sender;
    _request(account);
    if(!approved) revert BamaTokenSwap__NotEligibleForSwap();
    i_oldToken.safeTransferFrom(account, burnAccount, amount);
    emit TokenBurned(account, amount);
    _swapToken(account, amount);
  }

  function getAssociatedToken() public view returns (IERC20) {
    return i_newToken;
  }

  function getTotalMigrated() public view returns (uint256) {
    return totalSwapped;
  }

  receive() external payable {
    receiveToken();
  }
}
