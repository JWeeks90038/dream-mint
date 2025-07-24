#!/bin/bash

# Solana test script for DreamMint
# This script runs tests for the Anchor program

echo "🧪 Starting DreamMint Solana tests..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first:"
    echo "   npm install -g @coral-xyz/anchor-cli"
    exit 1
fi

# Set to test validator
echo "🏠 Setting up local test validator..."
solana config set --url http://localhost:8899

# Check if test validator is running
if ! solana cluster-version &> /dev/null; then
    echo "🚀 Starting Solana test validator..."
    solana-test-validator --reset &
    VALIDATOR_PID=$!
    
    # Wait for validator to start
    echo "⏳ Waiting for validator to start..."
    sleep 10
    
    # Cleanup function
    cleanup() {
        echo "🛑 Stopping test validator..."
        kill $VALIDATOR_PID 2>/dev/null
        exit
    }
    
    # Set trap to cleanup on exit
    trap cleanup EXIT INT TERM
fi

# Airdrop SOL for testing
echo "💰 Requesting SOL airdrop for testing..."
solana airdrop 10

# Build the program
echo "🔨 Building program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Run tests
echo "🧪 Running Anchor tests..."
anchor test --skip-local-validator

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
    exit 1
fi

echo "🎉 DreamMint tests complete!"
