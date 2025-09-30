const axios = require('axios');

async function testGroups() {
  try {
    console.log('=== Testing Groups Endpoints ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login to get token
    const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Authenticated successfully');
    
    // Test different groups endpoints
    const groupEndpoints = [
      '/api/groups',           // Base route
      '/api/groups/all',       // Get all groups
      '/api/groups/active',    // Get active groups
      '/api/groups/default',   // Get default group
    ];
    
    for (const endpoint of groupEndpoints) {
      console.log(`\n--- Testing: ${endpoint} ---`);
      try {
        const response = await axios.get(`${baseURL}${endpoint}`, { headers });
        console.log('✅ Success:', response.status);
        if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data)) {
            console.log(`Data: Array with ${response.data.length} items`);
            if (response.data.length > 0) {
              console.log('Sample item keys:', Object.keys(response.data[0]));
            }
          } else {
            console.log('Data keys:', Object.keys(response.data));
          }
        } else {
          console.log('Data:', response.data);
        }
      } catch (error) {
        if (error.response) {
          console.log('❌ HTTP Error:', error.response.status);
          console.log('Error message:', error.response.data?.message || error.response.statusText);
          
          if (error.response.status === 500) {
            console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
          }
        } else {
          console.log('❌ Request error:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGroups();