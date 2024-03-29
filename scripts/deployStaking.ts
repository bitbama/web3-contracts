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
    "0xd0Ce39Dbc5c15a167831314c21F0740E7ba914f0",
  ])
  await bamaStaking.waitForDeployment()
  await bamaStaking.deploymentTransaction()?.wait(5)
  console.log(`Deployed Bama Staking to ${bamaStaking.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //await verify(`${"0xd0Ce39Dbc5c15a167831314c21F0740E7ba914f0"}`, [])
    await verify(`${bamaStaking.target}`, ["0xd0Ce39Dbc5c15a167831314c21F0740E7ba914f0"])
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
