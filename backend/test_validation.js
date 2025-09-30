const axios = require('axios');
const mongoose = require('mongoose');
const InviteLink = require('./models/InviteLink');
require('dotenv').config();

async function testValidation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    // Get the most recent invite link
    const recentLink = await InviteLink.findOne({
      is_used: false,
      expires_at: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!recentLink) {
      console.log('❌ No recent unused invite links found');
      process.exit(1);
    }
    
    console.log('📋 Testing with recent invite link:');
    console.log('   Link:', recentLink.link);
    console.log('   Channel:', recentLink.channelTitle, '(', recentLink.channelId, ')');
    console.log('   Created:', recentLink.createdAt);
    console.log('   Expires:', recentLink.expires_at);
    console.log('');
    
    // Test backend validation
    const validationData = {
      invite_link: recentLink.link,
      telegram_user_id: '123456789', // Test user ID
      channel_id: recentLink.channelId,
      user_info: {
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      },
      channel_info: {
        admin_id: 'test_admin',
        group_id: recentLink.groupId,
        channel_name: recentLink.channelTitle
      }
    };
    
    console.log('📡 Testing backend validation...');
    console.log('   Request body:', validationData);
    
    const response = await axios.post('http://localhost:4000/api/telegram/validate-join', validationData);
    
    console.log('✅ Validation response:', response.data);
    
    if (response.data.approve) {
      console.log('🎉 Backend would APPROVE the join request');
    } else {
      console.log('❌ Backend would REJECT the join request');
      console.log('   Reason:', response.data.reason);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   Response error:', error.response.data);
    }
    process.exit(1);
  }
}

testValidation();
