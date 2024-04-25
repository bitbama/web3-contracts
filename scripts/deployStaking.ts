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
    "0x375Da692C2743E3AA18c51fDCE139d08490BfA42",
  ])
  await bamaStaking.waitForDeployment()
  await bamaStaking.deploymentTransaction()?.wait(5)
  console.log(`Deployed Bama Staking to ${bamaStaking.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //await verify(`${"0x375Da692C2743E3AA18c51fDCE139d08490BfA42"}`, [])
    await verify(`${bamaStaking.target}`, [
      "0x375Da692C2743E3AA18c51fDCE139d08490BfA42",
    ])
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
