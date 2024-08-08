import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
//import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("Connect", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployConnect() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()

    const Connect = await ethers.getContractFactory("Connect")
    const connect = await Connect.deploy()

    return { connect, owner, otherAccount }
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { connect, owner } = await loadFixture(deployConnect)
      expect(await connect.getOwner()).to.equal(owner.address)
    })
  })

  describe("Funding", function () {
    it("Fails if you don't send enough ETH", async () => {
      const ethAmount = 1_000_000_0
      const { connect } = await loadFixture(deployConnect)
      await expect(
        connect.fund({ value: ethAmount })
      ).to.be.revertedWithCustomError(connect, "Connect__NotEnoughEth")
    })
    it("Should transfer the funds to the owner", async function () {
      const fundAmount = 28_000_000_000_000_00
      const { connect, owner } = await loadFixture(deployConnect)
      await expect(connect.fund({ value: fundAmount })).to.changeEtherBalance(
        owner,
        -fundAmount
      )
    })
  })

  describe("Withdraw", function () {
    it("Should withdraw the funds", async function () {
      const { connect, owner } = await loadFixture(deployConnect)
      await expect(connect.withdraw()).to.changeEtherBalance(owner, 0)
    })
    it("Should not withdraw if not owner", async function () {
      const { connect, otherAccount } = await loadFixture(deployConnect)
      const connectedContract = connect.connect(otherAccount)
      await expect(connectedContract.withdraw()).to.be.revertedWithCustomError(
        connect,
        "Connect__NotOwner"
      )
    })
  })

  describe("Events", function () {
    it("Should emit an event on funding", async function () {
      const fundAmount = 28_000_000_000_000_00
      const { connect, owner } = await loadFixture(deployConnect)
      await expect(connect.fund({ value: fundAmount }))
        .to.emit(connect, "Funded")
        .withArgs(owner.address, fundAmount) // We accept any value as `when` arg
    })
    it("Should emit an event on withdrawal", async function () {
      const contractBalance = 0
      const { connect } = await loadFixture(deployConnect)
      await expect(connect.withdraw())
        .to.emit(connect, "Withdrawn")
        .withArgs(contractBalance)
    })
  })
})
