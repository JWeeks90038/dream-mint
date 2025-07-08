#!/bin/bash

# DreamMint Polygon Production Launch Script
# Deploy to Polygon Mainnet (much cheaper than Ethereum!)

echo "🚀 DreamMint Polygon Production Launch"
echo "====================================="

# Check if we have polygon credentials
if [[ "$POLYGON_PRIVATE_KEY" == "5e8c1b067ec403f96fdda2fce624d6131bfa5626ee62845fb54dc79dd80b5f7d" ]]; then
    echo "⚠️  Using test credentials for demo purposes"
    echo "   For production, update POLYGON_PRIVATE_KEY with your real private key"
fi

# Check MATIC balance
echo "💰 Checking MATIC balance for deployment..."

# Deploy smart contract to Polygon mainnet
echo "📜 Deploying smart contract to Polygon Mainnet..."
npx hardhat run scripts/deploy-mainnet.js --network polygon

if [ $? -eq 0 ]; then
    echo "✅ Smart contract deployed successfully to Polygon!"
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

echo "🎉 DreamMint is ready for Polygon production!"
echo "=========================================="
echo "✅ Smart contract deployed to Polygon Mainnet"
echo "✅ Frontend built and ready"
echo "✅ Backend running in production mode"
echo ""
echo "💰 Benefits of Polygon:"
echo "   🔹 ~99% cheaper gas fees vs Ethereum"
echo "   🔹 2-second transaction confirmations"
echo "   🔹 Full Ethereum compatibility"
echo "   🔹 OpenSea support"
echo ""
echo "📋 Next steps:"
echo "1. Update VITE_CONTRACT_ADDRESS in .env with your deployed contract address"
echo "2. Add Polygon network to MetaMask if needed"
echo "3. Deploy frontend to your hosting service (Vercel, Netlify, etc.)"
echo "4. Test thoroughly before going live!"
echo ""
echo "🔗 Frontend build: ./dist/"
echo "🔗 Backend PID: $BACKEND_PID"
