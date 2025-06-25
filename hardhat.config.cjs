require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.20" },
      { version: "0.8.28" }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development network
    hardhat: {
      chainId: 31337
    },
    
    // Ethereum Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/Qqx1516DZh4pTYKmKVSXzGz9HR_h-k-g",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : ["5e8c1b067ec403f96fdda2fce624d6131bfa5626ee62845fb54dc79dd80b5f7d"],
      gasPrice: 20000000000, // 20 gwei
      confirmations: 2
    },
    
    // Ethereum Mainnet - PRODUCTION
    mainnet: {
      url: process.env.MAINNET_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
      gasPrice: "auto", // Use automatic gas pricing
      confirmations: 3, // Wait for 3 confirmations
      timeout: 300000, // 5 minutes timeout
    },
    
    // Polygon Amoy Testnet
    polygon_amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/9rsuk6b2gESSKuf1nGI36",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : ["5e8c1b067ec403f96fdda2fce624d6131bfa5626ee62845fb54dc79dd80b5f7d"],
      gasPrice: 20000000000
    },
    
    // Polygon Mainnet - Alternative production option
    polygon: {
      url: process.env.POLYGON_RPC_URL || `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
      gasPrice: "auto"
    }
  },
  
  // Gas reporting for optimization
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  
  // Etherscan verification
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonAmoy: process.env.POLYGONSCAN_API_KEY
    }
  }
};