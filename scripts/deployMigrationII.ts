import { ethers, network } from "hardhat"
import verify from "../utils/verify"
import { developmentChains } from "../helper-hardhat-config"

async function main() {
  //   Staking Contract
  const bamaMigration = await ethers.deployContract("MigrationII", [
    `${process.env.STAGING_BAMA_TOKEN}`,
  ])
  await bamaMigration.waitForDeployment()
  await bamaMigration.deploymentTransaction()?.wait(5)
  console.log(`Deployed Bama Migration II to ${bamaMigration.target}`)
  console.log(`_____________________________________`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //await verify(`${process.env.STAGING_BAMA_TOKEN}`, [])
    await verify(`${bamaMigration.target}`, [
      `${process.env.STAGING_BAMA_TOKEN}`,
    ])
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
