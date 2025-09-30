const http = require('http');
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Group = require('./models/group.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function testWithCorrectBundle() {
  console.log('\n🔍 FINDING CORRECT BUNDLE ID AND TESTING API');
  console.log('=' .repeat(70));

  try {
    // Connect to cloud database (same as server)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to cloud database');

    const targetPhone = '+917020025010';

    // Step 1: Find the user in cloud DB
    const cloudUser = await User.findOne({ phone: targetPhone });
    if (!cloudUser) {
      console.log('❌ User not found in cloud database');
      return;
    }
    
    console.log(`👤 Found user in cloud: ${cloudUser._id}`);

    // Step 2: Find payments for this user
    const payments = await PaymentLink.find({ userid: cloudUser._id }).populate('groupId');
    console.log(`💳 Found ${payments.length} payments for user:`);
    
    payments.forEach((payment, i) => {
      console.log(`   ${i + 1}. ₹${payment.amount} - ${payment.status}`);
      console.log(`      Bundle: ${payment.groupId?.name} (${payment.groupId?._id})`);
      console.log(`      Custom Route: ${payment.groupId?.customRoute}`);
    });

    if (payments.length === 0) {
      console.log('❌ No payments found for user in cloud');
      await mongoose.connection.close();
      return;
    }

    // Step 3: Find the bundle with customRoute 'maintest' or similar
    let targetBundle = null;
    let targetPayment = null;

    // First, look for a bundle with customRoute containing 'maintest'
    for (const payment of payments) {
      if (payment.groupId?.customRoute?.includes('maintest')) {
        targetBundle = payment.groupId;
        targetPayment = payment;
        console.log(`🎯 Found target bundle with maintest route:`);
        console.log(`   Bundle ID: ${targetBundle._id}`);
        console.log(`   Custom Route: ${targetBundle.customRoute}`);
        console.log(`   Payment: ₹${targetPayment.amount} - ${targetPayment.status}`);
        break;
      }
    }

    // If no maintest route found, use the first payment
    if (!targetBundle && payments.length > 0) {
      targetPayment = payments[0];
      targetBundle = targetPayment.groupId;
      console.log(`🔄 Using first available bundle:`);
      console.log(`   Bundle ID: ${targetBundle._id}`);
      console.log(`   Custom Route: ${targetBundle.customRoute}`);
    }

    if (!targetBundle) {
      console.log('❌ No suitable bundle found');
      await mongoose.connection.close();
      return;
    }

    // Step 4: Test the API with correct bundle ID
    console.log('\n🧪 TESTING API WITH CORRECT BUNDLE ID');
    console.log('-'.repeat(50));
    
    const testApiUrl = `/api/user/check-purchase/${targetPhone}/${targetBundle._id}`;
    console.log(`📡 Testing API: http://localhost:4000${testApiUrl}`);

    await mongoose.connection.close();

    // Test the API endpoint
    const apiResult = await testAPI(testApiUrl);
    
    console.log('\n📋 FINAL RESULTS:');
    console.log('-'.repeat(30));
    
    if (apiResult.success && apiResult.response.hasPurchased) {
      console.log('✅ SUCCESS! API is working correctly!');
      console.log(`💰 Payment Amount: ₹${apiResult.response.subscription?.amount}`);
      console.log(`📅 Purchase Date: ${apiResult.response.subscription?.purchaseDate?.split('T')[0]}`);
      console.log(`⏰ Active: ${apiResult.response.isActive ? 'Yes' : 'Expired'}`);
      console.log(`🎯 Completion Status: ${apiResult.response.completionStatus}`);
      
      console.log('\n🎉 FRONTEND SHOULD NOW WORK!');
      console.log('Next steps:');
      console.log(`1. Open localhost:4173/pc/maintest (or /pc/${targetBundle.customRoute})`);
      console.log('2. Login with phone +917020025010');
      console.log('3. Should see subscription status instead of Subscribe buttons');
      console.log('4. Should see Extend/Renew button');
      console.log('5. Steps should be restored from database');
      
    } else if (apiResult.success && !apiResult.response.hasPurchased) {
      console.log('❌ API found user but no purchase');
      console.log(`Debug: ${JSON.stringify(apiResult.response.debug || {})}`);
    } else {
      console.log('❌ API test failed');
      console.log(`Issue: ${apiResult.issue}`);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

function testAPI(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 API Response Status: ${res.statusCode}`);
          console.log(`📋 Response:`, JSON.stringify(response, null, 2));
          
          if (response.success && response.hasPurchased) {
            resolve({ success: true, response });
          } else {
            resolve({ success: false, response, issue: 'no_purchase_found' });
          }
        } catch (e) {
          resolve({ success: false, issue: 'invalid_json', data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, issue: 'request_failed', error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, issue: 'timeout' });
    });

    req.end();
  });
}

testWithCorrectBundle();
