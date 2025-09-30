const axios = require('axios');

async function testDashboard() {
  try {
    console.log('=== Testing Dashboard Endpoints ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login to get token
    console.log('Step 1: Getting authentication token...');
    const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const token = loginResponse.data.token;
    const adminRole = loginResponse.data.admin.role;
    console.log('✅ Login successful');
    console.log('Admin role:', adminRole);
    console.log('Token obtained');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Test different dashboard endpoints
    const dashboardEndpoints = [
      '/api/analytics/revenue',
      '/api/analytics/user-growth', 
      '/api/analytics/export',
      '/api/admin/dashboard/stats', // Super admin only
      '/api/plans/admin/get',
      '/api/groups', // Check if groups endpoint exists
    ];
    
    for (const endpoint of dashboardEndpoints) {
      console.log(`\n--- Testing: ${endpoint} ---`);
      try {
        const response = await axios.get(`${baseURL}${endpoint}`, { headers });
        console.log('✅ Success:', response.status);
        console.log('Data keys:', Object.keys(response.data));
        
        // Show sample data (truncated)
        if (response.data) {
          const sampleData = JSON.stringify(response.data, null, 2);
          console.log('Sample response:', sampleData.substring(0, 200) + (sampleData.length > 200 ? '...' : ''));
        }
      } catch (error) {
        if (error.response) {
          console.log('❌ HTTP Error:', error.response.status);
          console.log('Error message:', error.response.data?.message || error.response.statusText);
          if (error.response.data?.error) {
            console.log('Detailed error:', error.response.data.error);
          }
          
          // Log the full stack trace if available
          if (error.response.status === 500 && error.response.data) {
            console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
          }
        } else {
          console.log('❌ Request error:', error.message);
        }
      }
    }
    
    // Step 3: Test POST endpoints that might be called by dashboard
    console.log('\n=== Testing POST Endpoints ===');
    
    const postEndpoints = [
      { url: '/api/analytics/export', data: { dateRange: '30d', format: 'json' } }
    ];
    
    for (const endpoint of postEndpoints) {
      console.log(`\n--- Testing POST: ${endpoint.url} ---`);
      try {
        const response = await axios.post(`${baseURL}${endpoint.url}`, endpoint.data, { headers });
        console.log('✅ Success:', response.status);
      } catch (error) {
        if (error.response) {
          console.log('❌ HTTP Error:', error.response.status);
          console.log('Error message:', error.response.data?.message || error.response.statusText);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testDashboard();