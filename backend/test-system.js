const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:4000';
const TEST_ENDPOINTS = [
  '/health',
  '/api/kyc/all',
  '/api/digio/errors',
  '/api/plans/get'
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Test MONGODB connection
const testMONGODB = async () => {
  log(colors.blue, '\n🔍 Testing MONGODB Connection...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'MONGODB://localhost:27017/telegram-bot', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    log(colors.green, '✅ MONGODB connected successfully');
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    log(colors.blue, `📊 Found ${collections.length} collections:`);
    collections.forEach(col => {
      log(colors.yellow, `   - ${col.name}`);
    });
    
    return true;
  } catch (error) {
    log(colors.red, `❌ MONGODB connection failed: ${error.message}`);
    return false;
  }
};

// Test API endpoints
const testEndpoints = async () => {
  log(colors.blue, '\n🔍 Testing API Endpoints...');
  
  let allPassed = true;
  
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      log(colors.green, `✅ ${endpoint} - Status: ${response.status}`);
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          log(colors.yellow, `   📊 Data: ${response.data.length} items`);
        } else if (typeof response.data === 'object') {
          log(colors.yellow, `   📊 Data: ${Object.keys(response.data).length} properties`);
        }
      }
    } catch (error) {
      if (error.response) {
        log(colors.red, `❌ ${endpoint} - Status: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else {
        log(colors.red, `❌ ${endpoint} - Network Error: ${error.message}`);
      }
      allPassed = false;
    }
  }
  
  return allPassed;
};

// Test environment variables
const testEnvironment = () => {
  log(colors.blue, '\n🔍 Testing Environment Variables...');
  
  const requiredVars = [
    'MONGODB_URI',
    'BOT_TOKEN',
    'CHANNEL_ID', 
    'ADMIN_USER_IDS'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(colors.green, `✅ ${varName} - Present`);
    } else {
      log(colors.red, `❌ ${varName} - Missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
};

// Test Telegram bot configuration
const testTelegramBot = () => {
  log(colors.blue, '\n🔍 Testing Telegram Bot Configuration...');
  
  const botToken = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const adminIds = process.env.ADMIN_USER_IDS;
  
  if (botToken && channelId && adminIds) {
    log(colors.green, '✅ All Telegram bot variables present');
    log(colors.yellow, `   🤖 Bot Token: ${botToken.substring(0, 10)}...`);
    log(colors.yellow, `   📢 Channel ID: ${channelId}`);
    log(colors.yellow, `   👥 Admin IDs: ${adminIds}`);
    return true;
  } else {
    log(colors.red, '❌ Missing Telegram bot configuration');
    return false;
  }
};

// Test database models
const testModels = async () => {
  log(colors.blue, '\n🔍 Testing Database Models...');
  
  try {
    const User = require('./models/user.model');
    const PaymentLink = require('./models/paymentLinkModel');
    const Plan = require('./models/plan');
    const DigioError = require('./models/digioError.model');
    
    log(colors.green, '✅ All models loaded successfully');
    
    // Count documents
    const userCount = await User.countDocuments();
    const paymentCount = await PaymentLink.countDocuments();
    const planCount = await Plan.countDocuments();
    const errorCount = await DigioError.countDocuments();
    
    log(colors.yellow, `   👥 Users: ${userCount}`);
    log(colors.yellow, `   💳 Payments: ${paymentCount}`);
    log(colors.yellow, `   📋 Plans: ${planCount}`);
    log(colors.yellow, `   ❌ Digio Errors: ${errorCount}`);
    
    return true;
  } catch (error) {
    log(colors.red, `❌ Model test failed: ${error.message}`);
    return false;
  }
};

// Main test function
const runTests = async () => {
  log(colors.blue, '🚀 Starting System Tests...\n');
  
  const results = {
    environment: testEnvironment(),
    MONGODB: await testMONGODB(),
    models: await testModels(),
    telegram: testTelegramBot(),
    endpoints: await testEndpoints()
  };
  
  // Summary
  log(colors.blue, '\n📊 Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? colors.green : colors.red;
    log(color, `   ${test}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log(colors.green, '\n🎉 All tests passed! System is ready.');
  } else {
    log(colors.red, '\n⚠️  Some tests failed. Please check the issues above.');
  }
  
  // Cleanup
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    log(colors.blue, '🔌 MONGODB disconnected');
  }
  
  process.exit(allPassed ? 0 : 1);
};

// Run tests
runTests().catch(error => {
  log(colors.red, `❌ Test runner failed: ${error.message}`);
  process.exit(1);
}); 