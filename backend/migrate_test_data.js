const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const InviteLink = require('./models/InviteLink');
require('dotenv').config();

async function migrateTestData() {
  console.log('\n🔄 MIGRATING TEST DATA FROM LOCAL TO CLOUD DATABASE');
  console.log('=' .repeat(80));

  // Connection URLs
  const localDB = 'mongodb://localhost:27017/telegram-automation';
  const cloudDB = process.env.MONGODB_URI;

  console.log(`📍 Local DB: ${localDB}`);
  console.log(`☁️ Cloud DB: ${cloudDB.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  try {
    // Step 1: Connect to local database and get test data
    console.log('\n1️⃣ CONNECTING TO LOCAL DATABASE');
    console.log('-'.repeat(50));
    
    const localConnection = await mongoose.createConnection(localDB);
    console.log('✅ Connected to local database');

    // Get local models
    const LocalUser = localConnection.model('User', User.schema);
    const LocalPaymentLink = localConnection.model('PaymentLink', PaymentLink.schema);
    const LocalGroup = localConnection.model('Group', Group.schema);
    const LocalInviteLink = localConnection.model('InviteLink', InviteLink.schema);

    // Get test data
    const localUsers = await LocalUser.find({});
    const localPayments = await LocalPaymentLink.find({});
    const localGroups = await LocalGroup.find({});
    const localInviteLinks = await LocalInviteLink.find({});

    console.log(`📊 Found in local database:`);
    console.log(`   Users: ${localUsers.length}`);
    console.log(`   Payments: ${localPayments.length}`);
    console.log(`   Groups: ${localGroups.length}`);
    console.log(`   Invite Links: ${localInviteLinks.length}`);

    if (localUsers.length === 0) {
      console.log('❌ No test data found in local database');
      await localConnection.close();
      return;
    }

    // Step 2: Connect to cloud database
    console.log('\n2️⃣ CONNECTING TO CLOUD DATABASE');
    console.log('-'.repeat(50));
    
    const cloudConnection = await mongoose.createConnection(cloudDB);
    console.log('✅ Connected to cloud database');

    // Get cloud models
    const CloudUser = cloudConnection.model('User', User.schema);
    const CloudPaymentLink = cloudConnection.model('PaymentLink', PaymentLink.schema);
    const CloudGroup = cloudConnection.model('Group', Group.schema);
    const CloudInviteLink = cloudConnection.model('InviteLink', InviteLink.schema);

    // Check current cloud data
    const cloudUsers = await CloudUser.find({});
    const cloudPayments = await CloudPaymentLink.find({});
    const cloudGroups = await CloudGroup.find({});

    console.log(`📊 Current cloud database:`);
    console.log(`   Users: ${cloudUsers.length}`);
    console.log(`   Payments: ${cloudPayments.length}`);
    console.log(`   Groups: ${cloudGroups.length}`);

    // Step 3: Migrate Groups first (they're referenced by payments)
    console.log('\n3️⃣ MIGRATING GROUPS');
    console.log('-'.repeat(50));
    
    for (const localGroup of localGroups) {
      // Check if group already exists in cloud
      const existingGroup = await CloudGroup.findOne({ name: localGroup.name });
      
      if (existingGroup) {
        console.log(`📦 Group "${localGroup.name}" already exists in cloud`);
        console.log(`   Local ID: ${localGroup._id}`);
        console.log(`   Cloud ID: ${existingGroup._id}`);
        
        // Update the group with our custom route
        if (localGroup.customRoute && !existingGroup.customRoute) {
          await CloudGroup.findByIdAndUpdate(existingGroup._id, {
            customRoute: localGroup.customRoute
          });
          console.log(`   ✅ Updated customRoute: ${localGroup.customRoute}`);
        }
      } else {
        // Create new group in cloud
        const groupData = localGroup.toObject();
        delete groupData._id; // Remove local ID
        delete groupData.__v; // Remove version key
        
        const newCloudGroup = new CloudGroup(groupData);
        await newCloudGroup.save();
        console.log(`✅ Created group "${localGroup.name}" in cloud`);
        console.log(`   New Cloud ID: ${newCloudGroup._id}`);
      }
    }

    // Step 4: Migrate Users
    console.log('\n4️⃣ MIGRATING USERS');
    console.log('-'.repeat(50));
    
    for (const localUser of localUsers) {
      // Check if user already exists in cloud
      const existingUser = await CloudUser.findOne({ phone: localUser.phone });
      
      if (existingUser) {
        console.log(`👤 User ${localUser.phone} already exists in cloud`);
      } else {
        // Create new user in cloud
        const userData = localUser.toObject();
        delete userData._id; // Remove local ID
        delete userData.__v; // Remove version key
        
        const newCloudUser = new CloudUser(userData);
        await newCloudUser.save();
        console.log(`✅ Created user ${localUser.phone} in cloud`);
      }
    }

    // Step 5: Migrate Payments (with updated references)
    console.log('\n5️⃣ MIGRATING PAYMENTS');
    console.log('-'.repeat(50));
    
    for (const localPayment of localPayments) {
      // Find corresponding user and group in cloud
      const localUser = await LocalUser.findById(localPayment.userid);
      const localGroup = await LocalGroup.findById(localPayment.groupId);
      
      if (!localUser || !localGroup) {
        console.log(`❌ Skipping payment ${localPayment._id} - missing user or group`);
        continue;
      }

      const cloudUser = await CloudUser.findOne({ phone: localUser.phone });
      const cloudGroup = await CloudGroup.findOne({ name: localGroup.name });
      
      if (!cloudUser || !cloudGroup) {
        console.log(`❌ Skipping payment ${localPayment._id} - user or group not found in cloud`);
        continue;
      }

      // Check if payment already exists
      const existingPayment = await CloudPaymentLink.findOne({
        userid: cloudUser._id,
        groupId: cloudGroup._id,
        amount: localPayment.amount
      });

      if (existingPayment) {
        console.log(`💳 Payment already exists in cloud for ${localUser.phone} -> ${localGroup.name}`);
      } else {
        // Create new payment with cloud references
        const paymentData = localPayment.toObject();
        delete paymentData._id;
        delete paymentData.__v;
        paymentData.userid = cloudUser._id;
        paymentData.groupId = cloudGroup._id;
        
        const newCloudPayment = new CloudPaymentLink(paymentData);
        await newCloudPayment.save();
        console.log(`✅ Created payment ${localUser.phone} -> ${localGroup.name} (₹${localPayment.amount})`);
      }
    }

    // Step 6: Migrate Invite Links
    console.log('\n6️⃣ MIGRATING INVITE LINKS');
    console.log('-'.repeat(50));
    
    for (const localInvite of localInviteLinks) {
      // Find corresponding user and payment in cloud
      const localUser = await LocalUser.findById(localInvite.userId);
      const localPayment = await LocalPaymentLink.findById(localInvite.paymentLinkId);
      
      if (!localUser || !localPayment) {
        console.log(`❌ Skipping invite link - missing user or payment`);
        continue;
      }

      const cloudUser = await CloudUser.findOne({ phone: localUser.phone });
      const cloudPayment = await CloudPaymentLink.findOne({
        userid: cloudUser?._id,
        amount: localPayment.amount
      });

      if (!cloudUser || !cloudPayment) {
        console.log(`❌ Skipping invite link - user or payment not found in cloud`);
        continue;
      }

      // Check if invite link already exists
      const existingInvite = await CloudInviteLink.findOne({
        userId: cloudUser._id,
        paymentLinkId: cloudPayment._id,
        link: localInvite.link
      });

      if (existingInvite) {
        console.log(`🔗 Invite link already exists in cloud`);
      } else {
        // Create new invite link with cloud references
        const inviteData = localInvite.toObject();
        delete inviteData._id;
        delete inviteData.__v;
        inviteData.userId = cloudUser._id;
        inviteData.paymentLinkId = cloudPayment._id;
        
        const newCloudInvite = new CloudInviteLink(inviteData);
        await newCloudInvite.save();
        console.log(`✅ Created invite link for ${localUser.phone}`);
      }
    }

    // Step 7: Verify migration
    console.log('\n7️⃣ VERIFYING MIGRATION');
    console.log('-'.repeat(50));
    
    const finalCloudUsers = await CloudUser.find({});
    const finalCloudPayments = await CloudPaymentLink.find({});
    const finalCloudGroups = await CloudGroup.find({});
    const finalCloudInvites = await CloudInviteLink.find({});

    console.log(`📊 Final cloud database:`);
    console.log(`   Users: ${finalCloudUsers.length}`);
    console.log(`   Payments: ${finalCloudPayments.length}`);
    console.log(`   Groups: ${finalCloudGroups.length}`);
    console.log(`   Invite Links: ${finalCloudInvites.length}`);

    // Test the specific user we need
    const testUser = await CloudUser.findOne({ phone: '+917020025010' });
    if (testUser) {
      const testPayments = await CloudPaymentLink.find({ userid: testUser._id });
      console.log(`\n✅ Test user +917020025010 found in cloud:`);
      console.log(`   User ID: ${testUser._id}`);
      console.log(`   Payments: ${testPayments.length}`);
      testPayments.forEach((payment, i) => {
        console.log(`     ${i + 1}. ₹${payment.amount} - ${payment.status}`);
      });
    } else {
      console.log(`❌ Test user +917020025010 NOT found in cloud`);
    }

    // Close connections
    await localConnection.close();
    await cloudConnection.close();
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateTestData();
