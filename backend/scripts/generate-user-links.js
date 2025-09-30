const mongoose = require('mongoose');
require('dotenv').config();

async function generateLinksForUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('../models/user.model');
    const Group = require('../models/group.model');
    const Admin = require('../models/admin.model');
    const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');
    
    // Find the specific user
    const user = await User.findOne({ phone: '+919624165190' });
    
    if (!user) {
      console.log('❌ User with phone +919624165190 not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📱 Found user:', {
      id: user._id,
      email: user.email,
      phone: user.phone,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    });

    // Find the trial plan group
    const trialGroup = await Group.findOne({ name: 'trial plan' });
    
    if (!trialGroup) {
      console.log('❌ Trial plan group not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📦 Trial Plan Group:', {
      id: trialGroup._id,
      name: trialGroup.name,
      channels: trialGroup.channels.length
    });

    trialGroup.channels.forEach((channel, index) => {
      console.log(`   Channel ${index + 1}: ${channel.chatTitle} (${channel.chatId}) - Active: ${channel.isActive}`);
    });

    // Check if user already has links for this group
    const InviteLink = require('../models/InviteLink');
    const existingLinks = await InviteLink.find({ 
      userId: user._id, 
      groupId: trialGroup._id 
    });

    if (existingLinks.length > 0) {
      console.log(`\n🔗 User already has ${existingLinks.length} invite links for this group:`);
      existingLinks.forEach((link, index) => {
        console.log(`   Link ${index + 1}: ${link.is_used ? 'USED' : 'UNUSED'}`);
        console.log(`      URL: ${link.link}`);
        console.log(`      Channel: ${link.channelTitle}`);
        if (link.used_at) console.log(`      Used: ${link.used_at}`);
        console.log('');
      });
      
      console.log('💡 To regenerate links, delete existing ones or create new ones with different parameters');
      await mongoose.disconnect();
      return;
    }

    // Generate invite links for the trial plan bundle
    console.log('\n🚀 Generating invite links for trial plan bundle...');
    
    try {
      const result = await generateInviteLinksForChannelBundle(
        user._id,                    // userId 
        trialGroup._id,             // groupId
        7 * 24 * 60 * 60,          // duration: 7 days in seconds
        null,                      // paymentLinkId (null for test)
        null                       // planId (null for test)
      );
      
      console.log('\n🎉 Invite link generation completed!');
      console.log(`✅ Successfully generated: ${result.successCount} links`);
      console.log(`❌ Failed to generate: ${result.errorCount} links`);
      
      if (result.generatedLinks.length > 0) {
        console.log('\n🔗 Generated Links:');
        result.generatedLinks.forEach((link, index) => {
          console.log(`   ${index + 1}. Channel: ${link.channelTitle}`);
          console.log(`      Link: ${link.inviteLink}`);
          console.log(`      Link ID: ${link.linkId}`);
          console.log('');
        });
        
        console.log('🎯 SUCCESS! The user should now see working channel links instead of "undefined"');
        console.log('💡 These are one-time use links that expire when used or after 7 days');
      }
      
      if (result.errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. Channel: ${error.channelTitle} (${error.channelId})`);
          console.log(`      Error: ${error.error}`);
          console.log('');
        });
      }
      
    } catch (genError) {
      console.error('❌ Error generating invite links:', genError.message);
      console.error('Stack:', genError.stack);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Script completed');
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show usage info
console.log('🎯 Generate Invite Links for Test User');
console.log('=====================================');
console.log('This script will generate personalized invite links for user +919624165190');
console.log('for the "trial plan" bundle, simulating what happens after payment success.');
console.log('');

generateLinksForUser();
