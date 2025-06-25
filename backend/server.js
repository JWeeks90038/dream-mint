require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

// Environment-based Stripe configuration
const isProduction = process.env.NODE_ENV === 'production';
const stripeSecretKey = isProduction 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Stripe secret key not found for environment:', process.env.NODE_ENV);
  process.exit(1);
}

const stripe = require('stripe')(stripeSecretKey);

console.log(`🔧 Running in ${isProduction ? 'PRODUCTION' : 'TEST'} mode`);
console.log(`💳 Using Stripe ${isProduction ? 'LIVE' : 'TEST'} keys`);

const app = express();
app.use(express.json());
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ 
  apiKey: OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout
  maxRetries: 2 // Retry up to 2 times
});

// Store payment methods and history (in production, use a proper database)
const paymentMethods = new Map();
const paymentHistory = [];

app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  console.log('Received prompt:', prompt);
  if (!prompt) {
    console.error('Missing prompt in request body');
    return res.status(400).json({ error: 'Missing prompt' });
  }
  
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    console.error('Invalid or missing OpenAI API key');
    return res.status(500).json({ error: 'OpenAI API key not configured properly' });
  }
  
  try {
    console.log('Starting image generation process...');
    
    // Summarize/visualize the prompt using GPT-3.5-turbo (more accessible than GPT-4)
    console.log('Calling GPT-3.5-turbo to create visual prompt...');
    const summaryRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an assistant that turns long, narrative dreams into short, direct, visual prompts for AI image generation. Only output the visual prompt.' },
        { role: 'user', content: `Summarize this dream as a short, direct, visual prompt for an AI image generator: ${prompt}` }
      ],
      max_tokens: 60
    });
    const visualPrompt = summaryRes.choices[0].message.content.trim();
    console.log('✅ Visual prompt for DALL·E:', visualPrompt);
    
    // Generate image with DALL·E 3, fallback to DALL·E 2 if needed
    console.log('Calling DALL·E 3 to generate image...');
    let response;
    try {
      response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: visualPrompt,
        n: 1,
        size: '1024x1024',
      });
    } catch (dalleError) {
      console.log('DALL·E 3 failed, trying DALL·E 2...');
      response = await openai.images.generate({
        model: 'dall-e-2',
        prompt: visualPrompt,
        n: 1,
        size: '1024x1024',
      });
    }
    const imageUrl = response.data[0].url;
    console.log('✅ Image generated successfully:', imageUrl);
    
    res.json({ imageUrl, visualPrompt });
  } catch (err) {
    console.error('OpenAI API error details:', {
      message: err.message,
      type: err.type || 'unknown',
      code: err.code || 'unknown',
      status: err.status || 'unknown'
    });
    
    // Provide more specific error messages
    let errorMessage = 'Internal Server Error';
    if (err.message && err.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again with a shorter prompt.';
    } else if (err.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (err.status === 401) {
      errorMessage = 'API authentication failed. Please check API key configuration.';
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Proxy endpoint to fetch images and avoid CORS issues
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing image URL' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the image data
    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// IPFS metadata proxy endpoint
app.get('/api/proxy-ipfs/:hash', async (req, res) => {
  const { hash } = req.params;
  
  try {
    console.log(`Proxying IPFS metadata request for hash: ${hash}`);
    
    // Try multiple IPFS gateways
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://cloudflare-ipfs.com/ipfs/${hash}`,
      `https://dweb.link/ipfs/${hash}`,
      `https://nftstorage.link/ipfs/${hash}`,
      `https://ipfs.io/ipfs/${hash}`
    ];
    
    let response = null;
    let lastError = null;
    
    for (const gateway of gateways) {
      try {
        console.log(`Trying IPFS gateway: ${gateway}`);
        const fetch = await import('node-fetch').then(mod => mod.default);
        response = await fetch(gateway, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DreamMint-Backend/1.0'
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (response.ok) {
          console.log(`Successfully fetched from: ${gateway}`);
          const data = await response.json();
          
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          
          return res.json(data);
        }
      } catch (gatewayError) {
        lastError = gatewayError;
        console.log(`Gateway ${gateway} failed:`, gatewayError.message);
        continue;
      }
    }
    
    // If we reach here, all gateways failed - this is likely a legacy NFT
    console.log(`All IPFS gateways failed for hash: ${hash}. This is likely a legacy NFT with fallback metadata.`);
    
    // Return a graceful fallback response for legacy NFTs
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60'); // Short cache for fallback
    
    res.status(404).json({ 
      error: 'IPFS_NOT_FOUND',
      hash: hash,
      message: 'This appears to be a legacy NFT with local fallback metadata',
      isLegacy: true,
      fallback: {
        name: `Legacy Dream NFT #${hash.slice(-8)}`,
        description: 'This NFT was created before IPFS integration and uses local fallback metadata.',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMjEyMTIxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzg4ODg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TGVnYWN5IERyZWFtPC90ZXh0Pgo8dGV4dCB4PSIxMDAiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ORlQ8L3RleHQ+Cjwvc3ZnPgo=',
        attributes: [
          {
            trait_type: "Type",
            value: "Legacy NFT"
          },
          {
            trait_type: "Status",
            value: "Fallback Metadata"
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('Unexpected error in IPFS proxy:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(500).json({ 
      error: 'INTERNAL_ERROR',
      hash: hash,
      message: error.message 
    });
  }
});

// Test endpoint to verify OpenAI API connection
app.get('/api/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI API connection...');
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not found' });
    }
    
    // Simple test call
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API is working" in exactly those words.' }],
      max_tokens: 10
    });
    
    const testMessage = response.choices[0].message.content;
    console.log('✅ OpenAI API test successful:', testMessage);
    
    res.json({ 
      status: 'success', 
      message: 'OpenAI API is working',
      testResponse: testMessage 
    });
  } catch (err) {
    console.error('❌ OpenAI API test failed:', err.message);
    res.status(500).json({ 
      error: 'OpenAI API test failed', 
      details: err.message 
    });
  }
});

// Fallback endpoint for testing when OpenAI is down
app.post('/api/generate-image-fallback', async (req, res) => {
  const { prompt } = req.body;
  console.log('🔄 Using fallback image generation for prompt:', prompt);
  
  // Return a placeholder image for testing
  const fallbackImageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTMxNjI7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0YzY0OGI7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0idXJsKCNncmFkKSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmzwvdGV4dD48dGV4dCB4PSIyNTYiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RGFyayBMYWtlIERyZWFtPC90ZXh0Pjx0ZXh0IHg9IjI1NiIgeT0iMzEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC44KSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdCBJbWFnZSBHZW5lcmF0aW9uPC90ZXh0Pjwvc3ZnPg==';
  const visualPrompt = `Dark mysterious lake with ${prompt.slice(0, 50)}...`;
  
  res.json({ 
    imageUrl: fallbackImageUrl, 
    visualPrompt: visualPrompt,
    isFallback: true 
  });
});

// Payment endpoint to create a payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;
  console.log('Creating payment intent:', { amount, currency });
  
  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      // Optional: Add metadata or description
      metadata: { integration_check: 'accept_a_payment' }
    });
    
    console.log('✅ Payment intent created:', paymentIntent.id);
    
    // Respond with the client secret to complete the payment on the client side
    res.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create payment intent' 
    });
  }
});

// Webhook endpoint to handle Stripe events (e.g., payment success)
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook verified:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event (e.g., payment_intent.succeeded)
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      
      // TODO: Update order status in your database, fulfill the order, etc.
      
      break;
    // ... handle other event types as needed
    default:
      console.warn('Unhandled event type:', event.type);
  }
  
  // Respond to acknowledge receipt of the event
  res.json({ received: true });
});

// Stripe Payment Endpoints

// Create a payment method
app.post('/api/create-payment-method', async (req, res) => {
  try {
    console.log('🔄 Received create-payment-method request');
    const { account, cardNumber, expMonth, expYear, cvc, name } = req.body;
    
    console.log('📝 Request data:', {
      account,
      cardNumber: cardNumber ? cardNumber.replace(/\d(?=\d{4})/g, "*") : 'missing', // Mask card number
      expMonth,
      expYear,
      cvc: cvc ? '***' : 'missing', // Mask CVC
      name
    });
    
    if (!account || !cardNumber || !expMonth || !expYear || !cvc || !name) {
      console.error('❌ Missing required card information');
      return res.status(400).json({ error: 'Missing required card information' });
    }

    console.log('📤 Creating Stripe Customer and payment method...');
    
    // Step 1: Create or retrieve Stripe Customer
    let customer;
    const existingCustomerKey = `customer_${account}`;
    
    if (paymentMethods.has(existingCustomerKey)) {
      // Customer already exists
      const customerData = paymentMethods.get(existingCustomerKey);
      customer = { id: customerData.customerId };
      console.log('✅ Using existing Stripe Customer:', customer.id);
    } else {
      // Create new Stripe Customer
      customer = await stripe.customers.create({
        email: `${account}@dreammint.app`, // Use wallet address as unique identifier
        description: `DreamMint user - ${account}`,
        metadata: {
          wallet_address: account,
          created_via: 'dreammint_dapp'
        }
      });
      
      // Store customer reference
      paymentMethods.set(existingCustomerKey, {
        account,
        customerId: customer.id,
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ Created new Stripe Customer:', customer.id);
    }
    
    // Step 2: Create payment method (different approach for test vs live)
    let paymentMethod;
    
    if (!isProduction) {
      // TEST MODE: Use Stripe test tokens
      console.log('🧪 TEST MODE: Using Stripe test tokens');
      
      if (cardNumber === '4242424242424242') {
        console.log('🧪 Using Stripe test token for 4242 card');
        paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: 'tok_visa' },
          billing_details: { name: name },
        });
      } else if (cardNumber === '4000056655665556') {
        console.log('🧪 Using Stripe test token for Visa debit card');
        paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: 'tok_visa_debit' },
          billing_details: { name: name },
        });
      } else if (cardNumber === '5555555555554444') {
        console.log('🧪 Using Stripe test token for Mastercard');
        paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: 'tok_mastercard' },
          billing_details: { name: name },
        });
      } else {
        console.log('🧪 Creating generic test payment method');
        paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: 'tok_visa' },
          billing_details: { name: name },
        });
      }
    } else {
      // LIVE MODE: Use Stripe Elements for secure card handling
      console.log('🔴 LIVE MODE: This endpoint should not be used for live card data');
      console.log('🔴 Use Stripe Elements in frontend for live mode');
      
      // In live mode, you should use Stripe Elements on frontend
      // This is a fallback that should not be used
      return res.status(400).json({ 
        error: 'Live mode requires Stripe Elements integration on frontend',
        requiresElements: true,
        mode: 'live'
      });
    }

    console.log('✅ Stripe payment method created:', {
      id: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
    });

    // Step 3: Attach payment method to customer for reuse
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });
    
    console.log('✅ Payment method attached to customer');

    // Step 4: Store payment method association
    paymentMethods.set(`${account}_${paymentMethod.id}`, {
      account,
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      createdAt: new Date().toISOString()
    });

    console.log('✅ Payment method stored locally');

    res.json({ 
      paymentMethodId: paymentMethod.id,
      customerId: customer.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand
    });
  } catch (error) {
    console.error('❌ Error creating payment method:', {
      message: error.message,
      type: error.type,
      code: error.code,
      decline_code: error.decline_code,
      param: error.param
    });
    res.status(500).json({ error: error.message || 'Failed to create payment method' });
  }
});

// Process a payment
app.post('/api/process-payment', async (req, res) => {
  try {
    const { paymentMethodId, amount, currency, serviceType, metadata } = req.body;
    
    console.log('🔄 Processing payment:', {
      paymentMethodId,
      amount,
      currency,
      serviceType,
      account: metadata?.account
    });
    
    if (!paymentMethodId || !amount || !currency || !serviceType) {
      return res.status(400).json({ error: 'Missing required payment information' });
    }

    // Get the customer ID associated with this payment method
    const paymentMethodKey = `${metadata.account}_${paymentMethodId}`;
    const storedPaymentMethod = paymentMethods.get(paymentMethodKey);
    
    if (!storedPaymentMethod) {
      return res.status(400).json({ error: 'Payment method not found' });
    }

    console.log('📤 Creating payment with customer:', storedPaymentMethod.customerId);

    // Create payment intent with customer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: currency,
      customer: storedPaymentMethod.customerId, // Use the customer ID
      payment_method: paymentMethodId,
      confirm: true,
      description: `DreamMint ${serviceType} service`,
      metadata: {
        service_type: serviceType,
        account: metadata.account || 'unknown',
        dream_text: metadata.dreamText?.substring(0, 100) || '',
      },
      return_url: 'http://localhost:3000/payment-complete'
    });

    console.log('✅ Payment processed successfully:', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: amount / 100
    });

    // Log payment
    paymentHistory.push({
      paymentIntentId: paymentIntent.id,
      account: metadata.account,
      customerId: storedPaymentMethod.customerId,
      amount: amount / 100, // convert back to dollars
      currency: currency.toUpperCase(),
      serviceType,
      status: paymentIntent.status,
      timestamp: new Date().toISOString(),
      metadata
    });

    res.json({ 
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    res.status(500).json({ error: error.message || 'Payment processing failed' });
  }
});

// Log payment (for crypto payments and general logging)
app.post('/api/log-payment', async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Store payment log (in production, use a proper database)
    paymentHistory.push({
      ...paymentData,
      timestamp: paymentData.timestamp || new Date().toISOString()
    });

    console.log('Payment logged:', paymentData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging payment:', error);
    res.status(500).json({ error: 'Failed to log payment' });
  }
});

// Get payment history for an account
app.get('/api/payment-history/:account', async (req, res) => {
  try {
    const { account } = req.params;
    const accountPayments = paymentHistory.filter(p => p.account === account);
    
    res.json({ payments: accountPayments });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Environment configuration endpoint for frontend
app.get('/api/config', (req, res) => {
  const publishableKey = isProduction 
    ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY 
    : process.env.STRIPE_PUBLISHABLE_KEY;
    
  res.json({
    environment: isProduction ? 'production' : 'development',
    stripe: {
      publishableKey: publishableKey,
      isLiveMode: isProduction
    },
    pricing: {
      imageGeneration: { usd: 0.69 },
      nftMinting: { usd: 1.99 }
    }
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 AI backend listening on port ${PORT}`);
  console.log(`📡 IPFS proxy available at: http://localhost:${PORT}/api/proxy-ipfs/`);
  console.log(`🎨 Image generation available at: http://localhost:${PORT}/api/generate-image`);
});
