import hre from "hardhat";
import "dotenv/config";

const { ethers } = hre;

async function main() {
  console.log("🚀 DreamMint Mainnet Deployment");
  console.log("=============================");
  
  // Safety checks
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 1n) {
    console.error("❌ This script is for Ethereum Mainnet only (Chain ID: 1)");
    console.error(`   Current network Chain ID: ${network.chainId}`);
    process.exit(1);
  }
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying from account: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`💰 Account balance: ${balanceEth} ETH`);
  
  if (parseFloat(balanceEth) < 0.1) {
    console.error("❌ Insufficient ETH balance for deployment");
    console.error("   Minimum recommended: 0.1 ETH");
    process.exit(1);
  }
  
  // Estimate gas costs
  const DreamMint = await ethers.getContractFactory("DreamMint");
  const deployTransaction = DreamMint.getDeployTransaction();
  const estimatedGas = await ethers.provider.estimateGas(deployTransaction);
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  
  const estimatedCost = estimatedGas * gasPrice;
  const estimatedCostEth = ethers.formatEther(estimatedCost);
  
  console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
  console.log(`💸 Estimated gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`💰 Estimated deployment cost: ${estimatedCostEth} ETH`);
  
  // Confirm deployment
  console.log("\n🔴 MAINNET DEPLOYMENT WARNING:");
  console.log("   - This will deploy to Ethereum Mainnet");
  console.log("   - Real ETH will be spent on gas fees");
  console.log("   - The contract will be permanently deployed");
  console.log("   - Make sure you've tested thoroughly on testnets");
  
  // In a real deployment, you'd want manual confirmation
  // For now, we'll add a timeout to allow cancellation
  console.log("\n⏰ Starting deployment in 10 seconds...");
  console.log("   Press Ctrl+C to cancel");
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log("\n🚀 Deploying DreamMint contract...");
  
  try {
    const dreamMint = await DreamMint.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await dreamMint.waitForDeployment();
    
    const contractAddress = await dreamMint.getAddress();
    
    console.log("\n✅ Contract deployed successfully!");
    console.log(`📄 Contract address: ${contractAddress}`);
    console.log(`🔍 Etherscan: https://etherscan.io/address/${contractAddress}`);
    console.log(`📊 Transaction: https://etherscan.io/tx/${dreamMint.deploymentTransaction().hash}`);
    
    // Wait for a few confirmations
    console.log("\n⏳ Waiting for confirmations...");
    const receipt = await dreamMint.deploymentTransaction().wait(3);
    console.log(`✅ Confirmed with ${receipt.confirmations} confirmations`);
    
    // Update configuration files
    console.log("\n📝 Next steps:");
    console.log(`1. Update src/config/environment.ts with contract address: ${contractAddress}`);
    console.log(`2. Verify contract on Etherscan: npx hardhat verify --network mainnet ${contractAddress}`);
    console.log(`3. Update your frontend to use mainnet configuration`);
    
    // Save deployment info
    const deploymentInfo = {
      network: "mainnet",
      contractAddress: contractAddress,
      deployer: deployer.address,
      deploymentHash: dreamMint.deploymentTransaction().hash,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: gasPrice.toString(),
      timestamp: new Date().toISOString()
    };
    
    console.log("\n📊 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Mainnet deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment error:", error);
    process.exit(1);
  });
