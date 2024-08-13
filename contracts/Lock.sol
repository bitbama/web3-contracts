// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Lock {
  uint public unlockTime;
  address payable public owner;

  event Withdrawal(uint amount, uint when);

  constructor(uint _unlockTime) payable {
    require(
      block.timestamp < _unlockTime,
      "Unlock time should be in the future"
    );

    unlockTime = _unlockTime;
    owner = payable(msg.sender);
  }

  function withdraw() public {
    // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
    // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

    require(block.timestamp >= unlockTime, "You can't withdraw yet");
    require(msg.sender == owner, "You aren't the owner");

    emit Withdrawal(address(this).balance, block.timestamp);

    owner.transfer(address(this).balance);
  }
}

// pragma solidity ^0.8.20;
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import {Chainlink, ChainlinkClient} from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
// import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
// import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
// import "./CustomUtility.sol";

// // Error
// error BamaTokenSwap__NotEligibleForSwap();

// contract BamaTokenSwap is ChainlinkClient, ConfirmedOwner, CustomUtility {
//   using SafeERC20 for IERC20;
//   using Chainlink for Chainlink.Request;

//   address private immutable i_owner;
//   IERC20 private immutable i_oldToken;
//   IERC20 private immutable i_newToken;
//   bytes32 private immutable i_jobId;
//   uint256 private immutable i_fee;
//   string private apiUrl;
//   //bool private approved;
//   uint private constant MULTIPLIER = 10 ** 18;
//   uint256 private totalSwapped = 0;
//   address private immutable burnAccount = 0x0000000000000000000000000000000000000000;

//   event TokenBurned(address indexed from, uint256 indexed amount);
//   event TokenSwapped(address indexed to, uint256 indexed amount);
//   event Funded(address indexed from, uint256 indexed amount);

//   constructor(
//     IERC20 oldToken_,
//     IERC20 newToken_,
//     address chainlinkToken_,
//     address chainlinkOracle_,
//     string memory apiUrl_
//   ) ConfirmedOwner(msg.sender) {
//     i_owner = msg.sender;
//     i_newToken = newToken_;
//     i_oldToken = oldToken_;
//     i_jobId = "";
//     i_fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 * 10**18 (Varies by network and job)
//     apiUrl = apiUrl_;
//     _setChainlinkToken(chainlinkToken_);
//     _setChainlinkOracle(chainlinkOracle_);
//   }

//   function _request(address account_) private returns (bytes32 requestId) {
//     Chainlink.Request memory req = _buildChainlinkRequest(
//       i_jobId,
//       address(this),
//       this.swapToken.selector
//     );
//     string memory account = CustomUtility.toString(account_);
//     string memory fullUrl = string.concat(apiUrl, account);
//     req._add("get", fullUrl);
//     req._add("path", "approved");
//     return _sendChainlinkRequest(req, i_fee);
//   }

//   // Receive the response in the form of a boolean
//   // function fulfill(
//   //   bytes32 _requestId,
//   //   bool _approved
//   // ) public payable recordChainlinkFulfillment(_requestId) {
//   //   approved = _approved;
//   // }

//   function _fund(address account_, uint256 amount_) internal {
//     i_newToken.safeTransferFrom(account_, address(this), amount_);
//     emit Funded(msg.sender, msg.value);
//   }

//   function swapToken(
//     // address account_,
//     // uint256 amount_,
//     bytes32 _requestId,
//     bool approved
//   ) public payable recordChainlinkFulfillment(_requestId) {
//     uint256 amount_ = msg.value;
//     address account_ = msg.sender;
//     totalSwapped += amount_;
//     if (!approved) {
//       i_oldToken.safeTransfer(account_, amount_);
//       revert BamaTokenSwap__NotEligibleForSwap();
//       }
//     i_oldToken.safeTransfer(burnAccount, amount_);
//     emit TokenBurned(account_, amount_);
//     i_newToken.safeTransfer(account_, amount_);
//     emit TokenSwapped(account_, amount_);
//   }

//   function receiveToken() public payable {
//     uint256 amount = msg.value;
//     address account = msg.sender;
//     if (account == i_owner) return _fund(account, amount);
//     _request(account);
//     // _swapToken(account, amount);
//   }

//   function getAssociatedToken() public view returns (IERC20) {
//     return i_newToken;
//   }

//   function getTotalSwapped() public view returns (uint256) {
//     return totalSwapped;
//   }

//   receive() external payable {
//     receiveToken();
//   }
// }
