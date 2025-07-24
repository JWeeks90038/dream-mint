// Quick test to verify backend is working
const fetch = require('node-fetch');

async function testBackend() {
  try {
    console.log('Testing backend connection...');
    
    const response = await fetch('http://localhost:5001/api/config');
    const data = await response.json();
    
    console.log('✅ Backend response:', JSON.stringify(data, null, 2));
    console.log('✅ Backend is running correctly!');
    
    // Test CORS
    const corsResponse = await fetch('http://localhost:5001/api/config', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ CORS test status:', corsResponse.status);
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
}

testBackend();
