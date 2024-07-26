// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

// Error
error BamaToken__NotOwner();
error BamaToken__HasAllocation();
error BamaToken__NoMoreCommunityToken();
error BamaToken__MaxMintAmountExceeded();

contract BamaToken is ERC20Capped {
  // State Variables
  address private immutable i_owner;
  string internal constant TOKEN_NAME = "Bama";
  string internal constant TOKEN_TICKER = "BAMA";
  uint256 internal constant CAP = 500_000_000;
  uint256 internal constant TOKEN_SIZE = 10 ** 18;
  uint256 internal constant COMMUNITY_TOKEN = ((CAP * TOKEN_SIZE) * 45) / 100; // 45%
  uint256 internal constant IDO_TOKEN = ((CAP * TOKEN_SIZE) * 4) / 100; // 4%
  uint256 internal constant LIQUIDITY_TOKEN = ((CAP * TOKEN_SIZE) * 10) / 100; // 10%
  uint256 internal constant STAKING_TOKEN = ((CAP * TOKEN_SIZE) * 12) / 100; // 12%
  uint256 internal constant TREASURY_TOKEN = ((CAP * TOKEN_SIZE) * 7) / 100; // 7%
  uint256 internal constant FOUNDATION_TOKEN = ((CAP * TOKEN_SIZE) * 12) / 100; // 12%
  uint256 internal constant TEAM_TOKEN = ((CAP * TOKEN_SIZE) * 5) / 100; // 5%
  uint256 internal constant SEED_INVESTORS_TOKEN =
    ((CAP * TOKEN_SIZE) * 5) / 100; // 5%
  uint256 internal constant MAX_MINT_AMOUNT = 10_000 * TOKEN_SIZE;
  uint256 internal constant OWNER_GAS_FEES = 10_000 * TOKEN_SIZE;
  uint256 private _amountMintedBycommunity = 0;

  mapping(string => uint256) allocationTokens;
  mapping(string => address) allocationAccounts;

  // Modifiers
  modifier onlyOwner() {
    if (msg.sender != i_owner) revert BamaToken__NotOwner();
    _;
  }

  // Events
  event Allocated(
    address indexed to,
    uint256 indexed amount,
    string indexed allocationType
  );
  event Minted(
    address indexed to,
    uint256 indexed amount,
    string indexed mintId
  );

  constructor() ERC20(TOKEN_NAME, TOKEN_TICKER) ERC20Capped(CAP * TOKEN_SIZE) {
    i_owner = msg.sender;
    _amountMintedBycommunity += OWNER_GAS_FEES;
    ERC20._mint(msg.sender, OWNER_GAS_FEES);
    allocationTokens["IDO_TOKEN"] = IDO_TOKEN;
    allocationTokens["LIQUIDITY_TOKEN"] = LIQUIDITY_TOKEN;
    allocationTokens["STAKING_TOKEN"] = STAKING_TOKEN;
    allocationTokens["TREASURY_TOKEN"] = TREASURY_TOKEN;
    allocationTokens["FOUNDATION_TOKEN"] = FOUNDATION_TOKEN;
    allocationTokens["TEAM_TOKEN"] = TEAM_TOKEN;
    allocationTokens["SEED_INVESTORS_TOKEN"] = SEED_INVESTORS_TOKEN;
  }

  function allocateToken(
    address account,
    string calldata allocationType
  ) external onlyOwner {
    if (allocationAccounts[allocationType] == account)
      revert BamaToken__HasAllocation();
    uint256 amount = allocationTokens[allocationType];
    allocationAccounts[allocationType] = account;
    ERC20._mint(account, amount);
    emit Allocated(account, amount, allocationType);
  }

  function mintToken(
    address account,
    uint256 amount,
    string calldata mintId
  ) external onlyOwner {
    if ((_amountMintedBycommunity + amount) > COMMUNITY_TOKEN)
      revert BamaToken__NoMoreCommunityToken();
    if (amount > MAX_MINT_AMOUNT) revert BamaToken__MaxMintAmountExceeded();
    _amountMintedBycommunity += amount;
    ERC20._mint(account, amount);
    emit Minted(account, amount, mintId);
  }

  function getOwner() public view returns (address) {
    return i_owner;
  }

  function getMintedBamaAmount() public view returns (uint256) {
    return _amountMintedBycommunity;
  }

  function getAllocation(
    string calldata allocationType
  ) public view returns (uint256) {
    return allocationTokens[allocationType];
  }
}
