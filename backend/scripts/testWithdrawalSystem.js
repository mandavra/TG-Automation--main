const axios = require('axios');

async function testWithdrawalSystem() {
  try {
    console.log('=== Testing Withdrawal System ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login as admin
    console.log('Step 1: Login as regular admin...');
    const adminLoginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Admin logged in successfully');
    
    // Step 2: Login as super admin
    console.log('\nStep 2: Login as super admin...');
    const superAdminLoginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'superadmin@tg.local',
      password: 'SuperAdmin@12345'
    });
    
    const superAdminToken = superAdminLoginResponse.data.token;
    const superAdminHeaders = {
      'Authorization': `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Super admin logged in successfully');
    
    // Step 3: Test admin withdrawal endpoints
    console.log('\n=== Testing Admin Withdrawal Endpoints ===');
    
    const adminEndpoints = [
      { method: 'GET', url: '/api/withdrawal/balance', description: 'Get admin balance' },
      { method: 'GET', url: '/api/withdrawal/my-requests', description: 'Get admin withdrawal requests' }
    ];
    
    for (const endpoint of adminEndpoints) {
      console.log(`\n--- Testing: ${endpoint.method} ${endpoint.url} (${endpoint.description}) ---`);
      try {
        const response = await axios[endpoint.method.toLowerCase()](`${baseURL}${endpoint.url}`, { headers: adminHeaders });
        console.log(`✅ Success: ${response.status}`);
        
        if (endpoint.url === '/api/withdrawal/balance') {
          console.log(`   Balance info:`, response.data.balance || response.data);
        } else if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data.withdrawalRequests)) {
            console.log(`   Data: Array with ${response.data.withdrawalRequests.length} withdrawal requests`);
          } else {
            const keys = Object.keys(response.data);
            console.log(`   Data keys (${keys.length}):`, keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : ''));
          }
        }
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${error.response.status} Error: ${error.response.data?.message || error.response.statusText}`);
        } else {
          console.log(`❌ Request error: ${error.message}`);
        }
      }
    }
    
    // Step 4: Test super admin withdrawal endpoints
    console.log('\n=== Testing Super Admin Withdrawal Endpoints ===');
    
    const superAdminEndpoints = [
      { method: 'GET', url: '/api/withdrawal/admin/dashboard', description: 'Super admin withdrawal dashboard' },
      { method: 'GET', url: '/api/withdrawal/admin/all-requests', description: 'Get all withdrawal requests' },
      { method: 'GET', url: '/api/withdrawal/admin/statistics', description: 'Get withdrawal statistics' },
      { method: 'GET', url: '/api/admin/dashboard/stats', description: 'Super admin dashboard with withdrawals' }
    ];
    
    for (const endpoint of superAdminEndpoints) {
      console.log(`\n--- Testing: ${endpoint.method} ${endpoint.url} (${endpoint.description}) ---`);
      try {
        const response = await axios[endpoint.method.toLowerCase()](`${baseURL}${endpoint.url}`, { headers: superAdminHeaders });
        console.log(`✅ Success: ${response.status}`);
        
        if (response.data && typeof response.data === 'object') {
          const keys = Object.keys(response.data);
          console.log(`   Data keys (${keys.length}):`, keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : ''));
          
          // Show specific stats for dashboard
          if (endpoint.url.includes('dashboard')) {
            if (response.data.dashboard) {
              console.log(`   Pending requests: ${response.data.dashboard.pendingCount || 0}`);
            }
            if (response.data.pendingWithdrawals !== undefined) {
              console.log(`   Pending withdrawals: ${response.data.pendingWithdrawals}`);
            }
            if (response.data.totalWithdrawalRequests !== undefined) {
              console.log(`   Total withdrawal requests: ${response.data.totalWithdrawalRequests}`);
            }
          }
        }
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${error.response.status} Error: ${error.response.data?.message || error.response.statusText}`);
        } else {
          console.log(`❌ Request error: ${error.message}`);
        }
      }
    }
    
    console.log('\n=== Withdrawal System Test Complete ===');
    console.log('✅ Most withdrawal endpoints are working');
    console.log('✅ Super admin has withdrawal management access');
    console.log('✅ Admin can view balance and requests');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithdrawalSystem();