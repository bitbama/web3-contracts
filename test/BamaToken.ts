import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { BamaToken } from "../typechain-types"

describe("BamaToken", function () {
    const name = "Bama"
    const symbol = "BAMA"
    const cappedSupply = ethers.parseEther("500000000")

    const allocationTypes = {
        IDO_TOKEN: ethers.parseEther("20000000"),
        LIQUIDITY_TOKEN: ethers.parseEther("50000000"), 
        STAKING_TOKEN: ethers.parseEther("60000000"),
        TREASURY_TOKEN: ethers.parseEther("35000000"),
        FOUNDATION_TOKEN: ethers.parseEther("60000000"),
        TEAM_TOKEN: ethers.parseEther("25000000"),
        SEED_INVESTORS_TOKEN: ethers.parseEther("25000000")
    }

    async function deployFixture() {
        // Contracts are deployed using the first signer/account by default
        const [
            owner, anonAccount, IDO_TOKEN, LIQUIDITY_TOKEN, 
            STAKING_TOKEN, TREASURY_TOKEN, FOUNDATION_TOKEN,
            TEAM_TOKEN, SEED_INVESTORS_TOKEN
        ] = await ethers.getSigners()
    
        const BamaToken = await ethers.getContractFactory("BamaToken")
        const token = await BamaToken.deploy()
    
        return { 
            token, owner, anonAccount, 
            IDO_TOKEN, LIQUIDITY_TOKEN, STAKING_TOKEN, 
            TREASURY_TOKEN, FOUNDATION_TOKEN,
            TEAM_TOKEN, SEED_INVESTORS_TOKEN
         }
      }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { token, owner } = await loadFixture(deployFixture)
            expect(await token.getOwner()).to.equal(owner.address)
          })
        it("Should have the name Bama", async function () {
            const {token} = await loadFixture(deployFixture)
            expect(await token.name()).to.eq(name)
        })
        it("Should have the symbol BAMA", async function () {
            const {token} = await loadFixture(deployFixture)
            expect(await token.symbol()).to.eq(symbol)
        })
        it("Should have a capped total supply of 500,000,000", async function () {
            const {token} = await loadFixture(deployFixture)
            expect(await token.cap()).to.eq(cappedSupply)
        })
    })

    describe("AllocationAmount", function () {
        for (const [key, value] of Object.entries(allocationTypes)) {
        it(`${key} should be a total of ${value} allocation`, async function () {
            const {token} = await loadFixture(deployFixture)
            expect(await token.getAllocation(key)).to.eq(value)
        })
        }
    })

    describe("AllocateTokens", function () {
        let bamaToken: BamaToken;
        let allocationAccounts: any = {}
        
        beforeEach(async function () {
            const {
                token,
                IDO_TOKEN, LIQUIDITY_TOKEN, STAKING_TOKEN, 
                TREASURY_TOKEN, FOUNDATION_TOKEN,
                TEAM_TOKEN, SEED_INVESTORS_TOKEN
            } = await loadFixture(deployFixture)

            bamaToken = token;
            allocationAccounts.IDO_TOKEN = IDO_TOKEN
            allocationAccounts.LIQUIDITY_TOKEN = LIQUIDITY_TOKEN
            allocationAccounts.STAKING_TOKEN = STAKING_TOKEN
            allocationAccounts.TREASURY_TOKEN = TREASURY_TOKEN
            allocationAccounts.FOUNDATION_TOKEN = FOUNDATION_TOKEN
            allocationAccounts.TEAM_TOKEN = TEAM_TOKEN
            allocationAccounts.SEED_INVESTORS_TOKEN = SEED_INVESTORS_TOKEN
        })

        it("Should not allocate token if action is not initiated by owner", async function () {
            const connectedContract = bamaToken.connect(allocationAccounts["IDO_TOKEN"])
            await expect(connectedContract.allocateToken(allocationAccounts["IDO_TOKEN"], "IDO_TOKEN")).to.be.revertedWithCustomError(
              bamaToken,
              "BamaToken__NotOwner"
            )
          })

        for (const [key, value] of Object.entries(allocationTypes)) {
        it(`${key} account should get a total of ${value} tokens`, async function () {
            await expect(bamaToken.allocateToken(allocationAccounts[key], key)).to.changeTokenBalances(bamaToken, 
                [bamaToken, allocationAccounts[key]],
                [0, value]
            )
            expect(await bamaToken.totalSupply()).to.equal(value);
        })

        it(`${key} account should not get allocation of ${value} tokens for the second time`, async function () {
            await expect(bamaToken.allocateToken(allocationAccounts[key], key)).to.changeTokenBalances(bamaToken, 
                [bamaToken, allocationAccounts[key]],
                [0, value]
            )
            await expect(bamaToken.allocateToken(allocationAccounts[key], key)).to.revertedWithCustomError(
                bamaToken,
                "BamaToken__HasAllocation"
              )
              expect(await bamaToken.totalSupply()).to.equal(value);
        })
        }

        it("Should emit an event on allocation", async function () {
            await expect(bamaToken.allocateToken(allocationAccounts["IDO_TOKEN"], "IDO_TOKEN"))
              .to.emit(bamaToken, "Allocated")
              .withArgs(allocationAccounts["IDO_TOKEN"].address, allocationTypes["IDO_TOKEN"], "IDO_TOKEN") // We accept any value as `when` arg
          })
    })

    describe("MintTokens", function () {
        let bamaToken: BamaToken;
        let otherAccount: any
        
        beforeEach(async function () {
            const {
                token,
                anonAccount
             } = await loadFixture(deployFixture)

            bamaToken = token;
            otherAccount = anonAccount;
        })
        const amount = ethers.parseEther("10000")
        const mintId = "8765yte43234"

        it("Should not mint token if action is not initiated by owner", async function () {
            const connectedContract = bamaToken.connect(otherAccount)
            await expect(connectedContract.mintToken(otherAccount, amount, mintId)).to.be.revertedWithCustomError(
              bamaToken,
              "BamaToken__NotOwner"
            )
          })

          it("Should not mint token if amount is greater than 10,000", async function () {
            const customAmt = ethers.parseEther("10001")
            await expect(bamaToken.mintToken(otherAccount, customAmt, mintId)).to.be.revertedWithCustomError(
              bamaToken,
              "BamaToken__MaxMintAmountExceeded"
            )
          })

        //   Never run this test again. Except if maxMinAmount is increased considerably
        //   it("Should not mint token if total amount minted is equal to allocation for COMMUNITY_TOKEN", async function () {
        //   const COMMUNITY_TOKEN = ethers.parseEther("225000000")
        //   const maxMintAmount = 10000
        //   const communityToken = 225000000 // 45% of total Bama token
        //   const loopTime = communityToken / maxMintAmount
        //
        //     for (let i = 0; i < loopTime; i++) {
        //         await expect(bamaToken.mintToken(otherAccount, amount, mintId)).to.changeTokenBalances(bamaToken, 
        //             [bamaToken, otherAccount],
        //             [0, amount]
        //         )
        //     }

        //     expect(await bamaToken.totalSupply()).to.equal(COMMUNITY_TOKEN);

        //     await expect(bamaToken.mintToken(otherAccount, amount, mintId)).to.be.revertedWithCustomError(
        //         bamaToken,
        //         "BamaToken__NoMoreCommunityToken"
        //       )
        //   })

        it(`Account should have received a total of ${amount} Bama token`, async function () {
            await expect(bamaToken.mintToken(otherAccount, amount, mintId)).to.changeTokenBalances(bamaToken, 
                [bamaToken, otherAccount],
                [0, amount]
            )
            expect(await bamaToken.totalSupply()).to.equal(amount);
        })

        it("Should emit an event on mint", async function () {
            await expect(bamaToken.mintToken(otherAccount, amount, mintId))
              .to.emit(bamaToken, "Minted")
              .withArgs(otherAccount.address, amount, mintId) // We accept any value as `when` arg
          })
        
    })

})