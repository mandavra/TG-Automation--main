const axios = require('axios');

async function testLoginEndpoint() {
  try {
    console.log('=== Testing Login Endpoint ===\n');
    
    // Test with the correct credentials we just set
    const loginData = {
      email: 'abc@abc.com',
      password: 'testpassword123'
    };
    
    // Assume server is running on default port
    const baseURL = 'http://localhost:4000';
    
    console.log(`Attempting login to: ${baseURL}/api/admin/login`);
    console.log('Credentials:', loginData);
    
    try {
      const response = await axios.post(`${baseURL}/api/admin/login`, loginData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Login successful!');
      console.log('Status:', response.status);
      console.log('Response:', response.data);
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Connection refused - Server is not running');
        console.log('Please start the server first: npm start or node server.js');
        return;
      }
      
      if (error.response) {
        console.log('❌ HTTP Error Response:');
        console.log('Status:', error.response.status);
        console.log('Status Text:', error.response.statusText);
        console.log('Response Data:', error.response.data);
        console.log('Headers:', error.response.headers);
      } else if (error.request) {
        console.log('❌ No response received:');
        console.log('Request was made but no response received');
        console.log('Error:', error.message);
      } else {
        console.log('❌ Request setup error:');
        console.log('Error:', error.message);
      }
    }
    
    // Also test with wrong credentials
    console.log('\n=== Testing Wrong Credentials ===');
    try {
      await axios.post(`${baseURL}/api/admin/login`, {
        email: 'abc@abc.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Wrong credentials properly rejected with 401');
      } else {
        console.log('❌ Unexpected error with wrong credentials:', error.message);
      }
    }
    
    // Test server health
    console.log('\n=== Testing Server Health ===');
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('✅ Server health check successful');
      console.log('Health data:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Install axios if not available
try {
  require('axios');
} catch (e) {
  console.log('Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
}

testLoginEndpoint();