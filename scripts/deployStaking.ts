import { ethers, network } from "hardhat"
import verify from "../utils/verify"
import { developmentChains } from "../helper-hardhat-config"

async function main() {
  // const bamaToken = await ethers.deployContract("BamaToken")
  // await bamaToken.waitForDeployment()
  // await bamaToken.deploymentTransaction()?.wait(5)
  // console.log(`Deployed Bama Token to ${bamaToken.target}`)
  // console.log(`_____________________________________`)

  //   Staking Contract
  const bamaStaking = await ethers.deployContract("BamaStaking", [
    `${process.env.OLD_BAMA_TOKEN_ADDRESS}`,
  ])
  await bamaStaking.waitForDeployment()
  await bamaStaking.deploymentTransaction()?.wait(5)
  console.log(`Deployed Bama Staking to ${bamaStaking.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //await verify(`${process.env.OLD_BAMA_TOKEN_ADDRESS}`, [])
    await verify(`${bamaStaking.target}`, [`${process.env.OLD_BAMA_TOKEN_ADDRESS}`])
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
