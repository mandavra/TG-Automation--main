const axios = require('axios');

async function testAllDashboardEndpoints() {
  try {
    console.log('=== Comprehensive Dashboard Endpoint Test ===\n');
    
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
    
    console.log('✅ Authenticated successfully\n');
    
    // Comprehensive list of all possible dashboard endpoints
    const allEndpoints = [
      // Analytics endpoints
      { method: 'GET', url: '/api/analytics/revenue', description: 'Revenue analytics' },
      { method: 'GET', url: '/api/analytics/user-growth', description: 'User growth analytics' },
      { method: 'GET', url: '/api/analytics/export', description: 'Analytics export' },
      
      // Admin endpoints
      { method: 'GET', url: '/api/admin/me', description: 'Admin profile' },
      { method: 'GET', url: '/api/admin/list', description: 'List all admins (super admin only)' },
      { method: 'GET', url: '/api/admin/dashboard/stats', description: 'Dashboard stats (super admin only)' },
      
      // Plans endpoints
      { method: 'GET', url: '/api/plans/get', description: 'Get all plans (public)' },
      { method: 'GET', url: '/api/plans/admin/get', description: 'Get admin plans' },
      
      // Groups endpoints
      { method: 'GET', url: '/api/groups/all', description: 'Get all groups' },
      { method: 'GET', url: '/api/groups/active', description: 'Get active groups' },
      { method: 'GET', url: '/api/groups/default', description: 'Get default group' },
      
      // User endpoints
      { method: 'GET', url: '/api/user/dashboard', description: 'User dashboard' },
      
      // Payment endpoints
      { method: 'GET', url: '/api/payment/links', description: 'Payment links' },
      { method: 'GET', url: '/api/payment/history', description: 'Payment history' },
      
      // Invoice endpoints
      { method: 'GET', url: '/api/invoices', description: 'Get invoices' },
      
      // Withdrawal endpoints
      { method: 'GET', url: '/api/withdrawal', description: 'Get withdrawals' },
      { method: 'GET', url: '/api/withdrawal/requests', description: 'Withdrawal requests' },
      
      // Telegram endpoints
      { method: 'GET', url: '/api/telegram/bot-info', description: 'Bot information' },
      
      // Channel bundle endpoints
      { method: 'GET', url: '/api/channel-bundles', description: 'Channel bundles' },
      
      // Health check
      { method: 'GET', url: '/health', description: 'Health check', noAuth: true }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    const errors500 = [];
    
    for (const endpoint of allEndpoints) {
      console.log(`--- Testing: ${endpoint.method} ${endpoint.url} (${endpoint.description}) ---`);
      try {
        const config = endpoint.noAuth ? {} : { headers };
        
        let response;
        if (endpoint.method === 'GET') {
          response = await axios.get(`${baseURL}${endpoint.url}`, config);
        } else if (endpoint.method === 'POST') {
          response = await axios.post(`${baseURL}${endpoint.url}`, {}, config);
        }
        
        console.log(`✅ Success: ${response.status}`);
        successCount++;
        
        // Show data structure for successful responses
        if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data)) {
            console.log(`   Data: Array with ${response.data.length} items`);
          } else {
            const keys = Object.keys(response.data);
            console.log(`   Data keys (${keys.length}):`, keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : ''));
          }
        }
        
      } catch (error) {
        errorCount++;
        
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.response.statusText;
          
          if (status === 500) {
            console.log(`❌ 500 ERROR: ${message}`);
            errors500.push({
              endpoint: `${endpoint.method} ${endpoint.url}`,
              message,
              fullError: error.response.data
            });
          } else {
            console.log(`⚠️  ${status} Error: ${message}`);
          }
        } else {
          console.log(`❌ Request error: ${error.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('=== TEST SUMMARY ===');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🔥 500 Errors: ${errors500.length}`);
    
    if (errors500.length > 0) {
      console.log('\n=== 500 ERRORS DETAIL ===');
      errors500.forEach((error, index) => {
        console.log(`${index + 1}. ${error.endpoint}`);
        console.log(`   Message: ${error.message}`);
        if (error.fullError && error.fullError.error) {
          console.log(`   Error: ${error.fullError.error}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllDashboardEndpoints();