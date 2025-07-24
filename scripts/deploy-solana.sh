#!/bin/bash

# Solana deployment script for DreamMint
# This script builds and deploys the Anchor program to Solana

echo "🚀 Starting DreamMint Solana deployment..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first:"
    echo "   npm install -g @coral-xyz/anchor-cli"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install Solana CLI first"
    exit 1
fi

# Set Solana network
if [ "$1" = "mainnet" ]; then
    echo "🌐 Deploying to Solana Mainnet..."
    solana config set --url https://api.mainnet-beta.solana.com
    NETWORK="mainnet-beta"
elif [ "$1" = "devnet" ]; then
    echo "🧪 Deploying to Solana Devnet..."
    solana config set --url https://api.devnet.solana.com
    NETWORK="devnet"
else
    echo "🏠 Deploying to localhost..."
    solana config set --url http://localhost:8899
    NETWORK="localnet"
fi

# Show current Solana config
echo "📋 Current Solana configuration:"
solana config get

# Check wallet balance
BALANCE=$(solana balance | grep -oE '[0-9]+\.[0-9]+')
echo "💰 Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Warning: Low SOL balance. You may need more SOL for deployment."
    if [ "$NETWORK" = "devnet" ]; then
        echo "💰 Requesting devnet airdrop..."
        solana airdrop 2
    fi
fi

# Build the Anchor program
echo "🔨 Building Anchor program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Get program ID
PROGRAM_ID=$(anchor keys list | grep "dream_mint" | awk '{print $2}')
echo "📝 Program ID: $PROGRAM_ID"

# Deploy the program
echo "🚀 Deploying program to $NETWORK..."
anchor deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Deployment successful!"
echo "🆔 Program ID: $PROGRAM_ID"
echo "🌐 Network: $NETWORK"
echo "🔗 Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=$NETWORK"

# Update environment file
if [ -f "../.env" ]; then
    echo "📝 Updating .env file..."
    
    # Remove old program ID if exists
    sed -i.bak '/SOLANA_PROGRAM_ID/d' ../.env
    
    # Add new program ID
    echo "SOLANA_PROGRAM_ID=$PROGRAM_ID" >> ../.env
    
    echo "✅ .env file updated with new Program ID"
fi

echo "🎉 DreamMint deployment complete!"
