const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const InviteLink = require('./models/InviteLink');
require('dotenv').config();

async function debugFrontendIssue() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('🔌 Connected to database');

    // Test the exact scenario from the screenshot
    const testPhone = '+917020025010';
    
    console.log('\n🐛 DEBUGGING FRONTEND SUBSCRIPTION DETECTION');
    console.log('=' .repeat(70));
    console.log(`📱 Phone: ${testPhone}`);
    console.log(`🌐 URL: localhost:4173/pc/maintest`);

    // Step 1: Find the bundle by route 'maintest'
    console.log('\n📦 Finding bundle by route "maintest"');
    const bundleByRoute = await Group.findOne({ 
      $or: [
        { customRoute: 'maintest' },
        { route: 'maintest' },
        { publicRoute: 'maintest' },
        { slug: 'maintest' }
      ]
    });
    
    if (!bundleByRoute) {
      console.log('❌ No bundle found with route "maintest"');
      
      // Show all available bundles
      const allBundles = await Group.find({}).select('_id name customRoute route publicRoute slug');
      console.log('\n📋 Available bundles:');
      allBundles.forEach((b, i) => {
        console.log(`   ${i+1}. ${b.name} - ID: ${b._id}`);
        console.log(`      customRoute: ${b.customRoute || 'undefined'}`);
        console.log(`      route: ${b.route || 'undefined'}`);
        console.log(`      publicRoute: ${b.publicRoute || 'undefined'}`);
        console.log(`      slug: ${b.slug || 'undefined'}`);
      });
      
      // Test with first available bundle
      if (allBundles.length > 0) {
        console.log(`\n🔄 Testing with first available bundle: ${allBundles[0].name}`);
        await testBundleSubscription(testPhone, allBundles[0]);
      }
    } else {
      console.log(`✅ Found bundle: ${bundleByRoute.name} (ID: ${bundleByRoute._id})`);
      await testBundleSubscription(testPhone, bundleByRoute);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

async function testBundleSubscription(phone, bundle) {
  console.log(`\n🧪 TESTING SUBSCRIPTION FOR BUNDLE: ${bundle.name}`);
  console.log('-'.repeat(50));
  
  // Step 1: Find users
  const phoneFormats = [phone];
  if (phone.startsWith('+')) {
    phoneFormats.push(phone.substring(1));
  } else {
    phoneFormats.push('+' + phone);
  }
  
  console.log(`📱 Searching for users with phone formats: ${phoneFormats.join(', ')}`);
  const allUsers = await User.find({ phone: { $in: phoneFormats } });
  console.log(`👤 Found ${allUsers.length} users with this phone`);
  
  if (allUsers.length === 0) {
    console.log('❌ No users found - this is the problem!');
    return;
  }
  
  const allUserIds = allUsers.map(u => u._id);
  
  // Step 2: Check payments
  console.log(`\n💳 Checking payments for bundle ${bundle._id}:`);
  const successfulPayment = await PaymentLink.findOne({
    userid: { $in: allUserIds },
    groupId: bundle._id,
    status: 'SUCCESS'
  }).sort({ createdAt: -1 });
  
  if (!successfulPayment) {
    console.log('❌ No successful payment found - this is the problem!');
    
    // Check if there are any payments for these users
    const anyPayments = await PaymentLink.find({
      userid: { $in: allUserIds }
    }).populate('groupId');
    
    console.log(`📊 Total payments found for this phone: ${anyPayments.length}`);
    anyPayments.forEach((payment, i) => {
      console.log(`   ${i+1}. Bundle: ${payment.groupId?.name} (${payment.groupId?._id})`);
      console.log(`      Amount: ₹${payment.amount}, Status: ${payment.status}`);
      console.log(`      User: ${payment.userid}`);
    });
    return;
  }
  
  console.log(`✅ Found successful payment:`);
  console.log(`   Payment ID: ${successfulPayment._id}`);
  console.log(`   Amount: ₹${successfulPayment.amount}`);
  console.log(`   Date: ${successfulPayment.createdAt}`);
  console.log(`   Expiry: ${successfulPayment.expiry_date}`);
  console.log(`   User ID: ${successfulPayment.userid}`);
  
  // Step 3: Check if subscription is active
  const now = new Date();
  const isActive = successfulPayment.expiry_date > now;
  console.log(`⏰ Subscription active: ${isActive ? '✅ YES' : '❌ EXPIRED'}`);
  
  // Step 4: Get invite links
  console.log(`\n🔗 Checking invite links:`);
  const inviteLinks = await InviteLink.find({
    paymentLinkId: successfulPayment._id
  });
  
  console.log(`📊 Found ${inviteLinks.length} invite links`);
  inviteLinks.forEach((link, i) => {
    console.log(`   ${i+1}. Channel: ${link.channelTitle || 'Unknown'}`);
    console.log(`      Link: ${link.link?.substring(0, 50)}...`);
    console.log(`      Used: ${link.is_used ? 'Yes' : 'No'}`);
  });
  
  // Step 5: Determine completion status
  const hasInviteLinks = inviteLinks.length > 0;
  let completionStatus = 'payment_only';
  if (hasInviteLinks) {
    completionStatus = 'paid_not_joined';
  }
  
  console.log(`\n🎯 Completion Status: ${completionStatus}`);
  
  // Step 6: Simulate exact API response
  console.log(`\n📡 SIMULATED API RESPONSE:`);
  console.log(`URL: /api/user/check-purchase/${phone}/${bundle._id}`);
  
  const apiResponse = {
    success: true,
    hasPurchased: true,
    isActive: isActive,
    completionStatus: completionStatus,
    canContinueFlow: completionStatus !== 'fully_completed' && isActive,
    subscription: {
      id: successfulPayment._id,
      planName: successfulPayment.plan_name,
      amount: successfulPayment.amount,
      purchaseDate: successfulPayment.createdAt,
      expiryDate: successfulPayment.expiry_date,
      status: isActive ? 'active' : 'expired'
    },
    flowStatus: {
      paymentCompleted: true,
      hasInviteLinks: hasInviteLinks,
      hasJoinedChannels: false,
      inviteLinkCount: inviteLinks.length,
      channelMembershipCount: 0
    },
    inviteLinks: inviteLinks.map(link => ({
      id: link._id,
      link: link.link,
      status: link.status,
      expires_at: link.expires_at,
      is_used: link.is_used,
      used_at: link.used_at
    }))
  };
  
  console.log(JSON.stringify(apiResponse, null, 2));
  
  // Step 7: Check what frontend should do
  console.log(`\n🖥️ FRONTEND BEHAVIOR ANALYSIS:`);
  console.log(`Should show subscription status: ${apiResponse.hasPurchased ? '✅ YES' : '❌ NO'}`);
  console.log(`Should show extend/renew button: ${apiResponse.hasPurchased && isActive ? '✅ YES' : '❌ NO'}`);
  console.log(`Should show invite links: ${hasInviteLinks ? '✅ YES' : '❌ NO'}`);
  console.log(`Step completion restoration needed: ${apiResponse.hasPurchased ? '✅ YES' : '❌ NO'}`);
  
  if (apiResponse.hasPurchased) {
    console.log(`\n💾 localStorage should be restored with:`);
    const bundleRoute = bundle.route || bundle.publicRoute || bundle.slug || 'default';
    console.log(`   paymentCompleted_${bundleRoute}: "true"`);
    if (hasInviteLinks) {
      console.log(`   telegramLink_${bundleRoute}: "${inviteLinks[0].link}"`);
    }
  }
}

debugFrontendIssue();
