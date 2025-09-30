const http = require('http');

console.log('\n🔍 TESTING SERVER DATABASE CONNECTION');
console.log('=' .repeat(60));

// Test endpoint to create that would show us what's in the server's database
function testDatabaseViaAPI() {
  return new Promise((resolve) => {
    console.log('\n📊 Testing server database access...');
    
    // Create a simple test to check what users are in the server's database
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/user/debug-users',  // This endpoint doesn't exist, but that's OK
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response Status: ${res.statusCode}`);
        if (res.statusCode === 404) {
          console.log('❌ Debug endpoint not found (expected)');
        } else {
          console.log(`Response: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end();
  });
}

// Let me create a simpler approach: test the actual dashboard endpoint
function testDashboardAPI() {
  return new Promise((resolve) => {
    console.log('\n📊 Testing dashboard endpoint for database content...');
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/user/dashboard/+917020025010',
      method: 'GET',
      timeout: 10000
    };

    console.log(`📡 Testing: http://localhost:4000${options.path}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 Dashboard API Response Status: ${res.statusCode}`);
          console.log(`📋 Response:`, JSON.stringify(response, null, 2));
          
          if (response.success && response.data) {
            console.log(`✅ Dashboard API works - user found in server's database`);
            console.log(`   User: ${response.data.user?.firstName} ${response.data.user?.lastName}`);
            console.log(`   Phone: ${response.data.user?.phone}`);
            console.log(`   Subscriptions: ${response.data.subscriptions?.total || 0}`);
            resolve(true);
          } else {
            console.log(`❌ Dashboard API says user not found in server's database`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ Dashboard API returned invalid JSON`);
          console.log(`Raw response: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Dashboard API request failed: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Dashboard API request timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runDatabaseTest() {
  console.log(`🎯 Goal: Verify if server can access user data`);
  console.log(`📱 Test Phone: +917020025010`);
  
  await testDatabaseViaAPI();
  const dashboardWorks = await testDashboardAPI();
  
  console.log('\n📋 ANALYSIS:');
  if (dashboardWorks) {
    console.log(`✅ Server CAN access user data via dashboard API`);
    console.log(`❌ But check-purchase API says "User not found"`);
    console.log(`🔍 This suggests an issue SPECIFICALLY in check-purchase route`);
    console.log(`\n🔧 SOLUTION:`);
    console.log(`   1. The check-purchase route may have different query logic`);
    console.log(`   2. May be looking for different fields or using wrong query`);
    console.log(`   3. Need to check the exact query in check-purchase route`);
  } else {
    console.log(`❌ Server CANNOT access user data`);
    console.log(`🔍 This suggests server is connecting to different/empty database`);
    console.log(`\n🔧 SOLUTION:`);
    console.log(`   1. Check DATABASE_URL environment variable`);
    console.log(`   2. Verify MongoDB connection string`);
    console.log(`   3. Check if server is connecting to test vs production DB`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Database test completed');
}

runDatabaseTest();
