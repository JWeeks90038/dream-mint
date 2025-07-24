#!/bin/bash

# DreamMint Minimal Cost Deployment Script
# This script deploys with the absolute minimum SOL requirements

echo "🚀 DreamMint Minimal Cost Deployment"
echo "=================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default to devnet for cost savings
NETWORK="devnet"
RPC_URL="https://api.devnet.solana.com"

if [ "$1" = "mainnet" ]; then
    NETWORK="mainnet-beta"
    RPC_URL="https://api.mainnet-beta.solana.com"
    echo -e "${YELLOW}⚠️  WARNING: Deploying to MAINNET${NC}"
    echo "This will cost real SOL. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

echo -e "${GREEN}✅ Using $NETWORK${NC}"
solana config set --url $RPC_URL

# Function to check and request minimum balance
check_balance() {
    local required_sol=$1
    local required_lamports=$(echo "$required_sol * 1000000000" | bc)
    local current_lamports=$(solana balance --lamports | grep -o '[0-9]*')
    local current_sol=$(echo "scale=6; $current_lamports / 1000000000" | bc)
    
    echo "Current balance: $current_sol SOL"
    echo "Required: $required_sol SOL"
    
    if [ $current_lamports -lt $required_lamports ]; then
        echo -e "${RED}❌ Insufficient balance${NC}"
        
        if [ "$NETWORK" = "devnet" ]; then
            echo -e "${YELLOW}💰 Requesting devnet airdrop...${NC}"
            local airdrop_amount=$(echo "scale=0; ($required_sol - $current_sol + 0.5) / 1" | bc)
            solana airdrop $airdrop_amount
            sleep 3
            return 0
        else
            echo -e "${RED}Please fund your wallet with at least $required_sol SOL${NC}"
            return 1
        fi
    fi
    return 0
}

# Step 1: Check balance for deployment (minimum 2 SOL)
echo -e "\n${BLUE}📊 Checking balance for deployment...${NC}"
if ! check_balance 2; then
    exit 1
fi

# Step 2: Build optimized program
echo -e "\n${BLUE}🔨 Building minimal program...${NC}"
anchor build --arch sbf

# Step 3: Create program keypair if needed
PROGRAM_KEYPAIR="target/deploy/dream_mint-keypair.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo -e "${BLUE}🔑 Creating program keypair...${NC}"
    solana-keygen new --outfile $PROGRAM_KEYPAIR --no-bip39-passphrase
fi

PROGRAM_ID=$(solana-keygen pubkey $PROGRAM_KEYPAIR)
echo "Program ID: $PROGRAM_ID"

# Step 4: Update program ID in source
echo -e "\n${BLUE}📝 Updating program ID...${NC}"
sed -i.bak "s/DreamMintMainnetProgramIdHere/$PROGRAM_ID/" programs/dream-mint/src/lib.rs

# Step 5: Rebuild with correct ID
echo -e "\n${BLUE}🔨 Rebuilding...${NC}"
anchor build --arch sbf

# Step 6: Get exact deployment cost
PROGRAM_SIZE=$(stat -c%s target/deploy/dream_mint.so 2>/dev/null || stat -f%z target/deploy/dream_mint.so)
EXACT_COST_LAMPORTS=$(echo "scale=0; $PROGRAM_SIZE * 10" | bc)
EXACT_COST_SOL=$(echo "scale=6; $EXACT_COST_LAMPORTS / 1000000000" | bc)

echo "Program size: $PROGRAM_SIZE bytes"
echo "Exact deployment cost: $EXACT_COST_SOL SOL"

# Step 7: Deploy with exact cost
echo -e "\n${BLUE}🚀 Deploying program...${NC}"
DEPLOY_OUTPUT=$(solana program deploy target/deploy/dream_mint.so --program-id $PROGRAM_KEYPAIR --upgrade-authority $(solana-keygen pubkey ~/.config/solana/id.json) 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Program deployed successfully!${NC}"
    echo "$DEPLOY_OUTPUT"
    
    # Step 8: Initialize with minimal cost
    echo -e "\n${BLUE}🔧 Initializing program...${NC}"
    
    # Create a minimal initialize script
    cat > temp_initialize.js << EOF
const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

async function initialize() {
    const connection = new Connection('$RPC_URL');
    const wallet = anchor.Wallet.local();
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    
    // Load the program
    const program = new anchor.Program(require('./target/idl/dream_mint.json'), '$PROGRAM_ID', provider);
    
    // Initialize
    const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority')],
        program.programId
    );
    
    try {
        const tx = await program.methods.initialize()
            .accounts({
                mintAuthority: mintAuthorityPDA,
                authority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('✅ Program initialized. Transaction:', tx);
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
}

initialize().catch(console.error);
EOF

    node temp_initialize.js
    INIT_RESULT=$?
    
    # Clean up
    rm -f temp_initialize.js
    
    if [ $INIT_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Program initialized successfully!${NC}"
        
        # Calculate final costs
        FINAL_BALANCE=$(solana balance --lamports | grep -o '[0-9]*')
        FINAL_SOL=$(echo "scale=6; $FINAL_BALANCE / 1000000000" | bc)
        
        echo -e "\n${GREEN}💰 Final Cost Summary:${NC}"
        echo "Program ID: $PROGRAM_ID"
        echo "Network: $NETWORK"
        echo "Final balance: $FINAL_SOL SOL"
        echo "Deployment successful!"
        
        # Update .env file
        if [ -f ".env" ]; then
            sed -i.bak "s/DreamMintMainnetProgramIdHere/$PROGRAM_ID/" .env
            echo "Updated .env with Program ID"
        fi
        
        echo -e "\n${GREEN}🎉 Minimal deployment complete!${NC}"
        echo "Ready to mint NFTs with minimal costs!"
        
    else
        echo -e "${RED}❌ Initialization failed${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Clean up backup files
rm -f programs/dream-mint/src/lib.rs.bak
rm -f .env.bak

echo -e "\n${GREEN}🏁 Minimal deployment completed!${NC}"
