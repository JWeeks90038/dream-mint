const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  const DreamMint = await ethers.getContractFactory("DreamMint");
  const contract = await DreamMint.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("DreamMint deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
