import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { BamaStaking, BamaToken } from "../typechain-types"

describe("BamaStaking", function () {
  async function deployFixture() {
    const [owner, anonAccount] = await ethers.getSigners()

    const BamaToken = await ethers.getContractFactory("BamaToken")
    const bamaToken = await BamaToken.deploy()
    const tokenAddress = await bamaToken.getAddress()

    const Staking = await ethers.getContractFactory("BamaStaking")
    const bamaStaking = await Staking.deploy(tokenAddress)
    const stakingAddress = await bamaStaking.getAddress()

    return {
      bamaToken,
      bamaStaking,
      tokenAddress,
      stakingAddress,
      owner,
      anonAccount,
    }
  }

  describe("Deployment", function () {
    let token: BamaToken, staking: BamaStaking, tokenAddr: string

    beforeEach(async function () {
      const { bamaToken, bamaStaking, tokenAddress } = await loadFixture(
        deployFixture
      )
      token = bamaToken
      staking = bamaStaking
      tokenAddr = tokenAddress
    })

    it("Should have a token", async function () {
      expect(await staking.getAssociatedToken()).to.eq(tokenAddr)
    })
    it("Should set the right owner", async function () {
      const { owner } = await loadFixture(deployFixture)
      expect(await staking.getOwner()).to.equal(owner.address)
    })
    it("Should have 0 reward balance", async function () {
      expect(await staking.rewardTokenBalance()).to.eq(0)
    })
    it("Should have 0 staked balance", async function () {
      expect(await staking.getTotalStaked()).to.eq(0)
    })
    it("Should have 0.0005% rewards per hour", async function () {
      expect(await staking.getRewardsPerHour()).to.eq(2000)
    })
  })

  describe("Stake", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const stakingTotalRewardBal = ethers.parseEther("60000000")
    const mintId = "7654hvgs2hvs"
    const ownergasFee = ethers.parseEther("10000")

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)
    }

    beforeEach(customBeforeEach)

    it(`Token Contract's total supply should equal ${
      mintAmount + ownergasFee
    } + ${stakingTotalRewardBal}`, async function () {
      await staking.stake(amount)
      expect(await token.totalSupply()).to.eq(
        mintAmount + stakingTotalRewardBal + ownergasFee
      )
    })

    it(`Staking Contract's total balance should equal ${stakingTotalRewardBal}`, async function () {
      expect(await staking.rewardTokenBalance()).to.eq(stakingTotalRewardBal)
    })

    it(`Signer Account's balance should equal ${
      mintAmount + ownergasFee
    }`, async function () {
      await staking.stake(amount)
      expect(await token.balanceOf(signer)).to.eq(
        mintAmount + ownergasFee - amount
      )
    })

    it(`Staking Contract's total-staked balance should equal ${amount}`, async function () {
      await staking.stake(amount)
      expect(await staking.getTotalStaked()).to.eq(amount)
    })

    it("Should transfer amount", async function () {
      await expect(staking.stake(amount)).to.changeTokenBalances(
        token,
        [signer, staking],
        [-amount, amount]
      )
    })

    it("Should have a lastUpdatedAt(signer) equal to the latest block timestamp", async function () {
      await staking.stake(amount)
      const latest = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastUpdatedAt).to.eq(latest)
    })
    it("Should have claimed 0 rewards", async function () {
      await staking.stake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.totalAmtEarned).to.eq(0)
    })
    it("Should increase the signer's stake balance by amount", async function () {
      await staking.stake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.totalAmtStaked).to.eq(amount)
    })
    it("Should not change the reward balance", async function () {
      await staking.stake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.totalAmtEarned).to.eq(0)
    })
    it("Should update signer's reward index accordingly", async function () {
      await staking.stake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      const totalStaked = await staking.getTotalStaked()
      const ratio = stakerDetails.totalAmtStaked / totalStaked
      const currentRewardindex =
        (ratio * stakerDetails.totalAmtStaked) / ethers.toBigInt(2000)
      expect(stakerDetails.currentRewardIndex).to.eq(currentRewardindex)
    })

    describe("Validations", function () {
      it("Should revert if staking address isn't not approved", async function () {
        const { bamaToken, bamaStaking } = await loadFixture(deployFixture)
        await bamaToken.allocateToken(stakingAddr, "STAKING_TOKEN")
        await expect(bamaStaking.stake(amount)).to.be.reverted
      })
      it("Should revert if there's no Reward Token in the Pool", async function () {
        const { bamaStaking } = await loadFixture(deployFixture)
        await expect(bamaStaking.stake(amount)).to.be.revertedWithCustomError(
          bamaStaking,
          "BamaStaking__NoMoreRewardToken"
        )
      })
      it("Should revert if address has insufficient balance", async function () {
        const { bamaToken, bamaStaking } = await loadFixture(deployFixture)
        const cusAmount = ethers.parseEther("100000")
        await bamaToken.allocateToken(stakingAddr, "STAKING_TOKEN")
        await token.approve(stakingAddr, 0)
        await token.approve(stakingAddr, cusAmount)
        await expect(bamaStaking.stake(cusAmount)).to.be.reverted
      })
      it("Should revert if account has previously requested to unstake", async function () {
        const { bamaToken, bamaStaking, owner } = await loadFixture(
          deployFixture
        )
        await bamaToken.allocateToken(stakingAddr, "STAKING_TOKEN")
        await token.approve(stakingAddr, 0)
        await token.approve(stakingAddr, amount)
        await token.mintToken(owner.address, mintAmount, mintId)
        await bamaStaking.stake(amount)
        await bamaStaking.unstake(amount)
        const stakerDetails = await bamaStaking.getStakerDetails(signer)
        expect(stakerDetails.unstaked).to.eq(1)
        await expect(bamaStaking.stake(amount)).to.be.revertedWithCustomError(
          bamaStaking,
          "BamaStaking__UnstakeInProgress"
        )
      })
    })

    describe("Events", function () {
      beforeEach(customBeforeEach)

      it("Should emit Staked event", async function () {
        await expect(staking.stake(amount))
          .to.emit(staking, "Staked")
          .withArgs(signer, amount)
      })
    })
  })

  describe("Rewards", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const mintId = "7654hvgs2hvs"

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)
    }

    beforeEach(customBeforeEach)

    it("Should have 0.0005% of amountStaked(signer)/totalStaked(contract) rewards after one hour", async function () {
      await staking.stake(amount)
      await time.increase(60 * 60)
      expect(await staking.currentRewardsEarned(signer)).to.eq(
        ethers.parseEther("0.5")
      )
    })
  })

  describe("ClaimReward", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const mintId = "7654hvgs2hvs"
    const reward = ethers.parseEther("0.5")

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)

      await staking.stake(amount)
      await time.increase(60 * 60 - 1)
    }

    beforeEach(customBeforeEach)

    it("should change token balances", async function () {
      await expect(staking.claim()).to.changeTokenBalances(
        token,
        [signer, staking],
        [reward, -reward]
      )
    })

    it("Should increment total amount earned", async function () {
      await staking.claim()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.totalAmtEarned).to.eq(reward)
    })

    it("Should update lastUpdatedAt to current block timestamp", async function () {
      await staking.claim()
      const timestamp = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastUpdatedAt).to.eq(timestamp)
    })

    it("Should not change the balanceOf(signer)", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.claim()
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtStaked).to.eq(
        stakerDetails.totalAmtStaked
      )
    })

    it("Should not change the contract's total staked balance", async function () {
      const balance = await staking.getTotalStaked()
      await staking.claim()
      expect(await staking.getTotalStaked()).to.eq(balance)
    })
    it("Should decrement current amount earned balance", async function () {
      await staking.claim()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.currentAmtEarned).to.eq(0)
    })

    it("Should decrement the contract's reward token balance", async function () {
      const balance = await staking.rewardTokenBalance()
      await staking.claim()
      expect(await staking.rewardTokenBalance()).to.eq(balance - reward)
    })

    describe("Validations", function () {
      beforeEach(customBeforeEach)

      it("Should revert if signer has unstaked", async function () {
        await staking.unstake(amount)
        await expect(staking.claim()).to.be.revertedWithCustomError(
          staking,
          "BamaStaking__UnstakeInProgress"
        )
      })
    })

    describe("Events", function () {
      beforeEach(customBeforeEach)

      it("Should emit Claimed event", async function () {
        await expect(staking.claim())
          .to.emit(staking, "Claimed")
          .withArgs(signer, reward)
      })
    })
  })

  describe("InreaseStakingPower(Compound)", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const mintId = "7654hvgs2hvs"
    const reward = ethers.parseEther("0.5")

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)

      await staking.stake(amount)
      await time.increase(60 * 60 - 1)
    }

    beforeEach(customBeforeEach)

    it("Should not change token balances", async function () {
      await expect(staking.compound()).to.changeTokenBalances(
        token,
        [signer, staking],
        [0, 0]
      )
    })
    it("Should increment total amount earned", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.compound()
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtEarned).to.eq(
        stakerDetails.totalAmtEarned + reward
      )
    })
    it("Should increment signer's total staked balance", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.compound()
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtStaked).to.eq(
        stakerDetails.totalAmtStaked + reward
      )
    })
    it("Should increment contract's total staked balance", async function () {
      const balance = await staking.getTotalStaked()
      await staking.compound()
      expect(await staking.getTotalStaked()).to.eq(balance + reward)
    })

    it("Should decrement current earned amount", async function () {
      await staking.compound()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.currentAmtEarned).to.eq(0)
    })
    it("Should update lastUpdatedAt to current/latest timestamp", async function () {
      await staking.compound()
      const stakerDetails = await staking.getStakerDetails(signer)
      const timestamp = await time.latest()
      expect(stakerDetails.lastUpdatedAt).to.eq(timestamp)
    })

    describe("Events", function () {
      beforeEach(customBeforeEach)

      it("Should emit Compound event", async function () {
        await expect(staking.compound())
          .to.emit(staking, "Compound")
          .withArgs(signer, reward)
      })
    })
  })

  describe("Unstake", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const mintId = "7654hvgs2hvs"
    const reward = ethers.parseEther("0.5")

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)

      await staking.stake(amount)
      await time.increase(60 * 60 - 1)
    }

    beforeEach(customBeforeEach)

    it("should not change token balances", async function () {
      await expect(staking.unstake(amount)).to.changeTokenBalances(
        token,
        [signer, staking],
        [0, 0]
      )
    })

    it("Should increase total amount earned", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.unstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtEarned).to.eq(
        stakerDetails.totalAmtEarned + reward
      )
    })

    it("Should update withdrawal amount", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.unstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.withdrawalAmount).to.eq(amount)
    })

    it("Should update current amount earned for the last time till after withdrawal", async function () {
      await staking.unstake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.currentAmtEarned).to.eq(reward)
    })

    it("Should update lastUpdatedAt to current block timestamp", async function () {
      await staking.unstake(amount)
      const timestamp = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastUpdatedAt).to.eq(timestamp)
    })

    it("Should update lastWithdrawAccessTime to current block timestamp + 21 days", async function () {
      await staking.unstake(amount)
      const twentyOneDays = (await time.latest()) + 1814400
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastWithdrawAccessTime).to.eq(twentyOneDays)
    })

    it("Should not change the balanceOf(signer)/total amount staked", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.unstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtStaked).to.eq(
        stakerDetails.totalAmtStaked
      )
    })

    it("Should not change the contract's total staked balance", async function () {
      const balance = await staking.getTotalStaked()
      await staking.unstake(amount)
      expect(await staking.getTotalStaked()).to.eq(balance)
    })
    it("Should change unstaked status to true(1)", async function () {
      await staking.unstake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.unstaked).to.eq(1)
    })

    describe("Validations", function () {
      beforeEach(customBeforeEach)

      it("Should revert if signer has insufficient staked balance", async function () {
        const cusAmt = ethers.parseEther("10001")
        await expect(staking.unstake(cusAmt)).to.be.revertedWithCustomError(
          staking,
          "BamaStaking__InsufficientBalance"
        )
      })
    })
  })

  describe("EmergencyUnstake", function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const mintAmount = ethers.parseEther("10000")
    const fee = (amount * ethers.toBigInt(30)) / ethers.toBigInt(100)
    const mintId = "7654hvgs2hvs"
    const reward = ethers.parseEther("0.5")

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)

      await staking.stake(amount)
      await time.increase(60 * 60 - 1)
    }

    beforeEach(customBeforeEach)

    it("should not change token balances", async function () {
      await expect(staking.emergencyUnstake(amount)).to.changeTokenBalances(
        token,
        [signer, staking],
        [0, 0]
      )
    })

    it("Should increase total amount earned", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.emergencyUnstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtEarned).to.eq(
        stakerDetails.totalAmtEarned + reward
      )
    })

    it("Should update withdrawal amount", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.emergencyUnstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.withdrawalAmount).to.eq(amount - fee)
    })

    it("Should update current amount earned for the last time till after withdrawal", async function () {
      await staking.emergencyUnstake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.currentAmtEarned).to.eq(reward)
    })

    it("Should update lastUpdatedAt to current block timestamp", async function () {
      await staking.emergencyUnstake(amount)
      const timestamp = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastUpdatedAt).to.eq(timestamp)
    })

    it("Should update lastWithdrawAccessTime to current block timestamp", async function () {
      await staking.emergencyUnstake(amount)
      const immediately = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastWithdrawAccessTime).to.eq(immediately)
    })

    it("Should reduce balanceOf(signer)/total amount staked", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.emergencyUnstake(amount)
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtStaked).to.eq(
        stakerDetails.totalAmtStaked - fee
      )
    })

    it("Should not change the contract's total staked balance", async function () {
      const balance = await staking.getTotalStaked()
      await staking.emergencyUnstake(amount)
      expect(await staking.getTotalStaked()).to.eq(balance)
    })

    it("Should change unstaked status to true(1)", async function () {
      await staking.emergencyUnstake(amount)
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.unstaked).to.eq(1)
    })

    describe("Validations", function () {
      beforeEach(customBeforeEach)

      it("Should revert if signer has insufficient staked balance", async function () {
        const cusAmt = ethers.parseEther("10001")
        await expect(
          staking.emergencyUnstake(cusAmt)
        ).to.be.revertedWithCustomError(
          staking,
          "BamaStaking__InsufficientBalance"
        )
      })
    })
  })

  describe("Withdraw", async function () {
    let token: BamaToken, staking: BamaStaking
    let stakingAddr: any
    let signer: any
    const amount = ethers.parseEther("1000")
    const leftOveramount = ethers.parseEther("10")
    const mintAmount = ethers.parseEther("10000")
    const mintId = "7654hvgs2hvs"

    const customBeforeEach = async function () {
      const { bamaToken, bamaStaking, stakingAddress, owner } =
        await loadFixture(deployFixture)
      token = bamaToken
      staking = bamaStaking
      signer = owner.address
      stakingAddr = stakingAddress
      await token.allocateToken(stakingAddr, "STAKING_TOKEN")
      await token.mintToken(signer, mintAmount, mintId)
      await token.approve(stakingAddr, 0)
      await token.approve(stakingAddr, amount)

      await staking.stake(amount)
      await time.increase(60 * 60 - 1)
      await staking.unstake(amount - leftOveramount)
      await time.increase(60 * 60 * 24 * 21)
    }

    beforeEach(customBeforeEach)

    it("Should change token balances", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      const finalAmount =
        stakerDetails.withdrawalAmount + stakerDetails.currentAmtEarned
      await expect(staking.withdraw()).to.changeTokenBalances(
        token,
        [signer, staking],
        [finalAmount, -finalAmount]
      )
    })
    it("Should decrement balanceOf(signer)/total amount staked", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      await staking.withdraw()
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.totalAmtStaked).to.eq(
        stakerDetails.totalAmtStaked - stakerDetails.withdrawalAmount
      )
    })
    it("Should decrement contract's total staked balance", async function () {
      const stakerDetails = await staking.getStakerDetails(signer)
      const balance = await staking.getTotalStaked()
      await staking.withdraw()
      expect(await staking.getTotalStaked()).to.eq(
        balance - stakerDetails.withdrawalAmount
      )
    })
    it("Should update lastUpdatedAt to current block timestamp", async function () {
      await staking.withdraw()
      const timestamp = await time.latest()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.lastUpdatedAt).to.eq(timestamp)
    })
    it("Should change unstaked status to false(0)", async function () {
      await staking.withdraw()
      const stakerDetails = await staking.getStakerDetails(signer)
      expect(stakerDetails.unstaked).to.eq(0)
    })
    it("Should change current amount earned to 0", async function () {
      await staking.withdraw()
      const latestStakerDetails = await staking.getStakerDetails(signer)
      expect(latestStakerDetails.currentAmtEarned).to.eq(0)
    })

    describe("Validations", function () {
      beforeEach(customBeforeEach)

      it("Should revert if signer has not initiated the unstake action earlier", async function () {
        await staking.withdraw()
        await token.approve(stakingAddr, amount)
        await staking.stake(amount)
        // await staking.emergencyUnstake(amount)
        // await staking.withdraw()
        // await token.approve(stakingAddr, amount)
        // await staking.stake(amount)
        await time.increase(60 * 60)
        await expect(staking.withdraw()).to.be.revertedWithCustomError(
          staking,
          "BamaStaking__HasNotUnstaked"
        )
      })

      it("Should revert if it is not yet 21 days after untstake was initiated", async function () {
        await staking.withdraw()
        await token.approve(stakingAddr, amount)
        await staking.stake(amount)
        await time.increase(60 * 60)
        await staking.unstake(amount)
        await time.increase(1814398) // 21 days = 1814400
        await expect(staking.withdraw()).to.be.revertedWithCustomError(
          staking,
          "BamaStaking__NotYetWithdrawalTime"
        )
      })
    })

    describe("Events", function () {
      beforeEach(customBeforeEach)

      it("Should emit Unstaked event", async function () {
        const stakerDetails = await staking.getStakerDetails(signer)
        const finalAmount =
          stakerDetails.withdrawalAmount + stakerDetails.currentAmtEarned
        await expect(staking.withdraw())
          .to.emit(staking, "Unstaked")
          .withArgs(signer, finalAmount)
      })
    })
  })
})
