#!/bin/bash

# DreamMint Production Deployment Script

echo "🚀 DreamMint Production Deployment"
echo "=================================="

# Check if NODE_ENV is set to production
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    echo "   Current: $NODE_ENV"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check required environment variables
echo "🔍 Checking environment variables..."

required_vars=(
    "STRIPE_LIVE_SECRET_KEY"
    "STRIPE_LIVE_PUBLISHABLE_KEY" 
    "OPENAI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate Stripe keys
if [[ $STRIPE_LIVE_SECRET_KEY == sk_live_* ]]; then
    echo "✅ Valid Stripe live secret key format"
else
    echo "❌ Invalid Stripe live secret key format (should start with sk_live_)"
    exit 1
fi

if [[ $STRIPE_LIVE_PUBLISHABLE_KEY == pk_live_* ]]; then
    echo "✅ Valid Stripe live publishable key format"
else
    echo "❌ Invalid Stripe live publishable key format (should start with pk_live_)"
    exit 1
fi

# Build frontend
echo "🏗️  Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend build completed"

# Test backend
echo "🧪 Testing backend configuration..."
node -e "
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_LIVE_SECRET_KEY);
console.log('✅ Stripe configuration loaded successfully');
console.log('🔴 LIVE MODE ENABLED - Real payments will be processed');
"

if [ $? -ne 0 ]; then
    echo "❌ Backend configuration test failed"
    exit 1
fi

echo ""
echo "🎉 Production deployment ready!"
echo ""
echo "📋 Pre-launch checklist:"
echo "   ✅ Environment variables configured"
echo "   ✅ Stripe live keys validated"
echo "   ✅ Frontend built successfully"
echo "   ✅ Backend configuration tested"
echo ""
echo "🔴 IMPORTANT: You are deploying to LIVE MODE"
echo "   - Real payments will be processed"
echo "   - Real money will be charged"
echo "   - Make sure all testing is complete"
echo ""
read -p "Deploy to production? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🚀 Starting production server..."
NODE_ENV=production npm start
