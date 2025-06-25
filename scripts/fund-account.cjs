const { ethers } = require("hardhat");

async function main() {
  // Get the first account (pre-funded)
  const [funder] = await ethers.getSigners();
  
  // Your MetaMask account address (replace with your actual address)
  const YOUR_ADDRESS = "0xYourMetaMaskAddressHere"; // Replace this!
  
  console.log("Funding account:", YOUR_ADDRESS);
  console.log("From funder:", funder.address);
  
  // Send 100 ETH to your account
  const tx = await funder.sendTransaction({
    to: YOUR_ADDRESS,
    value: ethers.parseEther("100.0") // 100 ETH
  });
  
  await tx.wait();
  console.log("✅ Sent 100 ETH to", YOUR_ADDRESS);
  console.log("Transaction hash:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
