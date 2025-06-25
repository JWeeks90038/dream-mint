// Test Pinata API credentials directly
require('dotenv').config();

async function testPinataAPI() {
  const apiKey = process.env.VITE_PINATA_API_KEY;
  const secretKey = process.env.VITE_PINATA_SECRET_KEY;
  
  console.log('🔧 Testing Pinata API credentials...');
  console.log('API Key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT FOUND');
  console.log('Secret Key:', secretKey ? `${secretKey.slice(0, 8)}...` : 'NOT FOUND');
  
  if (!apiKey || !secretKey) {
    console.error('❌ Missing Pinata credentials in .env file');
    return;
  }
  
  try {
    // Use dynamic import for fetch in Node.js
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      }
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Pinata API credentials are valid!');
    } else {
      console.error('❌ Pinata API test failed');
      if (response.status === 403) {
        console.error('🔑 API key permissions issue. Check your key has "Files: Write" permission at https://app.pinata.cloud/keys');
      } else if (response.status === 401) {
        console.error('🔐 Invalid API credentials. Double-check your API key and secret');
      }
    }
  } catch (error) {
    console.error('❌ Error testing Pinata API:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('📦 Installing node-fetch...');
      const { execSync } = require('child_process');
      try {
        execSync('npm install node-fetch@2', { stdio: 'inherit' });
        console.log('✅ node-fetch installed. Please run this script again.');
      } catch (installError) {
        console.error('❌ Failed to install node-fetch:', installError.message);
      }
    }
  }
}

testPinataAPI();
