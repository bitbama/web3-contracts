import { ethers, network } from "hardhat"
import verify from "../utils/verify"
import { developmentChains } from "../helper-hardhat-config"

const DEPLOYER_ADDRESS = `${process.env.DEPLOYER_ADDRESS}`

async function main() {
  const bamaTokenII = await ethers.deployContract("BamaTokenII", [
    DEPLOYER_ADDRESS,
  ])
  await bamaTokenII.waitForDeployment()
  await bamaTokenII.deploymentTransaction()?.wait(5)
  console.log(`Deployed to ${bamaTokenII.target}`, `By ${DEPLOYER_ADDRESS}`)
  console.log(`_____________________________________`)

  const newTokenAddress = bamaTokenII.target

  //   Bama Token Swap Contract
  const bamaTokenSwap = await ethers.deployContract("BamaTokenSwap", [
    `${newTokenAddress}`,
  ])
  await bamaTokenSwap.waitForDeployment()
  await bamaTokenSwap.deploymentTransaction()?.wait(5)
  console.log(`Deployed BamaTokenSwap to ${bamaTokenSwap.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(`${newTokenAddress}`, [DEPLOYER_ADDRESS])
    await verify(`${bamaTokenSwap.target}`, [`${newTokenAddress}`])
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
