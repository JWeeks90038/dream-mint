#!/bin/bash

# Solana account management script for DreamMint
# This script helps manage Solana accounts and keys

echo "🔑 DreamMint Solana Account Manager"

case "$1" in
    "create")
        echo "🆕 Creating new Solana keypair..."
        solana-keygen new --outfile ~/.config/solana/dreammint-keypair.json
        echo "✅ New keypair created at ~/.config/solana/dreammint-keypair.json"
        echo "🔄 Setting as default keypair..."
        solana config set --keypair ~/.config/solana/dreammint-keypair.json
        ;;
    
    "balance")
        echo "💰 Checking wallet balance..."
        PUBKEY=$(solana address)
        BALANCE=$(solana balance)
        echo "📍 Public Key: $PUBKEY"
        echo "💰 Balance: $BALANCE"
        ;;
    
    "airdrop")
        NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
        if [[ "$NETWORK" == *"devnet"* ]]; then
            echo "💰 Requesting devnet airdrop..."
            solana airdrop 5
        elif [[ "$NETWORK" == *"localhost"* ]]; then
            echo "💰 Requesting localhost airdrop..."
            solana airdrop 10
        else
            echo "❌ Airdrops only available on devnet and localhost"
        fi
        ;;
    
    "info")
        echo "📋 Solana Configuration:"
        solana config get
        echo ""
        echo "💰 Wallet Balance:"
        solana balance
        echo ""
        echo "📍 Public Key:"
        solana address
        ;;
    
    "switch-devnet")
        echo "🧪 Switching to Solana Devnet..."
        solana config set --url https://api.devnet.solana.com
        echo "✅ Switched to devnet"
        ;;
    
    "switch-mainnet")
        echo "🌐 Switching to Solana Mainnet..."
        solana config set --url https://api.mainnet-beta.solana.com
        echo "✅ Switched to mainnet"
        ;;
    
    "switch-localhost")
        echo "🏠 Switching to localhost..."
        solana config set --url http://localhost:8899
        echo "✅ Switched to localhost"
        ;;
    
    *)
        echo "Usage: $0 {create|balance|airdrop|info|switch-devnet|switch-mainnet|switch-localhost}"
        echo ""
        echo "Commands:"
        echo "  create          - Create a new Solana keypair"
        echo "  balance         - Check wallet balance"
        echo "  airdrop         - Request SOL airdrop (devnet/localhost only)"
        echo "  info            - Show wallet and network info"
        echo "  switch-devnet   - Switch to Solana devnet"
        echo "  switch-mainnet  - Switch to Solana mainnet"
        echo "  switch-localhost - Switch to localhost"
        exit 1
        ;;
esac
