const http = require('http');

console.log('\n🎯 COMPLETE FRONTEND-BACKEND ISSUE DIAGNOSIS & SOLUTION');
console.log('=' .repeat(80));

// Test 1: Check if backend server is responsive
function testServerHealth() {
  return new Promise((resolve, reject) => {
    console.log('\n1️⃣ TESTING BACKEND SERVER HEALTH');
    console.log('-'.repeat(50));

    const healthCheckOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(healthCheckOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Server is responsive on port 4000`);
        console.log(`   Status: ${res.statusCode}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Server not responding: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Server health check timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test 2: Check API endpoint directly
function testCheckPurchaseAPI() {
  return new Promise((resolve, reject) => {
    console.log('\n2️⃣ TESTING CHECK-PURCHASE API ENDPOINT');
    console.log('-'.repeat(50));

    const apiOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/user/check-purchase/+917020025010/68c2eb598a16ab4d15e8bc27',
      method: 'GET',
      timeout: 10000
    };

    console.log(`📡 Testing: http://localhost:4000${apiOptions.path}`);

    const req = http.request(apiOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 API Response Status: ${res.statusCode}`);
          console.log(`📋 Response Data:`);
          console.log(JSON.stringify(response, null, 2));

          if (response.success && response.hasPurchased) {
            console.log(`✅ SUCCESS: User subscription detected!`);
            console.log(`   - Payment Amount: ₹${response.subscription?.amount || 'N/A'}`);
            console.log(`   - Active Status: ${response.isActive ? 'Active' : 'Expired'}`);
            console.log(`   - Completion: ${response.completionStatus}`);
            resolve({ success: true, response });
          } else if (response.success && !response.hasPurchased) {
            console.log(`❌ ISSUE: API says user has no purchase`);
            console.log(`   Debug info: ${JSON.stringify(response.debug || {})}`);
            resolve({ success: false, response, issue: 'no_purchase_found' });
          } else {
            console.log(`❌ ISSUE: API error`);
            resolve({ success: false, response, issue: 'api_error' });
          }
        } catch (parseError) {
          console.log(`❌ ISSUE: Invalid JSON response`);
          console.log(`Raw response: ${data}`);
          resolve({ success: false, issue: 'invalid_json', data });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ISSUE: API request failed: ${err.message}`);
      resolve({ success: false, issue: 'request_failed', error: err.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ ISSUE: API request timeout`);
      req.destroy();
      resolve({ success: false, issue: 'timeout' });
    });

    req.end();
  });
}

// Test 3: Frontend behavior analysis
function analyzeFrontendBehavior(apiResult) {
  console.log('\n3️⃣ ANALYZING EXPECTED FRONTEND BEHAVIOR');
  console.log('-'.repeat(50));

  if (!apiResult.success) {
    console.log(`❌ Frontend Issue: API not working properly`);
    console.log(`   Problem: ${apiResult.issue}`);
    console.log(`   Expected: BundleCard should show "Already Purchased"`);
    console.log(`   Actual: BundleCard shows "Subscribe Now" buttons`);
    console.log(`   Root Cause: ${apiResult.issue}`);
    return;
  }

  const response = apiResult.response;
  console.log(`✅ API Response Analysis:`);
  console.log(`   hasPurchased: ${response.hasPurchased}`);
  console.log(`   isActive: ${response.isActive}`);
  console.log(`   completionStatus: ${response.completionStatus}`);

  console.log(`\n🖥️ Expected Frontend Behavior:`);
  if (response.hasPurchased) {
    console.log(`   ✅ Should show subscription status section`);
    console.log(`   ✅ Should hide "Subscribe Now" buttons`);
    if (response.isActive) {
      console.log(`   ✅ Should show "Extend Subscription" button`);
    } else {
      console.log(`   ✅ Should show "Renew Subscription" button`);
    }
    
    if (response.completionStatus === 'payment_only') {
      console.log(`   ⏳ Should show "Generate Channel Links" step`);
    } else if (response.completionStatus === 'paid_not_joined') {
      console.log(`   ✅ Should show Telegram channel links`);
    }

    console.log(`\n💾 localStorage should be restored:`);
    console.log(`   - paymentCompleted_maintest: "true"`);
    if (response.flowStatus?.hasInviteLinks) {
      console.log(`   - telegramLink_maintest: "${response.inviteLinks?.[0]?.link?.substring(0, 30)}..."`);
    }
  } else {
    console.log(`   ❌ Should show "Subscribe Now" buttons (current behavior is correct)`);
  }
}

// Test 4: Provide solutions
function provideSolutions(apiResult) {
  console.log('\n4️⃣ SOLUTIONS AND NEXT STEPS');
  console.log('-'.repeat(50));

  if (!apiResult.success) {
    switch (apiResult.issue) {
      case 'no_purchase_found':
        console.log(`🔧 SOLUTION: Database/API Issue`);
        console.log(`   1. Check if userDashboardRoutes.js has our latest fixes`);
        console.log(`   2. Verify database connection in backend`);
        console.log(`   3. Ensure User.find() query is working correctly`);
        console.log(`   4. Check if PaymentLink.findOne() query is working`);
        console.log(`   5. Restart backend server with fresh code`);
        break;
      case 'request_failed':
      case 'timeout':
        console.log(`🔧 SOLUTION: Server Connection Issue`);
        console.log(`   1. Start/restart backend server on port 4000`);
        console.log(`   2. Check for port conflicts`);
        console.log(`   3. Verify server.js is running correctly`);
        break;
      case 'invalid_json':
        console.log(`🔧 SOLUTION: Server Error`);
        console.log(`   1. Check server logs for errors`);
        console.log(`   2. Verify API route is properly defined`);
        console.log(`   3. Check for syntax errors in userDashboardRoutes.js`);
        break;
    }
    return;
  }

  console.log(`✅ API is working correctly!`);
  console.log(`\n🎯 Frontend Issues to Address:`);
  console.log(`   1. Browser cache - Clear browser cache and localStorage`);
  console.log(`   2. Hard refresh - Press Ctrl+Shift+R on the page`);
  console.log(`   3. Check developer console for JavaScript errors`);
  console.log(`   4. Verify BundleCard component is calling correct API endpoint`);
  console.log(`   5. Check if bundle ID is being passed correctly to API`);

  console.log(`\n📋 Test Steps:`);
  console.log(`   1. Open localhost:4173/pc/maintest in a fresh browser window`);
  console.log(`   2. Login with phone +917020025010`);
  console.log(`   3. Should see subscription status instead of Subscribe buttons`);
  console.log(`   4. Check browser developer tools Network tab for API calls`);
}

// Run all tests
async function runCompleteTest() {
  try {
    const serverHealthy = await testServerHealth();
    
    if (!serverHealthy) {
      console.log(`\n🚨 CRITICAL: Backend server is not running!`);
      console.log(`   Solution: Start backend server with: npm start`);
      return;
    }

    const apiResult = await testCheckPurchaseAPI();
    analyzeFrontendBehavior(apiResult);
    provideSolutions(apiResult);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPLETE DIAGNOSIS FINISHED');
    console.log('Use the solutions above to fix remaining issues.');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Start the comprehensive test
runCompleteTest();
