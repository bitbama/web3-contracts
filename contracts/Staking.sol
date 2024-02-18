// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.20;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Error
error BamaStaking__NotOwner();
error BamaStaking__NoMoreRewardToken();
error BamaStaking__InsufficientBalance();
error BamaStaking__NoEarnedAmount();
error BamaStaking__HasNotUnstaked();
error BamaStaking__NotYetWithdrawalTime();
error BamaStaking__UnstakeInProgress();

contract BamaStaking {
    using SafeERC20 for IERC20;

    IERC20 private immutable token;
    address private immutable i_owner;
    uint private constant MULTIPLIER = 1e18;
    uint256 private constant REWARDS_PER_HOUR = 2000; // 0.0005%
    uint256 private totalStaked = 0;

    event RewardTokenReceived(address indexed sender, uint256 indexed amount); 
    event Staked(address indexed sender, uint256 indexed amount);
    event Unstaked(address indexed sender, uint256 indexed amount);
    event Claimed(address indexed sender, uint256 indexed amount);
    event Compound(address indexed sender, uint256 indexed amount);
    event AutoStaked(address indexed sender, uint256 indexed amount, string indexed stakeId);

    struct Staker {
        uint256 totalAmtStaked;
        uint256 totalAmtEarned;
        uint256 currentAmtEarned;
        uint256 withdrawalAmount;
        uint256 lastUpdatedAt;
        uint256 currentRewardIndex;
        uint256 lastWithdrawAccessTime;
        uint256 unstaked;
    }
    mapping(address => Staker) public StakerDetails;

     // Modifiers
  modifier onlyOwner() {
    if (msg.sender != i_owner) revert BamaStaking__NotOwner();
    _;
  }

    constructor(IERC20 token_) {
        token = token_; 
        i_owner = msg.sender;
    }

    function receiveRewardToken() public payable {
    token.safeTransferFrom(msg.sender, address(this), msg.value);
    emit RewardTokenReceived(msg.sender, msg.value);
  }

    function rewardTokenBalance() external view returns (uint256) {
        return _rewardTokenBalance();
    }

    function _rewardTokenBalance() internal view returns (uint256) {
        return token.balanceOf(address(this)) - totalStaked;
    }

    function _updateRewardIndex(address address_) private {
        uint256 newRewardIndex = (StakerDetails[address_].totalAmtStaked / totalStaked) * StakerDetails[address_].totalAmtStaked;
        StakerDetails[address_].currentRewardIndex = (newRewardIndex * 1/REWARDS_PER_HOUR);
    }

    function stake(uint256 amount_) public {
        _stake(amount_);
    }

    function _stake(uint256 amount_) internal {
        if(_rewardTokenBalance() == 0) revert BamaStaking__NoMoreRewardToken();
        if(StakerDetails[msg.sender].unstaked == 1) revert BamaStaking__UnstakeInProgress();

        uint256 currentAmtEarned = _currentRewardsEarned(msg.sender);
        StakerDetails[msg.sender].currentAmtEarned = currentAmtEarned;
        StakerDetails[msg.sender].totalAmtStaked += amount_;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
        totalStaked += amount_;
        _updateRewardIndex(msg.sender);
        token.safeTransferFrom(msg.sender, address(this), amount_);
        emit Staked(msg.sender, amount_);
    }

    function currentRewardsEarned(address address_) external view returns (uint256) {
       return _currentRewardsEarned(address_);
    }

    function _currentRewardsEarned(address address_) internal view returns (uint256) {
        if(StakerDetails[msg.sender].unstaked == 1) return StakerDetails[address_].currentAmtEarned;

        uint256 lastUpdated = StakerDetails[address_].lastUpdatedAt;
        uint256 elapsedSeconds = (block.timestamp - lastUpdated);
        return (StakerDetails[address_].currentRewardIndex * elapsedSeconds / 1 hours) + StakerDetails[address_].currentAmtEarned;
        }

    function _updateStakerDetails(uint256 amount_) internal {
        StakerDetails[msg.sender].totalAmtEarned += amount_;
        StakerDetails[msg.sender].currentAmtEarned = 0;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
    }
        
    function claim() external {
        if(StakerDetails[msg.sender].unstaked == 1) revert BamaStaking__UnstakeInProgress();
        uint256 amount = _currentRewardsEarned(msg.sender);
        if(amount <= 0) revert BamaStaking__NoEarnedAmount();
        _updateStakerDetails(amount);
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function compound() external {
        _compound();
    }

    function _compound() internal {
        if(StakerDetails[msg.sender].unstaked == 1) revert BamaStaking__UnstakeInProgress();
        uint256 amount = _currentRewardsEarned(msg.sender);
        totalStaked += amount;
        StakerDetails[msg.sender].totalAmtStaked += amount;
        StakerDetails[msg.sender].totalAmtEarned += amount;
        StakerDetails[msg.sender].currentAmtEarned = 0;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
        emit Compound(msg.sender, amount);
    }

    function unstake(uint256 amount_) external {
        uint256 balanceOf = StakerDetails[msg.sender].totalAmtStaked;
        uint256 currAmtEarned = _currentRewardsEarned(msg.sender);
        if(balanceOf < amount_) revert BamaStaking__InsufficientBalance();
        StakerDetails[msg.sender].lastWithdrawAccessTime = block.timestamp + 21 days;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
        StakerDetails[msg.sender].withdrawalAmount = amount_;
        StakerDetails[msg.sender].totalAmtEarned += currAmtEarned;
        StakerDetails[msg.sender].currentAmtEarned = currAmtEarned;
        StakerDetails[msg.sender].unstaked = 1;
    }

    function emergencyUnstake(uint256 amount_) external {
        uint256 balanceOf = StakerDetails[msg.sender].totalAmtStaked;
        uint256 currAmtEarned = _currentRewardsEarned(msg.sender);
        if(balanceOf < amount_) revert BamaStaking__InsufficientBalance();
        uint256 fee = amount_ * 30/100;
        StakerDetails[msg.sender].withdrawalAmount = amount_ - fee;
        StakerDetails[msg.sender].totalAmtStaked -= fee;
        StakerDetails[msg.sender].totalAmtEarned += currAmtEarned;
        StakerDetails[msg.sender].currentAmtEarned = currAmtEarned;
        StakerDetails[msg.sender].lastWithdrawAccessTime = block.timestamp;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
        StakerDetails[msg.sender].unstaked = 1;
    }

    function withdraw() external {
        uint256 withdrawalAmount = StakerDetails[msg.sender].withdrawalAmount;
        uint256 balanceOf = StakerDetails[msg.sender].totalAmtStaked;
        uint256 currentAmtEarned = StakerDetails[msg.sender].currentAmtEarned;
        uint256 lastWithdrawAccessTime = StakerDetails[msg.sender].lastWithdrawAccessTime;
        uint256 unstaked = StakerDetails[msg.sender].unstaked;
        if(balanceOf < withdrawalAmount) revert BamaStaking__InsufficientBalance();
        if(unstaked != 1) revert BamaStaking__HasNotUnstaked();
        if(lastWithdrawAccessTime > block.timestamp) revert BamaStaking__NotYetWithdrawalTime();

        StakerDetails[msg.sender].totalAmtStaked -= withdrawalAmount;
        StakerDetails[msg.sender].lastUpdatedAt = block.timestamp;
        uint256 finalAmount = withdrawalAmount + currentAmtEarned;
        totalStaked -= withdrawalAmount;
        StakerDetails[msg.sender].unstaked = 0;
        StakerDetails[msg.sender].currentAmtEarned = 0; 
        token.safeTransfer(msg.sender, finalAmount);
        emit Unstaked(msg.sender, finalAmount);
    }

     function getAssociatedToken() public view returns (IERC20) {
    return token;
  }

   function getOwner() public view returns (address) {
    return i_owner;
  }

   function getRewardsPerHour() public pure returns (uint256) {
    return REWARDS_PER_HOUR;
  }

  function getTotalStaked() public view returns (uint256) {
    return totalStaked;
  }

  function getStakerDetails(address account) public view returns (Staker memory) {
    return StakerDetails[account];
  }

    fallback() external payable {
        receiveRewardToken();
    }

    receive() external payable {
        receiveRewardToken();
    }

}