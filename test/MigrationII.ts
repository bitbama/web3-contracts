import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { MigrationII, BamaToken } from "../typechain-types"

describe("MigrationII", function () {
  async function deployFixture() {
    const [owner, anonAccount] = await ethers.getSigners()

    const BamaToken = await ethers.getContractFactory("BamaToken")
    const bamaToken = await BamaToken.deploy()
    const tokenAddress = await bamaToken.getAddress()

    const MigrationII = await ethers.getContractFactory("MigrationII")
    const bamaMigration = await MigrationII.deploy(tokenAddress)
    const migrationAddress = await bamaMigration.getAddress()

    return {
      bamaToken,
      bamaMigration,
      tokenAddress,
      migrationAddress,
      owner,
      anonAccount,
    }
  }

  describe("Deployment", function () {
    let token: BamaToken, migration: MigrationII, tokenAddr: string

    beforeEach(async function () {
      const { bamaToken, bamaMigration, tokenAddress } = await loadFixture(
        deployFixture
      )
      token = bamaToken
      migration = bamaMigration
      tokenAddr = tokenAddress
    })

    it("Should have a token", async function () {
      expect(await migration.getAssociatedToken()).to.eq(tokenAddr)
    })
    it("Should set the right owner", async function () {
      const { owner } = await loadFixture(deployFixture)
      expect(await migration.getOwner()).to.equal(owner.address)
    })
    it("Should have 0 token balance", async function () {
      expect(await migration.tokenBalance()).to.eq(0)
    })
    it("Should have 0 migrated balance", async function () {
      expect(await migration.getTotalMigrated()).to.eq(0)
    })
  })

  describe("MigrateBama", function () {
    let token: BamaToken, migration: MigrationII
    let migrationAddr: any
    let signer: any
    let otherAccount: any
    const amount = ethers.parseEther("10000")
    const migrationAmount = ethers.parseEther("100")
    const mintId = "7654hvgs2hvs"

    const customBeforeEach = async function () {
      const { bamaToken, bamaMigration, migrationAddress, owner, anonAccount } =
        await loadFixture(deployFixture)
      token = bamaToken
      migration = bamaMigration
      signer = owner.address
      otherAccount = anonAccount
      migrationAddr = migrationAddress
      //await token.mintToken(signer, amount, mintId)
      await token.mintToken(migrationAddr, amount, mintId)
      //await token.approve(migrationAddr, 0)
      await token.approve(migrationAddr, migrationAmount)
    }

    beforeEach(customBeforeEach)

    it(`Contract should have ${amount} token balance`, async function () {
      expect(await migration.tokenBalance()).to.eq(amount)
    })

    it("should change token balances", async function () {
      await expect(
        migration.migrationII(otherAccount, migrationAmount, mintId)
      ).to.changeTokenBalances(
        token,
        [otherAccount, migration],
        [migrationAmount, -migrationAmount]
      )
    })

    it(`Should have ${migrationAmount} migrated balance`, async function () {
      await migration.migrationII(otherAccount, migrationAmount, mintId)
      expect(await migration.getTotalMigrated()).to.eq(migrationAmount)
    })

    describe("Validations", function () {
      beforeEach(customBeforeEach)

      it("Should not migrate token if action is not initiated by owner", async function () {
        const connectedContract = migration.connect(otherAccount)
        await expect(
          connectedContract.migrationII(otherAccount, migrationAmount, mintId)
        ).to.be.revertedWithCustomError(migration, "MigrationII__NotOwner")
      })

      it("Should not mint token if amount is greater than 10,000", async function () {
        const customAmt = ethers.parseEther("10001")
        await expect(
          migration.migrationII(otherAccount, customAmt, mintId)
        ).to.be.revertedWithCustomError(
          migration,
          "MigrationII__MaxMigrationAmtExceeded"
        )
      })
    })

    describe("Events", function () {
      beforeEach(customBeforeEach)

      it("Should emit MigratedII event", async function () {
        await expect(
          migration.migrationII(otherAccount, migrationAmount, mintId)
        )
          .to.emit(migration, "MigratedII")
          .withArgs(otherAccount.address, migrationAmount, mintId)
      })
    })
  })
})
