const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function testEnhancedSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('../models/user.model');
    const Group = require('../models/group.model');
    const Admin = require('../models/admin.model');
    const InviteLink = require('../models/InviteLink');
    
    console.log('🎯 Enhanced System Analysis');
    console.log('============================\n');
    
    // 1. Test the /api/groups/active endpoint that the enhanced bot uses
    console.log('1. Testing Enhanced Bot API Endpoint');
    console.log('-------------------------------------');
    
    try {
      const response = await axios.get('http://localhost:4000/api/groups/active', { timeout: 10000 });
      console.log('✅ /api/groups/active endpoint accessible');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      const activeChannels = response.data.active_channels || [];
      console.log(`📊 Active channels returned: ${activeChannels.length}`);
      
      activeChannels.forEach((channel, index) => {
        console.log(`\n   Channel ${index + 1}:`);
        console.log(`     Name: ${channel.name}`);
        console.log(`     Channel ID: ${channel.channel_id}`);
        console.log(`     Chat Title: ${channel.chat_title}`);
        console.log(`     Join Link: ${channel.join_link || 'UNDEFINED'} ⬅️ THIS IS THE ISSUE!`);
        console.log(`     Is Legacy: ${channel.is_legacy}`);
        console.log(`     Admin ID: ${channel.admin_id}`);
        console.log(`     Group ID: ${channel.group_id}`);
      });
      
    } catch (apiError) {
      console.log('❌ Failed to call /api/groups/active:', apiError.message);
    }
    
    console.log('\n2. Checking User\'s Personalized Links');
    console.log('-------------------------------------');
    
    // Find the specific user
    const user = await User.findOne({ phone: '+919624165190' });
    if (user) {
      console.log('📱 User found:', user.email);
      
      // Check their personalized invite links
      const userLinks = await InviteLink.find({ userId: user._id }).populate('groupId');
      console.log(`🔗 User's personalized links: ${userLinks.length}`);
      
      if (userLinks.length > 0) {
        userLinks.forEach((link, index) => {
          console.log(`\n   Link ${index + 1}:`);
          console.log(`     Channel: ${link.channelTitle}`);
          console.log(`     URL: ${link.link}`);
          console.log(`     Group: ${link.groupId?.name}`);
          console.log(`     Status: ${link.is_used ? 'USED' : 'UNUSED'}`);
          console.log(`     Created: ${link.createdAt}`);
        });
      } else {
        console.log('   ❌ No personalized links found for this user!');
      }
    }
    
    console.log('\n3. Understanding the Issue');
    console.log('-------------------------');
    
    console.log('🔍 ROOT CAUSE ANALYSIS:');
    console.log('');
    console.log('The Enhanced Bot expects personalized invite links from the API endpoint');
    console.log('/api/groups/active, but this endpoint returns channel bundle info with');
    console.log('generic channel invite links, NOT user-specific links.');
    console.log('');
    console.log('THE REAL ISSUE:');
    console.log('• Enhanced bot loads channels from /api/groups/active');
    console.log('• This endpoint returns join_link from channel.joinLink field');  
    console.log('• But users need PERSONALIZED links from InviteLink collection');
    console.log('• The frontend/system is showing "undefined" because it\'s trying to');
    console.log('  show personalized links that don\'t exist for unpaid users');
    
    console.log('\n4. How It Should Work');
    console.log('--------------------');
    
    console.log('🎯 CORRECT FLOW:');
    console.log('1. User pays → handlePaymentSuccess() generates personalized links');
    console.log('2. User receives email with personalized invite link');
    console.log('3. User clicks personalized link → Bot validates via /api/telegram/validate-join');
    console.log('4. Bot approves join → Immediately revokes link (one-time use)');
    console.log('5. User gets access for subscription period');
    
    console.log('\n5. Frontend Issue');
    console.log('-----------------');
    
    console.log('🚨 FRONTEND PROBLEM:');
    console.log('The frontend is probably trying to show channel links before payment');
    console.log('completion, which should show payment buttons, not invite links!');
    console.log('');
    console.log('SOLUTION: Frontend should check:');
    console.log('• Has user completed payment? → Show personalized invite links');
    console.log('• Has user NOT paid? → Show payment options, not "undefined" links');
    
    await mongoose.disconnect();
    console.log('\n✅ Analysis completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEnhancedSystem();
