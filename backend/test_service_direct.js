const mongoose = require('mongoose');
const { generateInviteLinksForChannelBundle } = require('./services/generateOneTimeInviteLink');
require('dotenv').config();

async function testServiceDirect() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    const testParams = {
      userId: "test123",
      groupId: "68b32118bd6245ad4017b947", 
      duration: 2592000, // 30 days in seconds
      paymentLinkId: null,
      planId: "test_plan"
    };
    
    console.log('🎯 Testing service function directly with params:', testParams);
    
    const result = await generateInviteLinksForChannelBundle(
      testParams.userId,
      testParams.groupId,
      testParams.duration,
      testParams.paymentLinkId,
      testParams.planId
    );
    
    console.log('✅ Service function result:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Service function error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testServiceDirect();
