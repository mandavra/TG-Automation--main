const axios = require('axios');
require('dotenv').config();

async function testCashfreeUrls() {
  console.log('=== Testing Cashfree API URLs ===\n');
  
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    console.log('❌ Missing CLIENT_ID or CLIENT_SECRET');
    return;
  }

  const possibleUrls = [
    'https://sandbox.cashfree.com/pg',
    'https://api.cashfree.com/pg',
    'https://sandbox.cashfree.com',
    'https://api.cashfree.com',
    'https://sandbox.cashfree.com/pg/v1',
    'https://api.cashfree.com/pg/v1'
  ];

  const headers = {
    'x-client-id': process.env.CASHFREE_CLIENT_ID,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    'x-api-version': '2022-09-01',
    'Content-Type': 'application/json'
  };

  for (const baseUrl of possibleUrls) {
    console.log(`Testing: ${baseUrl}/links`);
    
    try {
      const response = await axios.get(`${baseUrl}/links`, {
        headers,
        timeout: 10000
      });
      
      console.log(`✅ SUCCESS: ${baseUrl}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   This is the correct URL to use!`);
      console.log('');
      
      // Update the .env file suggestion
      console.log('💡 Update your .env file with:');
      console.log(`CASHFREE_BASE_URL=${baseUrl}`);
      console.log('');
      return baseUrl;
      
    } catch (error) {
      console.log(`❌ FAILED: ${baseUrl}`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log('');
    }
  }

  console.log('❌ None of the tested URLs worked. Please check your API credentials.');
}

// Run the test
testCashfreeUrls().catch(console.error); 