const { ethers } = require("hardhat");

async function main() {
  console.log("Checking minted NFT...");
  
  const contractAddress = "0x1b0b5e6c2787C11747dC0e90BD76028674b7209B";
  const DreamMint = await ethers.getContractFactory("DreamMint");
  const contract = DreamMint.attach(contractAddress);
  
  try {
    // Check token 0 (first minted token)
    const tokenId = 0;
    
    // Get token owner
    const owner = await contract.ownerOf(tokenId);
    console.log(`Token #${tokenId} owner:`, owner);
    
    // Get token URI
    const tokenURI = await contract.tokenURI(tokenId);
    console.log(`Token #${tokenId} URI:`, tokenURI);
    
    // If it's an IPFS URI, let's also check the metadata
    if (tokenURI.startsWith('ipfs://')) {
      const ipfsHash = tokenURI.replace('ipfs://', '');
      const gatewayUrl = `https://nftstorage.link/ipfs/${ipfsHash}`;
      console.log(`Gateway URL:`, gatewayUrl);
    }
    
  } catch (error) {
    console.error("Error checking NFT:", error.message);
  }
}

main().catch(console.error);
