require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Stripe = require('stripe');

const app = express();
app.use(express.json());
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ...existing /api/generate-image endpoint...

app.post('/api/create-checkout-session', async (req, res) => {
  const { email } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'DreamMint AI Image or NFT Mint',
              description: 'Pay to generate an AI dream image or mint a dream NFT',
            },
            unit_amount: 100, // $1.00 in cents (adjust as needed)
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: process.env.CLIENT_URL + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.CLIENT_URL + '/payment-cancel',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message || err);
    res.status(500).json({ error: err.message || 'Stripe error' });
  }
});

// ...existing code...
