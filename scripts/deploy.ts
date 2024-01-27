import { ethers, network } from "hardhat"
import verify from "../utils/verify"
import { developmentChains } from "../helper-hardhat-config"

async function main() {
  const connect = await ethers.deployContract("Connect")
  await connect.waitForDeployment()
  await connect.deploymentTransaction()?.wait(5)
  console.log(`Deployed to ${connect.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(`${connect.target}`, [])
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
