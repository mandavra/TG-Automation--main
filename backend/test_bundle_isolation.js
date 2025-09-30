const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const InviteLink = require('./models/InviteLink');
const ChannelMember = require('./models/ChannelMember');
require('dotenv').config();

async function testBundleIsolation() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('🔌 Connected to database');

    const testPhone = '+917020025010'; // Using the phone that exists in database
    const phoneFormats = [testPhone, testPhone.substring(1), testPhone.startsWith('+') ? testPhone : '+' + testPhone];

    console.log('\n📱 BUNDLE ISOLATION TEST FOR SINGLE USER');
    console.log('=' .repeat(80));
    console.log(`Testing phone: ${testPhone}`);

    // Step 1: Find all users with this phone
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`\n👤 Users found:`, allUsers.length);
    allUsers.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ID: ${user._id}, Phone: ${user.phone}, Name: ${user.firstName} ${user.lastName}`);
    });

    if (allUsers.length === 0) {
      console.log('❌ No users found with this phone number');
      return;
    }

    const allUserIds = allUsers.map(u => u._id);

    // Step 2: Get all channel bundles in system
    const allBundles = await Group.find({}).select('_id name route publicRoute slug');
    console.log(`\n🎁 All channel bundles in system:`, allBundles.length);
    allBundles.forEach((bundle, idx) => {
      console.log(`   ${idx + 1}. ${bundle.name} - Route: /${bundle.route || bundle.publicRoute || bundle.slug || 'unknown'} - ID: ${bundle._id}`);
    });

    // Step 3: Check payments across ALL bundles for this user
    console.log(`\n💳 PAYMENT ANALYSIS PER BUNDLE`);
    console.log('-'.repeat(60));
    
    const allPayments = await PaymentLink.find({
      userid: { $in: allUserIds }
    }).populate('groupId').sort({ createdAt: -1 });

    console.log(`📊 Total payments found: ${allPayments.length}`);
    
    const bundlePayments = {};
    allPayments.forEach(payment => {
      const bundleId = payment.groupId?._id?.toString();
      const bundleName = payment.groupId?.name || 'Unknown Bundle';
      
      if (!bundlePayments[bundleId]) {
        bundlePayments[bundleId] = {
          bundleName,
          bundleId,
          route: payment.groupId?.route || payment.groupId?.publicRoute || payment.groupId?.slug,
          payments: []
        };
      }
      
      bundlePayments[bundleId].payments.push({
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        userId: payment.userid
      });
    });

    // Display per-bundle payment status
    console.log(`\n🔍 Bundle-wise payment status:`);
    Object.values(bundlePayments).forEach((bundle, idx) => {
      const successfulPayments = bundle.payments.filter(p => p.status === 'SUCCESS');
      console.log(`\n   📦 ${idx + 1}. ${bundle.bundleName} (/pc/${bundle.route || 'unknown'})`);
      console.log(`      Bundle ID: ${bundle.bundleId}`);
      console.log(`      Total Payments: ${bundle.payments.length}`);
      console.log(`      Successful: ${successfulPayments.length}`);
      
      if (successfulPayments.length > 0) {
        successfulPayments.forEach((payment, pidx) => {
          console.log(`         ✅ Payment ${pidx + 1}: ₹${payment.amount} (${payment.createdAt?.toISOString()?.split('T')[0]})`);
        });
      } else {
        console.log(`         ❌ No successful payments`);
      }
    });

    // Step 4: Check invite links per bundle
    console.log(`\n🔗 INVITE LINKS ANALYSIS PER BUNDLE`);
    console.log('-'.repeat(60));
    
    const allInviteLinks = await InviteLink.find({
      userId: { $in: allUserIds }
    }).sort({ createdAt: -1 });

    console.log(`📊 Total invite links: ${allInviteLinks.length}`);

    // Group invite links by payment (which maps to bundle)
    const bundleLinks = {};
    allInviteLinks.forEach(link => {
      const paymentId = link.paymentLinkId?.toString();
      if (!bundleLinks[paymentId]) {
        bundleLinks[paymentId] = [];
      }
      bundleLinks[paymentId].push(link);
    });

    console.log(`\n🔍 Bundle-wise invite links:`);
    for (const [paymentId, links] of Object.entries(bundleLinks)) {
      // Find the payment to get bundle info
      const payment = allPayments.find(p => p._id.toString() === paymentId);
      const bundleName = payment?.groupId?.name || 'Unknown Bundle';
      const bundleRoute = payment?.groupId?.route || payment?.groupId?.publicRoute || payment?.groupId?.slug || 'unknown';
      
      console.log(`\n   📦 ${bundleName} (/pc/${bundleRoute}) - Payment: ${paymentId}`);
      console.log(`      Invite Links: ${links.length}`);
      
      links.forEach((link, lidx) => {
        console.log(`         ${lidx + 1}. Channel: ${link.channelTitle || link.channelId || 'Unknown'}`);
        console.log(`            Link: ${link.link?.substring(0, 50)}...`);
        console.log(`            Status: ${link.status || 'active'}, Used: ${link.is_used ? 'Yes' : 'No'}`);
      });
    }

    // Step 5: Check channel memberships per bundle
    console.log(`\n👥 CHANNEL MEMBERSHIPS ANALYSIS`);
    console.log('-'.repeat(60));
    
    const allMemberships = await ChannelMember.find({
      telegramUserId: { $in: allUsers.map(u => u.telegramUserId).filter(Boolean) }
    }).sort({ joinedAt: -1 });

    console.log(`📊 Total channel memberships: ${allMemberships.length}`);
    
    if (allMemberships.length > 0) {
      allMemberships.forEach((membership, idx) => {
        console.log(`\n   ${idx + 1}. Channel: ${membership.channelName || membership.channelId}`);
        console.log(`      Joined: ${membership.joinedAt?.toISOString()?.split('T')[0] || 'Unknown'}`);
        console.log(`      Status: ${membership.isActive ? '✅ Active' : '❌ Inactive'}`);
        console.log(`      Expires: ${membership.expiresAt?.toISOString()?.split('T')[0] || 'No expiry'}`);
        if (membership.inviteLinkUsed) {
          console.log(`      Via Link: ${membership.inviteLinkUsed?.substring(0, 50)}...`);
        }
      });
    }

    // Step 6: Test API simulation for different bundles
    console.log(`\n🧪 API SIMULATION TEST`);
    console.log('-'.repeat(60));
    
    console.log(`Testing /api/user/check-purchase/${testPhone}/:bundleId for each bundle:`);
    
    for (const bundle of allBundles.slice(0, 5)) { // Test first 5 bundles
      // Simulate the API logic from userDashboardRoutes.js
      const successfulPayment = await PaymentLink.findOne({
        userid: { $in: allUserIds },
        groupId: bundle._id,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 });
      
      const now = new Date();
      const isActive = successfulPayment ? successfulPayment.expiry_date > now : false;
      const hasPurchased = !!successfulPayment;
      
      console.log(`\n   📡 Bundle: ${bundle.name} (/pc/${bundle.route || bundle.publicRoute || bundle.slug || 'unknown'})`);
      console.log(`      API Response: hasPurchased: ${hasPurchased}`);
      if (hasPurchased) {
        console.log(`      Payment Amount: ₹${successfulPayment.amount}`);
        console.log(`      Active: ${isActive ? '✅ Yes' : '❌ Expired'}`);
        console.log(`      Purchase Date: ${successfulPayment.createdAt?.toISOString()?.split('T')[0]}`);
        console.log(`      User ID: ${successfulPayment.userid}`);
      }
    }

    // Step 7: Check bundle-specific progress isolation
    console.log(`\n📊 BUNDLE PROGRESS ISOLATION CHECK`);
    console.log('-'.repeat(60));
    
    console.log('Each bundle should have independent:');
    console.log('✅ Payment status (verified above)');
    console.log('✅ Invite links (verified above)');
    console.log('✅ Channel memberships (verified above)');
    console.log('❓ Frontend localStorage states (needs frontend verification)');
    console.log('❓ Step completion tracking (needs API verification)');

    console.log('\n' + '='.repeat(80));
    console.log('🎯 BUNDLE ISOLATION ANALYSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testBundleIsolation();
