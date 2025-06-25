#!/bin/bash

# DreamMint Mainnet Setup Script

echo "🔧 DreamMint Mainnet Configuration Setup"
echo "======================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "📄 Found existing .env file"
fi

echo ""
echo "🔑 Required Configuration for Mainnet Deployment:"
echo ""

# Check for required environment variables
missing_vars=()

echo "1. Alchemy API Key:"
if grep -q "your-alchemy-api-key-here" .env; then
    echo "   ❌ ALCHEMY_API_KEY not configured"
    echo "   📝 Get one from: https://www.alchemy.com/"
    missing_vars+=("ALCHEMY_API_KEY")
else
    echo "   ✅ ALCHEMY_API_KEY configured"
fi

echo ""
echo "2. Mainnet Private Key:"
if grep -q "your-production-wallet-private-key-here" .env; then
    echo "   ❌ MAINNET_PRIVATE_KEY not configured"
    echo "   🔐 Use a secure wallet with sufficient ETH"
    echo "   ⚠️  NEVER use your main wallet's private key"
    missing_vars+=("MAINNET_PRIVATE_KEY")
else
    echo "   ✅ MAINNET_PRIVATE_KEY configured"
fi

echo ""
echo "3. Etherscan API Key (for verification):"
if grep -q "your-etherscan-api-key-here" .env; then
    echo "   ❌ ETHERSCAN_API_KEY not configured"
    echo "   📝 Get one from: https://etherscan.io/apis"
    missing_vars+=("ETHERSCAN_API_KEY")
else
    echo "   ✅ ETHERSCAN_API_KEY configured"
fi

echo ""
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required variables configured!"
    echo ""
    echo "🚀 Ready to deploy to mainnet:"
    echo "   npx hardhat run scripts/deploy-mainnet.js --network mainnet"
    echo ""
    echo "⚠️  IMPORTANT REMINDERS:"
    echo "   - Make sure you have enough ETH for gas fees (≥0.1 ETH recommended)"
    echo "   - Double-check your private key is for the correct wallet"
    echo "   - Test your contract thoroughly on testnets first"
    echo "   - Deployment to mainnet costs real money and is irreversible"
else
    echo "❌ Missing required configuration:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Please edit .env file to add the missing values"
    echo "   Then run this script again to verify"
fi

echo ""
echo "💡 Additional Setup Options:"
echo ""
echo "📊 Test your configuration:"
echo "   npx hardhat compile"
echo "   npx hardhat test"
echo ""
echo "🧪 Deploy to testnet first:"
echo "   npx hardhat run scripts/deploy.js --network sepolia"
echo ""
echo "📋 Check available networks:"
echo "   npx hardhat help"
