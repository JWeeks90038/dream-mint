#!/bin/bash

# DreamMint Solana Program Cost-Optimized Deployment Script
# This script deploys the program with minimal SOL requirements

echo "🚀 Starting DreamMint Solana Program Deployment (Cost-Optimized)"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're on devnet or mainnet
if [ "$1" = "mainnet" ]; then
    NETWORK="mainnet-beta"
    RPC_URL="https://api.mainnet-beta.solana.com"
    echo -e "${YELLOW}⚠️  WARNING: Deploying to MAINNET${NC}"
else
    NETWORK="devnet"
    RPC_URL="https://api.devnet.solana.com"
    echo -e "${GREEN}✅ Deploying to DEVNET${NC}"
fi

# Set the network configuration
echo "Setting Solana CLI to $NETWORK..."
solana config set --url $RPC_URL

# Check current balance
echo -e "\n${BLUE}📊 Checking account balance...${NC}"
CURRENT_BALANCE=$(solana balance --lamports | grep -o '[0-9]*')
CURRENT_SOL=$(echo "scale=6; $CURRENT_BALANCE / 1000000000" | bc)
echo "Current balance: $CURRENT_SOL SOL ($CURRENT_BALANCE lamports)"

# Calculate minimum required balance for deployment
# Program deployment: ~2.5 SOL (varies by program size)
# Initialize instruction: ~0.002 SOL
# Buffer: 0.5 SOL for safety
MIN_REQUIRED_LAMPORTS=3000000000  # 3 SOL in lamports
MIN_REQUIRED_SOL=3.0

if [ $CURRENT_BALANCE -lt $MIN_REQUIRED_LAMPORTS ]; then
    echo -e "${RED}❌ Insufficient balance for deployment${NC}"
    echo "Required: $MIN_REQUIRED_SOL SOL"
    echo "Current: $CURRENT_SOL SOL"
    echo "Shortfall: $(echo "scale=6; $MIN_REQUIRED_SOL - $CURRENT_SOL" | bc) SOL"
    
    if [ "$NETWORK" = "devnet" ]; then
        echo -e "${YELLOW}💰 Requesting devnet airdrop...${NC}"
        solana airdrop 3
        echo "Waiting for airdrop confirmation..."
        sleep 5
    else
        echo -e "${RED}Please fund your wallet with at least $MIN_REQUIRED_SOL SOL${NC}"
        exit 1
    fi
fi

# Build the program with size optimization
echo -e "\n${BLUE}🔨 Building optimized program...${NC}"
anchor build --arch sbf

# Get program size
PROGRAM_SIZE=$(stat -c%s target/deploy/dream_mint.so)
echo "Program size: $PROGRAM_SIZE bytes"

# Calculate deployment cost based on program size
DEPLOYMENT_COST_LAMPORTS=$(echo "scale=0; $PROGRAM_SIZE * 10" | bc)
DEPLOYMENT_COST_SOL=$(echo "scale=6; $DEPLOYMENT_COST_LAMPORTS / 1000000000" | bc)

echo "Estimated deployment cost: $DEPLOYMENT_COST_SOL SOL"

# Create a new program keypair for cost optimization
echo -e "\n${BLUE}🔑 Creating optimized program keypair...${NC}"
PROGRAM_KEYPAIR="target/deploy/dream_mint-keypair.json"

if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    solana-keygen new --outfile $PROGRAM_KEYPAIR --no-bip39-passphrase
fi

PROGRAM_ID=$(solana-keygen pubkey $PROGRAM_KEYPAIR)
echo "Program ID: $PROGRAM_ID"

# Update the program ID in the source code
echo -e "\n${BLUE}📝 Updating program ID in source...${NC}"
sed -i.bak "s/DreamMintMainnetProgramIdHere/$PROGRAM_ID/" programs/dream-mint/src/lib.rs

# Rebuild with the correct program ID
echo -e "\n${BLUE}🔨 Rebuilding with correct program ID...${NC}"
anchor build --arch sbf

# Deploy the program
echo -e "\n${BLUE}🚀 Deploying program...${NC}"
solana program deploy target/deploy/dream_mint.so --program-id $PROGRAM_KEYPAIR --upgrade-authority $(solana-keygen pubkey ~/.config/solana/id.json)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Program deployed successfully!${NC}"
    echo "Program ID: $PROGRAM_ID"
    
    # Initialize the program
    echo -e "\n${BLUE}🔧 Initializing program...${NC}"
    anchor run initialize --provider.cluster $NETWORK
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Program initialized successfully!${NC}"
        
        # Get final balance
        FINAL_BALANCE=$(solana balance --lamports | grep -o '[0-9]*')
        FINAL_SOL=$(echo "scale=6; $FINAL_BALANCE / 1000000000" | bc)
        COST_SOL=$(echo "scale=6; ($CURRENT_BALANCE - $FINAL_BALANCE) / 1000000000" | bc)
        
        echo -e "\n${GREEN}💰 Deployment Cost Summary:${NC}"
        echo "Initial balance: $CURRENT_SOL SOL"
        echo "Final balance: $FINAL_SOL SOL"
        echo "Total cost: $COST_SOL SOL"
        
        # Update environment file
        echo -e "\n${BLUE}📄 Updating environment configuration...${NC}"
        if [ -f ".env" ]; then
            # Replace the placeholder program ID
            sed -i.bak "s/DreamMintMainnetProgramIdHere/$PROGRAM_ID/" .env
            echo "Updated .env with Program ID: $PROGRAM_ID"
        fi
        
        echo -e "\n${GREEN}🎉 DreamMint deployment complete!${NC}"
        echo "Program ID: $PROGRAM_ID"
        echo "Network: $NETWORK"
        echo "Total deployment cost: $COST_SOL SOL"
        echo "Ready to mint NFTs!"
        
    else
        echo -e "${RED}❌ Program initialization failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Program deployment failed${NC}"
    exit 1
fi

# Clean up backup files
rm -f programs/dream-mint/src/lib.rs.bak
rm -f .env.bak

echo -e "\n${GREEN}🏁 Deployment script completed successfully!${NC}"
