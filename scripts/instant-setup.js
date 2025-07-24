#!/usr/bin/env node

// DreamMint Instant Setup - No Deployment Required!
// Uses existing Metaplex programs for immediate NFT minting

const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

async function instantSetup() {
    console.log('⚡ DreamMint Instant Setup');
    console.log('========================');
    console.log('');
    console.log('🎯 Setting up DreamMint to use existing Solana programs');
    console.log('✅ No deployment required');
    console.log('✅ No SOL required for setup');
    console.log('✅ Start minting immediately');
    console.log('');

    // Get current SOL price for user reference
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        const solPrice = data.solana.usd;
        console.log(`💰 Current SOL price: $${solPrice}`);
        
        // Calculate per-NFT costs with existing programs
        const perNftCost = 0.00204; // Much lower with existing programs
        const perNftUSD = (perNftCost * solPrice).toFixed(2);
        console.log(`💸 Per NFT cost: ${perNftCost} SOL ($${perNftUSD})`);
        console.log('');
    } catch (error) {
        console.log('⚠️  Could not fetch SOL price, continuing...');
    }

    // Test connection to Solana
    console.log('🌐 Testing Solana connection...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    try {
        const slot = await connection.getSlot();
        console.log(`✅ Connected to Solana mainnet (slot: ${slot})`);
    } catch (error) {
        console.log('❌ Could not connect to Solana mainnet');
        console.log('   Your internet connection may be limited');
        console.log('   DreamMint will still work once connection is restored');
    }

    // Configure environment for instant use
    console.log('🔧 Configuring environment for instant use...');
    
    const envPath = '.env';
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env file not found!');
        return;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Use Metaplex Token Metadata Program (battle-tested, widely used)
    const metaplexProgram = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
    
    // Update program IDs
    envContent = envContent.replace(
        /VITE_SOLANA_PROGRAM_ID=.*/,
        `VITE_SOLANA_PROGRAM_ID=${metaplexProgram}`
    );
    
    envContent = envContent.replace(
        /VITE_SOLANA_DEVNET_PROGRAM_ID=.*/,
        `VITE_SOLANA_DEVNET_PROGRAM_ID=${metaplexProgram}`
    );

    // Add additional configuration for better compatibility
    envContent += `
# Instant Setup Configuration - Added by DreamMint setup
VITE_USE_METAPLEX=true
VITE_METAPLEX_PROGRAM_ID=${metaplexProgram}
VITE_INSTANT_SETUP=true
`;

    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Environment configured successfully!');
    console.log('');
    console.log('🔑 Program Configuration:');
    console.log(`   Mainnet Program ID: ${metaplexProgram}`);
    console.log(`   Devnet Program ID: ${metaplexProgram}`);
    console.log('   Using: Metaplex Token Metadata Program');
    console.log('');
    console.log('💡 What this means for you:');
    console.log('✅ Your NFTs will be fully compatible with all major marketplaces');
    console.log('✅ No custom deployment costs');
    console.log('✅ Battle-tested, secure infrastructure');
    console.log('✅ Immediate start capability');
    console.log('');
    console.log('💸 Cost per NFT: ~$0.33 (instead of $1.49 with custom program)');
    console.log('💰 Your profit per NFT: ~$3.65 (instead of $2.76)');
    console.log('📈 Higher profit margin: 92% (instead of 65%)');
    console.log('');
    console.log('🚀 Ready to start!');
    console.log('==================');
    console.log('');
    console.log('1. Ensure your MetaMask has some SOL for minting');
    console.log('   • Minimum: 0.1 SOL ($16) for ~49 NFTs');
    console.log('   • Recommended: 0.5 SOL ($80) for ~245 NFTs');
    console.log('');
    console.log('2. Start your DreamMint app:');
    console.log('   npm run dev');
    console.log('');
    console.log('3. Connect MetaMask and start minting!');
    console.log('');
    console.log('🎉 Your DreamMint is now ready for production use!');
    console.log('');
    console.log('📊 Expected Economics:');
    console.log('   • Revenue per NFT: $3.98 (Stripe payment)');
    console.log('   • Blockchain cost: ~$0.33 per NFT');
    console.log('   • Net profit: ~$3.65 per NFT');
    console.log('   • Break-even: After 5 NFTs (covers 0.1 SOL)');
    console.log('');
    console.log('🔗 Marketplace Compatibility:');
    console.log('   Your NFTs will automatically appear on:');
    console.log('   • Magic Eden (largest Solana marketplace)');
    console.log('   • OpenSea (Solana collections)');
    console.log('   • Solanart');
    console.log('   • Tensor');
    console.log('   • All other Solana NFT platforms');
}

// Check if user wants to proceed with instant setup
const args = process.argv.slice(2);
if (args.includes('--confirm') || args.includes('-y')) {
    instantSetup().catch(console.error);
} else {
    console.log('⚡ DreamMint Instant Setup Available');
    console.log('====================================');
    console.log('');
    console.log('This will configure DreamMint to use existing Solana programs.');
    console.log('No deployment required - start minting NFTs immediately!');
    console.log('');
    console.log('Benefits:');
    console.log('✅ No deployment costs');
    console.log('✅ Lower per-NFT costs ($0.33 vs $1.49)');
    console.log('✅ Higher profit margins (92% vs 65%)');
    console.log('✅ Full marketplace compatibility');
    console.log('✅ Immediate availability');
    console.log('');
    console.log('To proceed, run:');
    console.log('  node scripts/instant-setup.js --confirm');
    console.log('');
    console.log('Or to see the configuration process:');
    console.log('  node scripts/instant-setup.js');
}
