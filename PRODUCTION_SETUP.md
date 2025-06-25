# DreamMint Production Setup Guide

## 🔴 LIVE MODE CONFIGURATION

### 1. Stripe Live Keys Setup

1. **Get your Stripe live keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Switch to **Live mode** (toggle in top left)
   - Go to **Developers > API keys**
   - Copy your **Live Publishable key** (starts with `pk_live_`)
   - Copy your **Live Secret key** (starts with `sk_live_`)

2. **Update your `.env` file:**
   ```bash
   # Set environment to production
   NODE_ENV=production
   
   # Stripe Live Keys
   STRIPE_LIVE_SECRET_KEY=sk_live_your_actual_live_secret_key_here
   STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key_here
   
   # Keep your existing keys for development
   STRIPE_SECRET_KEY=sk_test_your_test_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
   ```

### 2. Smart Contract Deployment

1. **Deploy to Ethereum Mainnet:**
   ```bash
   # Make sure you have mainnet ETH for gas fees
   npx hardhat run scripts/deploy.js --network mainnet
   ```

2. **Update contract address in `src/config/environment.ts`:**
   ```typescript
   const productionConfig: EnvironmentConfig = {
     // ... other config
     network: {
       chainId: '0x1', // Ethereum mainnet
       name: 'Ethereum Mainnet',
       contractAddress: '0xYourActualMainnetContractAddress' // UPDATE THIS
     }
   };
   ```

### 3. Domain and SSL Setup

1. **Update API URLs in `src/config/environment.ts`:**
   ```typescript
   const productionConfig: EnvironmentConfig = {
     apiUrl: 'https://api.yourdomain.com', // Your actual API domain
     // ... rest of config
   };
   ```

2. **Set up SSL certificates** for your domain

### 4. Environment Variables Checklist

Required for production:
- ✅ `NODE_ENV=production`
- ✅ `STRIPE_LIVE_SECRET_KEY=sk_live_...`
- ✅ `STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...`
- ✅ `OPENAI_API_KEY=sk-...` (same as test)
- ✅ `PINATA_JWT=...` (for IPFS)

### 5. Pre-Launch Testing

1. **Test with small amounts first:**
   - Start with $0.01 transactions
   - Verify payments appear in Stripe Dashboard
   - Test image generation and NFT minting

2. **Test user flow:**
   - Connect wallet
   - Add payment method
   - Generate multiple images
   - Mint multiple NFTs
   - Verify no payment interruptions

### 6. Production Deployment

```bash
# Run the production deployment script
./scripts/deploy-production.sh
```

Or manually:
```bash
# Set environment
export NODE_ENV=production

# Build frontend
npm run build

# Start backend
npm start
```

### 7. Monitoring and Alerts

1. **Monitor Stripe Dashboard:**
   - Watch for successful payments
   - Set up webhooks for payment confirmations
   - Monitor for failed payments or disputes

2. **Monitor contract on Etherscan:**
   - Watch for successful NFT mints
   - Monitor gas usage
   - Verify metadata IPFS links

### 8. Security Considerations

- ✅ Never expose live Stripe secret keys in frontend
- ✅ Use HTTPS for all communications
- ✅ Validate all inputs server-side
- ✅ Monitor for unusual payment patterns
- ✅ Set up Stripe webhooks for payment confirmations

### 9. Backup Plan

Keep test environment running:
- If issues arise, switch back to test mode
- Use `NODE_ENV=development` to revert
- Test fixes before redeploying to production

## 🚨 IMPORTANT WARNINGS

- **Real money**: Production mode charges real money to real cards
- **Gas fees**: Mainnet transactions cost real ETH
- **Irreversible**: Blockchain transactions cannot be undone
- **Testing**: Complete all testing in test mode first

## 🔄 Switching Modes

**To switch to test mode:**
```bash
export NODE_ENV=development
# Restart servers
```

**To switch to live mode:**
```bash
export NODE_ENV=production
# Restart servers
```

The app automatically detects the environment and uses appropriate Stripe keys.
