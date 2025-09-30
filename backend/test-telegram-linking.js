const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/automation');
    console.log('📊 Connected to MongoDB');

    // Create a test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      phone: '+919999999999',
      email: 'testuser@example.com',
      adminId: new mongoose.Types.ObjectId() // Dummy admin ID
    });

    await testUser.save();
    console.log(`✅ Created test user: ${testUser._id}`);
    return testUser;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return null;
  }
}

async function testTelegramLinking() {
  console.log('🚀 Testing Telegram account linking functionality...\n');

  try {
    // Create test user first
    const testUser = await createTestUser();
    if (!testUser) {
      throw new Error('Failed to create test user');
    }

    console.log('1. Testing account linking request...');
    
    // Test linking request
    const linkResponse = await axios.post(`${BASE_URL}/telegram/link-account`, {
      phone: testUser.phone,
      telegramUserId: '123456789'
    });

    console.log('✅ Link request successful:', linkResponse.data);
    const linkId = linkResponse.data.linkId;

    console.log('\n2. Testing verification with wrong code...');
    
    // Test with wrong verification code
    try {
      await axios.post(`${BASE_URL}/telegram/verify-link`, {
        linkId,
        verificationCode: '000000'
      });
    } catch (error) {
      console.log('✅ Correctly rejected wrong code:', error.response.data.error);
    }

    console.log('\n3. Testing verification with correct code...');
    
    // We need to get the correct verification code from the controller
    // For testing, let's modify the controller temporarily or use a different approach
    
    // Clean up test user
    await User.findByIdAndDelete(testUser._id);
    console.log('🧹 Cleaned up test user');

  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
  } finally {
    mongoose.disconnect();
  }
}

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  const tests = [
    {
      name: 'Link Account - Missing Parameters',
      method: 'POST',
      url: `${BASE_URL}/telegram/link-account`,
      data: {},
      expectError: true
    },
    {
      name: 'Link Account - Non-existent User',
      method: 'POST',
      url: `${BASE_URL}/telegram/link-account`,
      data: {
        phone: '+919999999998',
        telegramUserId: '123456789'
      },
      expectError: true
    },
    {
      name: 'Verify Link - Missing Parameters',
      method: 'POST',
      url: `${BASE_URL}/telegram/verify-link`,
      data: {},
      expectError: true
    },
    {
      name: 'Unlink Account - Missing Parameters',
      method: 'POST',
      url: `${BASE_URL}/telegram/unlink-account`,
      data: {},
      expectError: true
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios[test.method.toLowerCase()](test.url, test.data);
      
      if (test.expectError) {
        console.log('⚠️ Expected error but got success:', response.status);
      } else {
        console.log('✅ Success:', response.status);
      }
    } catch (error) {
      if (test.expectError) {
        console.log('✅ Expected error:', error.response?.status, error.response?.data?.error);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.error);
      }
    }
    console.log();
  }
}

// Check if server is running
axios.get(`${BASE_URL}/telegram/check-expiry/test`)
  .then(() => {
    console.log('✅ Server is running, starting tests...\n');
    return testEndpoints();
  })
  .catch(() => {
    console.log('❌ Server is not running on port 4000');
    console.log('Please make sure the server is running with: npm run dev');
    process.exit(1);
  });