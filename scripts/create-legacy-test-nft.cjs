const { ethers } = require("hardhat");

async function main() {
  // Get the deployed contract
  const DreamMint = await ethers.getContractFactory("DreamMint");
  
  // Use the address from the deployed contract
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with actual deployed address
  const contract = DreamMint.attach(contractAddress);
  
  console.log("Attempting to create a test NFT with a legacy IPFS hash...");
  
  // Get the first signer (deployer)
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);
  
  // Create a fake IPFS hash that represents a legacy NFT (before Pinata integration)
  const legacyIpfsHash = "QmLegacyTestHash123456789abcdef";
  const tokenURI = `ipfs://${legacyIpfsHash}`;
  
  try {
    // Mint a test NFT with the legacy IPFS hash
    const tx = await contract.mintDream(signer.address, tokenURI);
    await tx.wait();
    
    console.log("✅ Test legacy NFT minted successfully!");
    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Token URI: ${tokenURI}`);
    console.log("This NFT should trigger the legacy fallback flow when viewed in the DApp.");
    
  } catch (error) {
    console.error("❌ Failed to mint test NFT:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
