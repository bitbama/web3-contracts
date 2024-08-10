import { ethers, network } from "hardhat"
import verify from "../utils/verify"
import { developmentChains } from "../helper-hardhat-config"

const DEPLOYER_ADDRESS = `${process.env.DEPLOYER_ADDRESS}`
const OLD_BAMA_TOKEN_ADDRESS = `${process.env.OLD_BAMA_TOKEN_ADDRESS}`
const CHAINLINK_TOKEN = `${process.env.CHAINLINK_TOKEN}`
const CHAINLINK_ORACLE = `${process.env.CHAINLINK_ORACLE}`
const CHAINLINK_JOB_ID = `${process.env.CHAINLINK_JOB_ID}`
const API_URL = `${process.env.API_URL}`

async function main() {
  const bamaTokenII = await ethers.deployContract("BamaTokenII", [DEPLOYER_ADDRESS])
  await bamaTokenII.waitForDeployment()
  await bamaTokenII.deploymentTransaction()?.wait(5)
  console.log(`Deployed to ${bamaTokenII.target}`, `By ${DEPLOYER_ADDRESS}`)
  console.log(`_____________________________________`)

   //   Bama Token Swap Contract
   const bamaTokenSwap = await ethers.deployContract("BamaTokenSwap", [
    `${OLD_BAMA_TOKEN_ADDRESS}`, `${bamaTokenII.target}`, `${CHAINLINK_TOKEN}`,
    `${CHAINLINK_ORACLE}`, `${API_URL}`,
  ])
  await bamaTokenSwap.waitForDeployment()
  await bamaTokenSwap.deploymentTransaction()?.wait(5)
  console.log(`Deployed Bama Staking to ${bamaTokenSwap.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(`${bamaTokenII.target}`, [DEPLOYER_ADDRESS])
    await verify(`${bamaTokenSwap.target}`, [
      `${OLD_BAMA_TOKEN_ADDRESS}`, `${bamaTokenII.target}`, `${CHAINLINK_TOKEN}`,
      `${CHAINLINK_ORACLE}`, `${API_URL}`,
    ])
  }

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
