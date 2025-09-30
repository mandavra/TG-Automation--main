const axios = require('axios');
require('dotenv').config();

async function testCashfreeConfig() {
  console.log('=== Cashfree API Configuration Test ===\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('CASHFREE_BASE_URL:', process.env.CASHFREE_BASE_URL || 'NOT SET');
  console.log('CASHFREE_CLIENT_ID:', process.env.CASHFREE_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('CASHFREE_CLIENT_SECRET:', process.env.CASHFREE_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
  console.log('BACKEND_URL:', process.env.BACKEND_URL || 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  console.log('');

  // Test API connection
  if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    console.log('❌ Missing required environment variables. Please check your .env file.');
    return;
  }

  console.log('Testing API connection...');
  
  try {
    // Test basic connection - try to get payment links (this should work if credentials are correct)
    const response = await axios.get(`${process.env.CASHFREE_BASE_URL}/links`, {
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2022-09-01'
      },
      timeout: 10000
    });
    
    console.log('✅ API connection successful');
    console.log('Response status:', response.status);
    
  } catch (error) {
    console.log('❌ API connection failed');
    console.log('Error status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication failed. Please check your CLIENT_ID and CLIENT_SECRET.');
    } else if (error.response?.status === 403) {
      console.log('🚫 Access forbidden. Please check your API permissions.');
    } else if (error.response?.status === 404) {
      console.log('🔗 Endpoint not found. Please check your CASHFREE_BASE_URL.');
      console.log('Current URL:', process.env.CASHFREE_BASE_URL);
      console.log('Expected format: https://sandbox.cashfree.com/pg or https://api.cashfree.com/pg');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Network error. Please check your internet connection and CASHFREE_BASE_URL.');
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testCashfreeConfig().catch(console.error); 