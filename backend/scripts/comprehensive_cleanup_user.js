const mongoose = require('mongoose');
require('dotenv').config();

// Import all models that might contain user data
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const InviteLink = require('../models/InviteLink');
const ChannelMember = require('../models/ChannelMember');
const Plan = require('../models/plan');

const PHONE_TO_CLEAN = '+917202025010';

async function comprehensiveCleanup() {
  try {
    console.log('🧹 Starting comprehensive cleanup for user:', PHONE_TO_CLEAN);
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation');
    console.log('✅ Connected to MongoDB');

    // Find the user first
    const user = await User.findOne({ phone: PHONE_TO_CLEAN });
    console.log('🔍 User found:', user ? `${user.firstName} ${user.lastName} (ID: ${user._id})` : 'Not found');

    let deletedCounts = {
      payments: 0,
      inviteLinks: 0,
      channelMembers: 0,
      users: 0,
      orphanedPayments: 0,
      orphanedInvites: 0,
      orphanedMembers: 0
    };

    if (user) {
      // 1. Delete all PaymentLinks for this user
      console.log('🗑️ Deleting PaymentLinks for user...');
      const paymentDeleteResult = await PaymentLink.deleteMany({ userid: user._id });
      deletedCounts.payments = paymentDeleteResult.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.payments} payment links`);

      // 2. Delete all InviteLinks for this user
      console.log('🗑️ Deleting InviteLinks for user...');
      const inviteDeleteResult = await InviteLink.deleteMany({ userId: user._id });
      deletedCounts.inviteLinks = inviteDeleteResult.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.inviteLinks} invite links`);

      // 3. Delete all ChannelMembers using telegramUserId
      if (user.telegramUserId) {
        console.log('🗑️ Deleting ChannelMembers for user...');
        const memberDeleteResult = await ChannelMember.deleteMany({ 
          telegramUserId: user.telegramUserId 
        });
        deletedCounts.channelMembers = memberDeleteResult.deletedCount;
        console.log(`✅ Deleted ${deletedCounts.channelMembers} channel memberships`);
      }

      // 4. Delete the User record
      console.log('🗑️ Deleting User record...');
      const userDeleteResult = await User.deleteOne({ _id: user._id });
      deletedCounts.users = userDeleteResult.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.users} user record`);
    }

    // 5. Clean up any orphaned records by phone number
    console.log('🧹 Cleaning up orphaned records by phone...');
    
    // Delete orphaned payments by phone
    const orphanedPaymentResult = await PaymentLink.deleteMany({ phone: PHONE_TO_CLEAN });
    deletedCounts.orphanedPayments = orphanedPaymentResult.deletedCount;
    console.log(`✅ Deleted ${deletedCounts.orphanedPayments} orphaned payment links`);

    // Delete orphaned invite links by searching for user that no longer exists
    const orphanedInviteResult = await InviteLink.deleteMany({ 
      $or: [
        { phone: PHONE_TO_CLEAN },
        { userId: user?._id }
      ]
    });
    deletedCounts.orphanedInvites = orphanedInviteResult.deletedCount;
    console.log(`✅ Deleted ${deletedCounts.orphanedInvites} orphaned invite links`);

    // 6. Search for any additional references by phone in other collections
    console.log('🔍 Searching for any remaining references...');
    
    // Check if there are any remaining PaymentLinks with this phone
    const remainingPayments = await PaymentLink.find({ phone: PHONE_TO_CLEAN });
    console.log(`📊 Remaining payments: ${remainingPayments.length}`);
    
    // Check if there are any remaining InviteLinks
    const remainingInvites = await InviteLink.find({ phone: PHONE_TO_CLEAN });
    console.log(`📊 Remaining invites: ${remainingInvites.length}`);
    
    // Check if user still exists
    const remainingUser = await User.findOne({ phone: PHONE_TO_CLEAN });
    console.log(`📊 Remaining user: ${remainingUser ? 'YES' : 'NO'}`);

    // 7. Final verification - show totals
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log('==================');
    console.log(`👤 Users deleted: ${deletedCounts.users}`);
    console.log(`💳 Payment links deleted: ${deletedCounts.payments}`);
    console.log(`🔗 Invite links deleted: ${deletedCounts.inviteLinks}`);
    console.log(`📺 Channel memberships deleted: ${deletedCounts.channelMembers}`);
    console.log(`🗑️ Orphaned payments deleted: ${deletedCounts.orphanedPayments}`);
    console.log(`🗑️ Orphaned invites deleted: ${deletedCounts.orphanedInvites}`);
    
    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    console.log(`\n🎯 TOTAL RECORDS DELETED: ${totalDeleted}`);
    
    if (totalDeleted === 0) {
      console.log('✨ User data was already clean!');
    } else {
      console.log('✅ Comprehensive cleanup completed successfully!');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the cleanup
comprehensiveCleanup()
  .then(() => {
    console.log('🎉 Cleanup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
