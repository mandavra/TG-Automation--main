const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const InviteLink = require('./models/InviteLink');
require('dotenv').config();

async function migrateSpecificUser() {
  console.log('\n🎯 MIGRATING SPECIFIC TEST USER TO CLOUD DATABASE');
  console.log('=' .repeat(80));

  const localDB = 'mongodb://localhost:27017/telegram-automation';
  const cloudDB = process.env.MONGODB_URI;
  const targetPhone = '+917020025010';

  console.log(`📍 Local DB: ${localDB}`);
  console.log(`☁️ Cloud DB: ${cloudDB.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log(`🎯 Target User: ${targetPhone}`);

  try {
    // Step 1: Connect to both databases
    console.log('\n1️⃣ CONNECTING TO DATABASES');
    console.log('-'.repeat(50));
    
    const localConn = await mongoose.createConnection(localDB);
    const cloudConn = await mongoose.createConnection(cloudDB);
    console.log('✅ Connected to both databases');

    // Get models for both connections
    const LocalUser = localConn.model('User', User.schema);
    const LocalPaymentLink = localConn.model('PaymentLink', PaymentLink.schema);
    const LocalGroup = localConn.model('Group', Group.schema);
    const LocalInviteLink = localConn.model('InviteLink', InviteLink.schema);
    
    const CloudUser = cloudConn.model('User', User.schema);
    const CloudPaymentLink = cloudConn.model('PaymentLink', PaymentLink.schema);
    const CloudGroup = cloudConn.model('Group', Group.schema);
    const CloudInviteLink = cloudConn.model('InviteLink', InviteLink.schema);

    // Step 2: Get specific user data from local DB
    console.log('\n2️⃣ GETTING USER DATA FROM LOCAL DB');
    console.log('-'.repeat(50));
    
    const phoneFormats = [targetPhone, targetPhone.substring(1)];
    const localUsers = await LocalUser.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Found ${localUsers.length} users with phone ${targetPhone} in local DB`);
    
    if (localUsers.length === 0) {
      console.log('❌ No users found in local database');
      await localConn.close();
      await cloudConn.close();
      return;
    }

    const localUserIds = localUsers.map(u => u._id);
    const localPayments = await LocalPaymentLink.find({ userid: { $in: localUserIds } }).populate('groupId');
    const localInviteLinks = await LocalInviteLink.find({ userId: { $in: localUserIds } });
    
    console.log(`💳 Found ${localPayments.length} payments for this user`);
    console.log(`🔗 Found ${localInviteLinks.length} invite links for this user`);

    localPayments.forEach((payment, i) => {
      console.log(`   Payment ${i + 1}: ₹${payment.amount} - ${payment.status} - Bundle: ${payment.groupId?.name}`);
    });

    // Step 3: Check/create groups in cloud DB
    console.log('\n3️⃣ ENSURING GROUPS EXIST IN CLOUD DB');
    console.log('-'.repeat(50));
    
    const groupMappings = {}; // local ID -> cloud ID mapping
    
    for (const payment of localPayments) {
      if (!payment.groupId) continue;
      
      const localGroup = payment.groupId;
      console.log(`📦 Processing group: ${localGroup.name}`);
      
      // Check if group exists in cloud (by name, not customRoute to avoid conflicts)
      let cloudGroup = await CloudGroup.findOne({ name: localGroup.name });
      
      if (cloudGroup) {
        console.log(`   ✅ Group "${localGroup.name}" already exists in cloud`);
        console.log(`   Cloud ID: ${cloudGroup._id}`);
        
        // Update customRoute if needed and not conflicting
        if (localGroup.customRoute && !cloudGroup.customRoute) {
          try {
            await CloudGroup.findByIdAndUpdate(cloudGroup._id, {
              customRoute: localGroup.customRoute
            });
            console.log(`   ✅ Updated customRoute to: ${localGroup.customRoute}`);
          } catch (err) {
            if (err.code === 11000) {
              console.log(`   ⚠️ CustomRoute "${localGroup.customRoute}" already exists, keeping existing one`);
            } else {
              console.log(`   ⚠️ Could not update customRoute: ${err.message}`);
            }
          }
        }
        
        groupMappings[localGroup._id.toString()] = cloudGroup._id;
      } else {
        // Create new group in cloud
        const groupData = localGroup.toObject();
        delete groupData._id;
        delete groupData.__v;
        
        // Handle potential customRoute conflicts
        if (groupData.customRoute) {
          const existingRouteGroup = await CloudGroup.findOne({ customRoute: groupData.customRoute });
          if (existingRouteGroup) {
            console.log(`   ⚠️ CustomRoute "${groupData.customRoute}" already exists, using modified route`);
            groupData.customRoute = `${groupData.customRoute}-${Date.now()}`;
          }
        }
        
        const newCloudGroup = new CloudGroup(groupData);
        await newCloudGroup.save();
        console.log(`   ✅ Created new group "${localGroup.name}" in cloud`);
        console.log(`   New Cloud ID: ${newCloudGroup._id}`);
        
        groupMappings[localGroup._id.toString()] = newCloudGroup._id;
      }
    }

    // Step 4: Migrate users to cloud DB
    console.log('\n4️⃣ MIGRATING USERS TO CLOUD DB');
    console.log('-'.repeat(50));
    
    const userMappings = {}; // local ID -> cloud ID mapping
    
    for (const localUser of localUsers) {
      console.log(`👤 Processing user: ${localUser.phone}`);
      
      // Check if user exists in cloud
      let cloudUser = await CloudUser.findOne({ phone: localUser.phone });
      
      if (cloudUser) {
        console.log(`   ✅ User ${localUser.phone} already exists in cloud`);
        console.log(`   Cloud ID: ${cloudUser._id}`);
      } else {
        // Create new user in cloud
        const userData = localUser.toObject();
        delete userData._id;
        delete userData.__v;
        
        cloudUser = new CloudUser(userData);
        await cloudUser.save();
        console.log(`   ✅ Created user ${localUser.phone} in cloud`);
        console.log(`   New Cloud ID: ${cloudUser._id}`);
      }
      
      userMappings[localUser._id.toString()] = cloudUser._id;
    }

    // Step 5: Migrate payments to cloud DB
    console.log('\n5️⃣ MIGRATING PAYMENTS TO CLOUD DB');
    console.log('-'.repeat(50));
    
    const paymentMappings = {}; // local ID -> cloud ID mapping
    
    for (const localPayment of localPayments) {
      const cloudUserId = userMappings[localPayment.userid.toString()];
      const cloudGroupId = groupMappings[localPayment.groupId._id.toString()];
      
      if (!cloudUserId || !cloudGroupId) {
        console.log(`❌ Skipping payment - missing user or group mapping`);
        continue;
      }
      
      console.log(`💳 Processing payment: ₹${localPayment.amount} - ${localPayment.status}`);
      
      // Check if payment already exists
      const existingPayment = await CloudPaymentLink.findOne({
        userid: cloudUserId,
        groupId: cloudGroupId,
        amount: localPayment.amount,
        status: localPayment.status
      });
      
      if (existingPayment) {
        console.log(`   ✅ Payment already exists in cloud`);
        console.log(`   Cloud ID: ${existingPayment._id}`);
        paymentMappings[localPayment._id.toString()] = existingPayment._id;
      } else {
        // Create new payment
        const paymentData = localPayment.toObject();
        delete paymentData._id;
        delete paymentData.__v;
        paymentData.userid = cloudUserId;
        paymentData.groupId = cloudGroupId;
        
        const newCloudPayment = new CloudPaymentLink(paymentData);
        await newCloudPayment.save();
        console.log(`   ✅ Created payment ₹${localPayment.amount} in cloud`);
        console.log(`   New Cloud ID: ${newCloudPayment._id}`);
        paymentMappings[localPayment._id.toString()] = newCloudPayment._id;
      }
    }

    // Step 6: Migrate invite links to cloud DB
    console.log('\n6️⃣ MIGRATING INVITE LINKS TO CLOUD DB');
    console.log('-'.repeat(50));
    
    for (const localInvite of localInviteLinks) {
      const cloudUserId = userMappings[localInvite.userId.toString()];
      const cloudPaymentId = paymentMappings[localInvite.paymentLinkId?.toString()];
      
      if (!cloudUserId) {
        console.log(`❌ Skipping invite link - missing user mapping`);
        continue;
      }
      
      console.log(`🔗 Processing invite link: ${localInvite.channelTitle || 'Unknown Channel'}`);
      
      // Check if invite link already exists
      const existingInvite = await CloudInviteLink.findOne({
        userId: cloudUserId,
        link: localInvite.link
      });
      
      if (existingInvite) {
        console.log(`   ✅ Invite link already exists in cloud`);
      } else {
        // Create new invite link
        const inviteData = localInvite.toObject();
        delete inviteData._id;
        delete inviteData.__v;
        inviteData.userId = cloudUserId;
        if (cloudPaymentId) {
          inviteData.paymentLinkId = cloudPaymentId;
        }
        
        const newCloudInvite = new CloudInviteLink(inviteData);
        await newCloudInvite.save();
        console.log(`   ✅ Created invite link in cloud`);
      }
    }

    // Step 7: Verify the migration
    console.log('\n7️⃣ VERIFYING MIGRATION');
    console.log('-'.repeat(50));
    
    const verifyUser = await CloudUser.findOne({ phone: targetPhone });
    if (verifyUser) {
      console.log(`✅ User ${targetPhone} found in cloud database`);
      console.log(`   User ID: ${verifyUser._id}`);
      
      const verifyPayments = await CloudPaymentLink.find({ userid: verifyUser._id }).populate('groupId');
      console.log(`💳 Found ${verifyPayments.length} payments in cloud:`);
      
      for (const payment of verifyPayments) {
        console.log(`   - ₹${payment.amount} - ${payment.status} - ${payment.groupId?.name}`);
        console.log(`     Bundle ID: ${payment.groupId?._id}`);
        console.log(`     Custom Route: ${payment.groupId?.customRoute}`);
        
        // Test the API endpoint URL that frontend will use
        if (payment.groupId?.customRoute === 'maintest') {
          console.log(`   🎯 This payment should be detected by /pc/maintest page!`);
          console.log(`   📡 API URL: /api/user/check-purchase/${targetPhone}/${payment.groupId._id}`);
        }
      }
      
      const verifyInvites = await CloudInviteLink.find({ userId: verifyUser._id });
      console.log(`🔗 Found ${verifyInvites.length} invite links in cloud`);
    } else {
      console.log(`❌ User ${targetPhone} NOT found in cloud database`);
    }

    // Close connections
    await localConn.close();
    await cloudConn.close();
    
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. The cloud database now has the test user and payment data');
    console.log('2. Restart the backend server to ensure clean state');
    console.log('3. Test the API: GET /api/user/check-purchase/+917020025010/<bundleId>');
    console.log('4. Open /pc/maintest in fresh browser - should show subscription status');

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateSpecificUser();
