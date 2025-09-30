const mongoose = require('mongoose');
const { generateInviteLinksForChannelBundle, convertDurationToSeconds } = require('./services/generateOneTimeInviteLink');
require('dotenv').config();

async function testApiFlow() {
  try {
    // Mimic the exact API route flow
    console.log('🎯 Testing API flow...');
    
    const req = {
      body: {
        userId: "test123",
        groupId: "68b32118bd6245ad4017b947", 
        duration: "month",
        paymentLinkId: null,
        planId: "test_plan"
      }
    };
    
    const { userId, groupId, duration = '30', paymentLinkId, planId } = req.body;
    
    console.log(`🎯 Generating bundle-specific invite links:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Group ID: ${groupId}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Payment Link ID: ${paymentLinkId}`);
    console.log(`   Plan ID: ${planId}`);
    
    if (!userId || !groupId) {
      throw new Error("User ID and Group ID are required");
    }
    
    // Convert duration to seconds
    const durationInSeconds = convertDurationToSeconds(duration);
    console.log(`   Duration in seconds: ${durationInSeconds}`);
    
    // This is where it likely fails - let's test step by step
    console.log('\n🔍 Step 1: Testing database connection...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('✅ Database connected');
    
    console.log('\n🔍 Step 2: Testing Group model import...');
    const Group = require('./models/group.model');
    console.log('✅ Group model imported');
    
    console.log('\n🔍 Step 3: Testing group lookup...');
    const channelBundle = await Group.findById(groupId);
    console.log('✅ Group lookup result:', channelBundle ? `Found: ${channelBundle.name}` : 'Not found');
    
    if (!channelBundle) {
      throw new Error('Channel bundle not found in step-by-step test');
    }
    
    console.log('\n🔍 Step 4: Testing service function call...');
    
    // Generate invite links for all channels in the bundle
    const result = await generateInviteLinksForChannelBundle(
      userId,
      groupId,
      durationInSeconds,
      paymentLinkId,
      planId
    );
    
    console.log(`✅ Generated ${result.successCount} invite links for bundle`);
    
    // Return the first invite link for display (or all links if needed)
    const primaryLink = result.generatedLinks?.[0]?.inviteLink;
    
    const response = {
      success: true,
      link: primaryLink, // Primary link for UI display
      links: result.generatedLinks, // All generated links
      bundleInfo: result.channelBundle,
      summary: {
        totalChannels: result.totalChannels,
        successCount: result.successCount,
        errorCount: result.errorCount
      },
      errors: result.errors
    };
    
    console.log('\n✅ Final API response:', response);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ API flow error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testApiFlow();
