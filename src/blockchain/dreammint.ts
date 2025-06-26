import { ethers } from "ethers";

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  1: process.env.VITE_CONTRACT_ADDRESS || "0xYourMainnetContractAddress", // Ethereum Mainnet
  11155111: "0x1b0b5e6c2787C11747dC0e90BD76028674b7209B", // Sepolia testnet (for testing)
};

// Get contract address for current network (Sepolia only)
export function getContractAddress(chainId: number): string {
  const address = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!address) {
    throw new Error(`DreamMint only supports Sepolia testnet (Chain ID: 11155111). Current network chain ID: ${chainId}`);
  }
  return address;
}

// DreamMint ABI - Complete interface
export const DREAMMINT_ABI = [
  // Constructor
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  
  // Events
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "tokenURI", "type": "string" } ], "name": "DreamMinted", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "newTokenId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "parent1", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "parent2", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "newTokenURI", "type": "string" } ], "name": "DreamRemixed", "type": "event" },
  
  // Public state variables (automatically generate getters)
  { "inputs": [], "name": "nextTokenId", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "mintFee", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  
  // Main functions
  { "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "string", "name": "tokenURI", "type": "string" } ], "name": "mintDream", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "payable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId1", "type": "uint256" }, { "internalType": "uint256", "name": "tokenId2", "type": "uint256" }, { "internalType": "string", "name": "newTokenURI", "type": "string" } ], "name": "remixDreams", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "payable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "_fee", "type": "uint256" } ], "name": "setMintFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  
  // ERC721 functions
  { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "ownerOf", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "tokenURI", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "getApproved", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" } ], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" } ], "name": "isApprovedForAll", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" } ], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

export async function getDreamMintContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  let provider: ethers.Provider;
  
  if ('provider' in signerOrProvider && signerOrProvider.provider) {
    // It's a Signer with a provider
    provider = signerOrProvider.provider;
  } else if ('getNetwork' in signerOrProvider) {
    // It's a Provider
    provider = signerOrProvider as ethers.Provider;
  } else {
    throw new Error("Provider is required");
  }
  
  const network = await provider.getNetwork();
  const contractAddress = getContractAddress(Number(network.chainId));
  
  console.log("Creating contract with address:", contractAddress, "on network:", network.chainId);
  return new ethers.Contract(contractAddress, DREAMMINT_ABI, signerOrProvider);
}

// Helper function to test contract connection
export async function testContractConnection(provider: ethers.Provider) {
  try {
    const network = await provider.getNetwork();
    const contractAddress = getContractAddress(Number(network.chainId));
    
    console.log("Testing contract connection on network:", network.chainId);
    console.log("Contract address:", contractAddress);
    
    // Check if contract exists by checking if there's code at the address
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.error("No contract found at address:", contractAddress);
      return false;
    }
    
    const contract = await getDreamMintContract(provider);
    // Try to call a simple view function to test the connection
    const nextTokenId = await contract.nextTokenId();
    console.log("Contract connection successful. Next token ID:", nextTokenId.toString());
    return true;
  } catch (error) {
    console.error("Contract connection failed:", error);
    return false;
  }
}
