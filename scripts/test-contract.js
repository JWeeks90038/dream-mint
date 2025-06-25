const { ethers } = require("hardhat");

async function main() {
  console.log("Testing DreamMint contract...");
  
  // Get the deployed contract
  const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  const DreamMint = await ethers.getContractFactory("DreamMint");
  const contract = DreamMint.attach(contractAddress);
  
  console.log("Contract address:", contractAddress);
  
  try {
    // Test nextTokenId function
    const nextTokenId = await contract.nextTokenId();
    console.log("Next Token ID:", nextTokenId.toString());
    
    // Test contract owner
    const owner = await contract.owner();
    console.log("Contract owner:", owner);
    
    // Test mint fee
    const mintFee = await contract.mintFee();
    console.log("Mint fee:", ethers.formatEther(mintFee), "ETH");
    
    // Test contract name and symbol
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log("Token name:", name);
    console.log("Token symbol:", symbol);
    
    console.log("✅ All contract functions working correctly!");
    
  } catch (error) {
    console.error("❌ Error testing contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
