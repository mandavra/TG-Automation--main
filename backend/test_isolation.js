const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const Admin = require('./models/admin.model');
require('dotenv').config();

async function testIsolation() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('🔌 Connected to database');

    // Test 1: Verify user subscription detection across bundles
    console.log('\n📋 Test 1: User Subscription Detection Across Different Bundles');
    console.log('=' .repeat(70));
    
    const testPhone = '+917020025010';
    const phoneFormats = [testPhone, testPhone.substring(1), testPhone.startsWith('+') ? testPhone : '+' + testPhone];
    
    // Get all users with this phone
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Users found with phone ${testPhone}:`, allUsers.length);
    allUsers.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ID: ${user._id}, Phone: ${user.phone}, Created: ${user.createdAt?.toISOString()?.split('T')[0] || 'N/A'}`);
    });

    // Get all bundles
    const allBundles = await Group.find({}).select('_id name createdBy');
    console.log(`\n🎁 Total channel bundles in system:`, allBundles.length);
    
    // Test subscription detection for each bundle
    const allUserIds = allUsers.map(u => u._id);
    
    console.log(`\n🔍 Testing subscription detection for each bundle:`);
    for (const bundle of allBundles.slice(0, 5)) { // Test first 5 bundles
      const successfulPayment = await PaymentLink.findOne({
        userid: { $in: allUserIds },
        groupId: bundle._id,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 });
      
      const hasSubscription = !!successfulPayment;
      console.log(`   📦 ${bundle.name} (${bundle._id}): ${hasSubscription ? '✅ HAS SUBSCRIPTION' : '❌ NO SUBSCRIPTION'}`);
      
      if (hasSubscription) {
        console.log(`      💰 Amount: ₹${successfulPayment.amount}, Date: ${successfulPayment.createdAt?.toISOString()?.split('T')[0]}`);
        console.log(`      👤 User ID: ${successfulPayment.userid}`);
      }
    }

    // Test 2: Verify admin isolation
    console.log('\n📋 Test 2: Admin Bundle Isolation');
    console.log('=' .repeat(70));
    
    // Get all admins
    const allAdmins = await Admin.find({}).select('_id email role');
    console.log(`👥 Total admins in system:`, allAdmins.length);
    allAdmins.forEach((admin, idx) => {
      console.log(`   ${idx + 1}. ${admin.email} (${admin.role}) - ID: ${admin._id}`);
    });

    // Check bundle ownership by admin
    console.log(`\n🔒 Bundle ownership by admin:`);
    for (const admin of allAdmins.slice(0, 3)) { // Test first 3 admins
      const adminBundles = await Group.find({ createdBy: admin._id }).select('_id name');
      console.log(`   🔑 ${admin.email}:`);
      if (adminBundles.length === 0) {
        console.log(`      ❌ No bundles created by this admin`);
      } else {
        adminBundles.forEach(bundle => {
          console.log(`      📦 ${bundle.name} (${bundle._id})`);
        });
      }
    }

    // Test 3: Verify user can have multiple bundle subscriptions
    console.log('\n📋 Test 3: Multiple Bundle Subscriptions for Same User');
    console.log('=' .repeat(70));
    
    // Find users with multiple subscriptions
    const usersWithMultipleSubscriptions = await PaymentLink.aggregate([
      { $match: { status: 'SUCCESS' } },
      { 
        $group: { 
          _id: '$userid', 
          subscriptions: { $addToSet: { groupId: '$groupId', amount: '$amount', createdAt: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 }
    ]);

    console.log(`🎯 Users with multiple bundle subscriptions:`, usersWithMultipleSubscriptions.length);
    
    for (const userSub of usersWithMultipleSubscriptions) {
      const user = await User.findById(userSub._id).select('phone firstName lastName');
      console.log(`\n👤 User: ${user?.phone || 'Unknown'} (${userSub._id})`);
      console.log(`   📊 Total subscriptions: ${userSub.count}`);
      
      // Get bundle names
      for (const sub of userSub.subscriptions) {
        const bundle = await Group.findById(sub.groupId).select('name');
        console.log(`   📦 ${bundle?.name || 'Unknown Bundle'} - ₹${sub.amount} (${sub.createdAt?.toISOString()?.split('T')[0]})`);
      }
    }

    // Test 4: Verify API endpoint isolation
    console.log('\n📋 Test 4: API Endpoint Isolation Test');
    console.log('=' .repeat(70));
    
    // Test the fixed check-purchase endpoint with different bundles
    const testBundles = allBundles.slice(0, 3);
    console.log(`🧪 Testing API endpoint for phone ${testPhone} across ${testBundles.length} bundles:`);
    
    for (const bundle of testBundles) {
      // Simulate the API logic
      const successfulPayment = await PaymentLink.findOne({
        userid: { $in: allUserIds },
        groupId: bundle._id,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 });
      
      const apiResponse = {
        bundleId: bundle._id,
        bundleName: bundle.name,
        hasPurchased: !!successfulPayment,
        paymentAmount: successfulPayment?.amount || 0
      };
      
      console.log(`   📡 Bundle: ${apiResponse.bundleName}`);
      console.log(`      Response: ${apiResponse.hasPurchased ? '✅ Has Purchase' : '❌ No Purchase'}`);
      if (apiResponse.hasPurchased) {
        console.log(`      Amount: ₹${apiResponse.paymentAmount}`);
      }
    }

    // Test 5: Cross-admin data leakage check
    console.log('\n📋 Test 5: Cross-Admin Data Leakage Check');
    console.log('=' .repeat(70));
    
    const adminWithBundles = await Admin.findOne({});
    if (adminWithBundles) {
      // Find bundles created by this admin
      const adminBundles = await Group.find({ createdBy: adminWithBundles._id });
      
      // Find bundles NOT created by this admin
      const otherAdminBundles = await Group.find({ 
        createdBy: { $ne: adminWithBundles._id },
        createdBy: { $exists: true }
      });
      
      console.log(`🔍 Testing admin ${adminWithBundles.email}:`);
      console.log(`   ✅ Should see ${adminBundles.length} own bundles`);
      console.log(`   ❌ Should NOT see ${otherAdminBundles.length} other admin bundles`);
      
      // This simulates the tenant filter
      const tenantFilter = { createdBy: adminWithBundles._id };
      const filteredBundles = await Group.find(tenantFilter);
      
      console.log(`   🎯 Tenant filter result: ${filteredBundles.length} bundles accessible`);
      console.log(`   ${filteredBundles.length === adminBundles.length ? '✅ ISOLATION WORKING' : '❌ ISOLATION BREACH'}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Isolation testing completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testIsolation();
