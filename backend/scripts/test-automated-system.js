const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function testAutomatedSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('../models/user.model');
    const PaymentLink = require('../models/paymentLinkModel');
    const InviteLink = require('../models/InviteLink');
    const Group = require('../models/group.model');
    const Admin = require('../models/admin.model');
    
    console.log('🎯 Testing Automated Payment Completion System');
    console.log('================================================\n');

    // Find the test user
    const user = await User.findOne({ phone: '+919624165190' });
    if (!user) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    console.log('👤 Test User:', user.email, user.phone);

    // Step 1: Create a test payment to simulate real scenario
    console.log('\n1. Creating Test Payment');
    console.log('-----------------------');

    const trialGroup = await Group.findOne({ name: 'trial plan' }).populate('createdBy');
    if (!trialGroup) {
      console.log('❌ Trial plan group not found');
      process.exit(1);
    }

    // Create a successful payment record
    const testPayment = new PaymentLink({
      userid: user._id,
      link_id: `TEST-${Date.now()}`,
      link_url: 'https://test-payment-link.com',
      customer_id: user.phone,
      phone: user.phone,
      amount: 99.00,
      plan_id: 'test-plan-id',
      plan_name: 'Trial Plan Subscription',
      status: 'SUCCESS',
      adminId: trialGroup.createdBy._id,
      groupId: trialGroup._id,
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      duration: 30 * 24 * 60 * 60, // 30 days in seconds
      adminCommission: 99.00,
      commissionRate: 100,
      purchase_datetime: new Date().toISOString()
    });

    await testPayment.save();
    console.log('✅ Created test payment:', testPayment._id);

    // Step 2: Test the automated payment completion API
    console.log('\n2. Testing Payment Completion API');
    console.log('----------------------------------');

    try {
      const response = await axios.get(`http://localhost:4000/api/payment-completion/${user._id}`, {
        timeout: 30000
      });

      console.log('✅ Payment Completion API Response:');
      console.log('Status:', response.status);
      console.log('Success:', response.data.success);
      console.log('Message:', response.data.message);
      
      if (response.data.channelAccess) {
        console.log(`📦 Channel Bundles: ${response.data.channelAccess.length}`);
        
        response.data.channelAccess.forEach((bundle, index) => {
          console.log(`\n   Bundle ${index + 1}: ${bundle.bundleInfo.name}`);
          console.log(`   Channels: ${bundle.channels.length}`);
          
          bundle.channels.forEach((channel, chIndex) => {
            console.log(`     Channel ${chIndex + 1}: ${channel.channelTitle}`);
            console.log(`     Invite Link: ${channel.inviteLink}`);
            console.log(`     Status: ${channel.isUsed ? 'USED' : 'UNUSED'}`);
          });
        });
      }

      console.log(`\n📊 Summary:`);
      console.log(`   Total Links: ${response.data.totalLinks || 0}`);
      console.log(`   Unused Links: ${response.data.unusedLinks || 0}`);
      console.log(`   Payment Status: ${response.data.payment.status}`);
      console.log(`   Expiry Date: ${response.data.payment.expiryDate}`);
      console.log(`   Days Remaining: ${response.data.payment.daysRemaining}`);

    } catch (apiError) {
      if (apiError.response?.status === 404) {
        console.log('⚠️ API returned 404 - User might not have completed payment yet');
        console.log('Response:', apiError.response.data);
      } else {
        console.log('❌ API Error:', apiError.message);
        if (apiError.response) {
          console.log('Status:', apiError.response.status);
          console.log('Data:', apiError.response.data);
        }
      }
    }

    // Step 3: Test user status API
    console.log('\n3. Testing User Status API');
    console.log('--------------------------');

    try {
      const statusResponse = await axios.get(`http://localhost:4000/api/payment-completion/${user._id}/status`, {
        timeout: 10000
      });

      console.log('✅ User Status API Response:');
      console.log('Has Active Subscription:', statusResponse.data.hasActiveSubscription);
      console.log('Needs Payment:', statusResponse.data.needsPayment);
      
      const status = statusResponse.data.status;
      console.log(`\n📊 Subscription Summary:`);
      console.log(`   Active Subscriptions: ${status.activeSubscriptions}`);
      console.log(`   Expired Subscriptions: ${status.expiredSubscriptions}`);
      console.log(`   Total Invite Links: ${status.totalInviteLinks}`);
      console.log(`   Unused Links: ${status.unusedLinks}`);

      if (status.subscriptions && status.subscriptions.length > 0) {
        console.log('\n   Active Subscriptions:');
        status.subscriptions.forEach((sub, index) => {
          console.log(`     ${index + 1}. ${sub.planName} (${sub.bundleName})`);
          console.log(`        Days Remaining: ${sub.daysRemaining}`);
          console.log(`        Channel Count: ${sub.channelCount}`);
          console.log(`        Unused Links: ${sub.unusedLinks}`);
        });
      }

    } catch (statusError) {
      console.log('❌ Status API Error:', statusError.message);
    }

    // Step 4: Verify database state
    console.log('\n4. Verifying Database State');
    console.log('---------------------------');

    const userPayments = await PaymentLink.find({ userid: user._id }).populate('groupId');
    console.log(`💰 User Payments: ${userPayments.length}`);
    
    const userLinks = await InviteLink.find({ userId: user._id }).populate('groupId');
    console.log(`🔗 User Invite Links: ${userLinks.length}`);

    userLinks.forEach((link, index) => {
      console.log(`   Link ${index + 1}:`);
      console.log(`     Channel: ${link.channelTitle}`);
      console.log(`     Bundle: ${link.groupId?.name}`);
      console.log(`     Status: ${link.is_used ? 'USED' : 'UNUSED'}`);
      console.log(`     Created: ${link.createdAt}`);
    });

    // Step 5: Demonstrate link regeneration
    console.log('\n5. Testing Link Regeneration');
    console.log('----------------------------');

    try {
      const regenResponse = await axios.post(`http://localhost:4000/api/payment-completion/${user._id}/regenerate`, {
        reason: 'testing_regeneration'
      }, {
        timeout: 30000
      });

      console.log('✅ Link Regeneration Response:');
      console.log('Success:', regenResponse.data.success);
      console.log('Message:', regenResponse.data.message);
      console.log('Regenerated:', regenResponse.data.regenerated || 0);
      
      if (regenResponse.data.newLinks) {
        console.log('\n   New Links Generated:');
        regenResponse.data.newLinks.forEach((link, index) => {
          console.log(`     ${index + 1}. ${link.channelTitle}: ${link.inviteLink}`);
        });
      }

    } catch (regenError) {
      console.log('❌ Regeneration Error:', regenError.message);
    }

    console.log('\n6. Frontend Integration Instructions');
    console.log('-----------------------------------');

    console.log(`
🌐 FRONTEND INTEGRATION:

For Payment Completion Page (/pc/...):
GET /api/payment-completion/{userId}

For User Dashboard:
GET /api/payment-completion/{userId}/status

For Link Regeneration:
POST /api/payment-completion/{userId}/regenerate

Example Frontend Code:
\`\`\`javascript
// Check if user has completed payment and get their links
const response = await fetch('/api/payment-completion/' + userId);
const data = await response.json();

if (!data.success) {
  // Show payment options
  showPaymentUI(data.showPaymentOptions);
} else {
  // Show channel access links
  data.channelAccess.forEach(bundle => {
    bundle.channels.forEach(channel => {
      showChannelLink(channel.channelTitle, channel.inviteLink, channel.isUsed);
    });
  });
}
\`\`\`

🔧 ADMIN INTEGRATION:
- Dashboard: GET /api/admin/link-management/dashboard
- Missing Links: GET /api/admin/link-management/users-missing-links  
- Generate Links: POST /api/admin/link-management/generate-user-links/{userId}
- Bulk Generate: POST /api/admin/link-management/bulk-generate-missing-links
    `);

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testAutomatedSystem();
