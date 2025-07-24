#!/bin/bash

# DreamMint Ultra-Minimal Deployment Script
# Optimized for the lowest possible SOL usage

set -e

echo "🚀 DreamMint Ultra-Minimal Deployment"
echo "====================================="

# Get current SOL price for cost estimation
echo "📊 Fetching current SOL price..."
SOL_PRICE=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd" | grep -o '"usd":[^,]*' | grep -o '[0-9.]*')
echo "💰 Current SOL price: \$${SOL_PRICE}"

# Check for network argument
NETWORK=${1:-devnet}
if [ "$NETWORK" = "mainnet" ]; then
    CLUSTER="mainnet-beta"
    echo "⚠️  MAINNET DEPLOYMENT - This will cost real SOL!"
else
    CLUSTER="devnet"
    echo "✅ DEVNET DEPLOYMENT - This is FREE!"
fi

echo "🌐 Target network: $CLUSTER"

# Calculate deployment costs for mainnet
if [ "$NETWORK" = "mainnet" ]; then
    DEPLOY_COST_SOL="0.0025"
    DEPLOY_COST_USD=$(echo "$SOL_PRICE * $DEPLOY_COST_SOL" | bc -l)
    PER_NFT_COST_SOL="0.00919"
    PER_NFT_COST_USD=$(echo "$SOL_PRICE * $PER_NFT_COST_SOL" | bc -l)
    
    printf "💸 Deployment cost: %.4f SOL (\$%.2f)\n" $DEPLOY_COST_SOL $DEPLOY_COST_USD
    printf "💸 Per NFT cost: %.5f SOL (\$%.2f)\n" $PER_NFT_COST_SOL $PER_NFT_COST_USD
    
    # Calculate how many NFTs different SOL amounts can fund
    echo ""
    echo "🧮 Funding Calculator:"
    for sol_amount in 0.05 0.1 0.25 0.5 1.0; do
        nft_count=$(echo "($sol_amount - $DEPLOY_COST_SOL) / $PER_NFT_COST_SOL" | bc -l)
        nft_count_int=$(printf "%.0f" $nft_count)
        usd_amount=$(echo "$SOL_PRICE * $sol_amount" | bc -l)
        revenue_usd=$(echo "$nft_count_int * 3.98" | bc -l)
        
        if (( $(echo "$nft_count > 0" | bc -l) )); then
            printf "   %.2f SOL (\$%.2f) → %d NFTs → \$%.2f revenue\n" $sol_amount $usd_amount $nft_count_int $revenue_usd
        fi
    done
    
    echo ""
    read -p "⚡ Continue with mainnet deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Installing..."
    npm install -g @coral-xyz/anchor-cli
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.4/install)\""
    exit 1
fi

# Set up Solana configuration
echo "🔧 Configuring Solana CLI..."
solana config set --url "https://api.${CLUSTER}.solana.com"

# Check wallet balance for mainnet
if [ "$NETWORK" = "mainnet" ]; then
    echo "💳 Checking wallet balance..."
    BALANCE=$(solana balance --output json | jq -r '.lamports')
    BALANCE_SOL=$(echo "scale=9; $BALANCE / 1000000000" | bc -l)
    BALANCE_USD=$(echo "$SOL_PRICE * $BALANCE_SOL" | bc -l)
    
    printf "💰 Current balance: %.4f SOL (\$%.2f)\n" $BALANCE_SOL $BALANCE_USD
    
    # Check if balance is sufficient
    MIN_REQUIRED="0.01"  # Minimum 0.01 SOL for deployment + buffer
    if (( $(echo "$BALANCE_SOL < $MIN_REQUIRED" | bc -l) )); then
        echo "❌ Insufficient balance. Need at least $MIN_REQUIRED SOL for safe deployment."
        printf "   Please fund your wallet with at least \$%.2f\n" $(echo "$SOL_PRICE * $MIN_REQUIRED" | bc -l)
        exit 1
    fi
else
    echo "🎁 Getting devnet SOL from faucet..."
    solana airdrop 2 || echo "💡 Faucet might be rate-limited, but you should have enough SOL"
fi

# Build the program with maximum optimization
echo "🔨 Building program with maximum optimization..."
cd "$(dirname "$0")/.."

if [ ! -f "Anchor.toml" ]; then
    echo "❌ Anchor.toml not found. Run this script from the project root."
    exit 1
fi

# Clean and build
echo "🧹 Cleaning previous builds..."
anchor clean

echo "🔨 Building optimized program..."
anchor build --env CARGO_PROFILE_RELEASE_LTO=true

# Get program ID
PROGRAM_ID=$(anchor keys list | grep "dream_mint" | awk '{print $2}')
echo "🔑 Program ID: $PROGRAM_ID"

# Deploy with minimal costs
echo "🚀 Deploying program..."
if [ "$NETWORK" = "mainnet" ]; then
    # Use minimal deployment for mainnet
    anchor deploy --provider.cluster "$CLUSTER" --program-name dream_mint
else
    # Standard deployment for devnet
    anchor deploy --provider.cluster "$CLUSTER"
fi

# Update environment files
echo "📝 Updating environment configuration..."
ENV_FILE=".env"

if [ "$NETWORK" = "mainnet" ]; then
    # Update mainnet program ID
    if grep -q "VITE_SOLANA_PROGRAM_ID=" "$ENV_FILE"; then
        sed -i.bak "s/VITE_SOLANA_PROGRAM_ID=.*/VITE_SOLANA_PROGRAM_ID=$PROGRAM_ID/" "$ENV_FILE"
    else
        echo "VITE_SOLANA_PROGRAM_ID=$PROGRAM_ID" >> "$ENV_FILE"
    fi
    echo "✅ Updated mainnet Program ID in $ENV_FILE"
else
    # Update devnet program ID
    if grep -q "VITE_SOLANA_DEVNET_PROGRAM_ID=" "$ENV_FILE"; then
        sed -i.bak "s/VITE_SOLANA_DEVNET_PROGRAM_ID=.*/VITE_SOLANA_DEVNET_PROGRAM_ID=$PROGRAM_ID/" "$ENV_FILE"
    else
        echo "VITE_SOLANA_DEVNET_PROGRAM_ID=$PROGRAM_ID" >> "$ENV_FILE"
    fi
    echo "✅ Updated devnet Program ID in $ENV_FILE"
fi

# Final cost summary
echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo "🔑 Program ID: $PROGRAM_ID"
echo "🌐 Network: $CLUSTER"

if [ "$NETWORK" = "mainnet" ]; then
    # Get final balance
    FINAL_BALANCE=$(solana balance --output json | jq -r '.lamports')
    FINAL_BALANCE_SOL=$(echo "scale=9; $FINAL_BALANCE / 1000000000" | bc -l)
    USED_SOL=$(echo "$BALANCE_SOL - $FINAL_BALANCE_SOL" | bc -l)
    USED_USD=$(echo "$SOL_PRICE * $USED_SOL" | bc -l)
    
    printf "💸 Deployment cost: %.6f SOL (\$%.3f)\n" $USED_SOL $USED_USD
    printf "💰 Remaining balance: %.4f SOL (\$%.2f)\n" $FINAL_BALANCE_SOL $(echo "$SOL_PRICE * $FINAL_BALANCE_SOL" | bc -l)
    
    # Calculate remaining NFT capacity
    REMAINING_NFTS=$(echo "$FINAL_BALANCE_SOL / $PER_NFT_COST_SOL" | bc -l)
    REMAINING_NFTS_INT=$(printf "%.0f" $REMAINING_NFTS)
    echo "🎨 You can mint approximately $REMAINING_NFTS_INT NFTs with remaining balance"
    
    echo ""
    echo "💡 Next steps:"
    echo "1. Update your frontend to use the new Program ID"
    echo "2. Test minting with a small batch first"
    echo "3. Monitor costs and adjust as needed"
else
    echo "💰 Total cost: FREE (devnet)"
    echo ""
    echo "💡 Next steps:"
    echo "1. Test all functionality on devnet"
    echo "2. When ready, run: ./scripts/deploy-ultra-minimal.sh mainnet"
    echo "3. Fund your wallet before mainnet deployment"
fi

echo ""
echo "🔗 Useful commands:"
echo "   solana balance                    # Check your balance"
echo "   ./scripts/calculate-costs.sh      # Calculate current costs"
echo "   anchor test                       # Run tests"

echo ""
echo "✅ Ultra-minimal deployment complete!"
