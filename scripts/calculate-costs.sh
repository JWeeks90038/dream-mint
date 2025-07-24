#!/bin/bash

# DreamMint Deployment Cost Calculator
# Calculate exact costs before deployment

echo "🧮 DreamMint Deployment Cost Calculator"
echo "======================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get current SOL price in USD
get_sol_price() {
    local price=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd" | grep -o '"usd":[0-9.]*' | cut -d':' -f2)
    echo $price
}

# Calculate costs
calculate_costs() {
    local network=$1
    local sol_price=$2
    
    echo -e "\n${BLUE}📊 Cost Analysis for $network${NC}"
    echo "SOL Price: \$${sol_price}"
    echo "================================"
    
    if [ "$network" = "devnet" ]; then
        echo -e "${GREEN}✅ DEVNET - All costs are FREE (using faucet)${NC}"
        echo "- Program deployment: FREE"
        echo "- Program initialization: FREE"
        echo "- Testing NFT mints: FREE"
        echo "- Total cost: \$0.00"
        return
    fi
    
    # Mainnet costs
    echo -e "${YELLOW}💰 MAINNET Costs:${NC}"
    
    # Program deployment cost (varies by program size)
    local program_size=50000  # Estimated program size in bytes
    local deployment_cost_lamports=$(echo "scale=0; $program_size * 10" | bc)
    local deployment_cost_sol=$(echo "scale=6; $deployment_cost_lamports / 1000000000" | bc)
    local deployment_cost_usd=$(echo "scale=2; $deployment_cost_sol * $sol_price" | bc)
    
    echo "1. Program Deployment:"
    echo "   - Program size: ~$program_size bytes"
    echo "   - Cost: $deployment_cost_sol SOL (\$${deployment_cost_usd})"
    
    # Program initialization cost
    local init_cost_sol=0.002
    local init_cost_usd=$(echo "scale=2; $init_cost_sol * $sol_price" | bc)
    
    echo "2. Program Initialization:"
    echo "   - Cost: $init_cost_sol SOL (\$${init_cost_usd})"
    
    # Per-NFT minting costs
    local mint_account_cost=0.00144288
    local token_account_cost=0.00204428
    local metadata_account_cost=0.0056
    local tx_fee_cost=0.0001
    local per_nft_cost=$(echo "scale=8; $mint_account_cost + $token_account_cost + $metadata_account_cost + $tx_fee_cost" | bc)
    local per_nft_usd=$(echo "scale=2; $per_nft_cost * $sol_price" | bc)
    
    echo "3. Per-NFT Minting Costs:"
    echo "   - Mint account: $mint_account_cost SOL"
    echo "   - Token account: $token_account_cost SOL"
    echo "   - Metadata account: $metadata_account_cost SOL"
    echo "   - Transaction fee: $tx_fee_cost SOL"
    echo "   - Total per NFT: $per_nft_cost SOL (\$${per_nft_usd})"
    
    # Total initial deployment cost
    local total_deployment=$(echo "scale=6; $deployment_cost_sol + $init_cost_sol" | bc)
    local total_deployment_usd=$(echo "scale=2; $total_deployment * $sol_price" | bc)
    
    echo "4. Total Initial Deployment:"
    echo "   - Cost: $total_deployment SOL (\$${total_deployment_usd})"
    
    # Recommended funding
    local recommended_sol=10
    local recommended_usd=$(echo "scale=2; $recommended_sol * $sol_price" | bc)
    
    echo "5. Recommended Funding:"
    echo "   - Amount: $recommended_sol SOL (\$${recommended_usd})"
    echo "   - Covers: Deployment + ~$(echo "scale=0; (10 - $total_deployment) / $per_nft_cost" | bc) NFT mints"
    
    # Break-even analysis - Updated for new pricing
    local mint_fee_sol=0.0262  # Updated total SOL fee ($3.98)
    local net_cost_per_nft=$(echo "scale=8; $per_nft_cost - $mint_fee_sol" | bc)
    local break_even_secondary_sales=$(echo "scale=4; $net_cost_per_nft / 0.05" | bc)  # 5% royalty
    
    echo "6. Break-even Analysis (Updated Pricing):"
    echo "   - User pays: $mint_fee_sol SOL per NFT (\$3.98)"
    echo "   - Actual blockchain cost: $per_nft_cost SOL"
    echo "   - Net profit per NFT: $(echo "scale=4; $mint_fee_sol - $per_nft_cost" | bc) SOL"
    echo "   - Profit margin: $(echo "scale=0; (($mint_fee_sol - $per_nft_cost) / $mint_fee_sol) * 100" | bc -l)%"
    
    # Cost optimization recommendations
    echo -e "\n${GREEN}🔧 Cost Optimization Tips:${NC}"
    echo "1. Test thoroughly on devnet first (FREE)"
    echo "2. Deploy during low network congestion"
    echo "3. Use batch operations for multiple NFTs"
    echo "4. Consider compression for high-volume use"
    echo "5. Monitor and adjust mint fees based on SOL price"
}

# Main execution
echo "Fetching current SOL price..."
SOL_PRICE=$(get_sol_price)

if [ -z "$SOL_PRICE" ]; then
    SOL_PRICE=100  # Fallback price
    echo -e "${YELLOW}⚠️  Could not fetch SOL price, using fallback: \$${SOL_PRICE}${NC}"
else
    echo -e "${GREEN}✅ Current SOL price: \$${SOL_PRICE}${NC}"
fi

# Calculate for both networks
calculate_costs "devnet" $SOL_PRICE
calculate_costs "mainnet" $SOL_PRICE

echo -e "\n${BLUE}🎯 Deployment Recommendations:${NC}"
echo "1. Start with devnet deployment (FREE)"
echo "2. Test all functionality thoroughly"
echo "3. Deploy to mainnet when ready"
echo "4. Fund wallet with recommended amount"
echo "5. Monitor costs and adjust fees as needed"

echo -e "\n${GREEN}💡 Pro Tips:${NC}"
echo "- Use ./scripts/deploy-minimal.sh for lowest costs"
echo "- Use ./scripts/deploy-optimized.sh for full features"
echo "- Monitor SOL price before mainnet deployment"
echo "- Consider market conditions for launch timing"

echo -e "\n${BLUE}📈 Revenue Projections (Updated Pricing):${NC}"
echo "With 1000 NFTs minted:"
echo "- Revenue: $(echo "scale=2; 1000 * 0.0262 * $SOL_PRICE" | bc) USD (mint fees)"
echo "- Total profit: $(echo "scale=2; 1000 * (0.0262 - 0.00919) * $SOL_PRICE" | bc) USD"
echo "- Profit margin: ~65%"
echo "- Secondary sales (5% royalty): Additional variable revenue"

echo -e "\n🏁 Cost calculation complete!"
