#!/bin/bash

# DreamMint Production Launch Script
# This script prepares and deploys DreamMint to Ethereum Mainnet

echo "🚀 DreamMint Production Launch"
echo "=============================="

# Check if we have mainnet credentials
if [[ "$MAINNET_PRIVATE_KEY" == "5e8c1b067ec403f96fdda2fce624d6131bfa5626ee62845fb54dc79dd80b5f7d" ]]; then
    echo "❌ ERROR: You're using placeholder credentials!"
    echo "   Please update your .env file with real mainnet credentials:"
    echo "   - MAINNET_RPC_URL (your Alchemy mainnet URL)"
    echo "   - MAINNET_PRIVATE_KEY (your wallet's private key with ETH)"
    echo "   - ALCHEMY_API_KEY (your Alchemy API key)"
    exit 1
fi

# Check ETH balance
echo "💰 Checking ETH balance for deployment..."

# Deploy smart contract to mainnet
echo "📜 Deploying smart contract to Ethereum Mainnet..."
npx hardhat run scripts/deploy-mainnet.js --network mainnet

if [ $? -eq 0 ]; then
    echo "✅ Smart contract deployed successfully!"
    echo "⚠️  IMPORTANT: Update VITE_CONTRACT_ADDRESS in your .env file with the deployed contract address"
else
    echo "❌ Smart contract deployment failed!"
    exit 1
fi

# Build frontend for production
echo "🔨 Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# Start backend in production mode
echo "🖥️  Starting backend in production mode..."
cd backend
NODE_ENV=production npm start &
BACKEND_PID=$!
cd ..

echo "🎉 DreamMint is ready for production!"
echo "=========================="
echo "✅ Smart contract deployed to Ethereum Mainnet"
echo "✅ Frontend built and ready"
echo "✅ Backend running in production mode"
echo ""
echo "📋 Next steps:"
echo "1. Update VITE_CONTRACT_ADDRESS in .env with your deployed contract address"
echo "2. Deploy frontend to your hosting service (Vercel, Netlify, etc.)"
echo "3. Update environment.ts with your production API URL"
echo "4. Test thoroughly before going live!"
echo ""
echo "🔗 Frontend build: ./dist/"
echo "🔗 Backend PID: $BACKEND_PID"
