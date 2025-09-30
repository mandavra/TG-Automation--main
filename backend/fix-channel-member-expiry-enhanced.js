/**
 * Enhanced Data Migration Script: Fix Channel Member Expiry Dates
 *
 * This enhanced version tries multiple methods to find the correct payments
 * and provides more detailed debugging information.
 */

const mongoose = require('mongoose');
const ChannelMember = require('./models/ChannelMember');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
const User = require('./models/user.model');
require('dotenv').config();

async function fixChannelMemberExpiryEnhanced() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    console.log('✅ Connected to MongoDB');

    console.log('🔧 Starting Enhanced Channel Member Expiry Fix...\n');

    // First, let's see what data we have
    console.log('📊 Data Analysis:');

    const totalMembers = await ChannelMember.countDocuments({ isActive: true });
    const totalPayments = await PaymentLink.countDocuments({ status: 'SUCCESS' });
    const totalUsers = await User.countDocuments();
    const totalInviteLinks = await InviteLink.countDocuments();

    console.log(`   - Active Channel Members: ${totalMembers}`);
    console.log(`   - Successful Payments: ${totalPayments}`);
    console.log(`   - Total Users: ${totalUsers}`);
    console.log(`   - Total Invite Links: ${totalInviteLinks}\n`);

    // Get recent successful payments for reference
    console.log('💰 Recent Successful Payments:');
    const recentPayments = await PaymentLink.find({ status: 'SUCCESS' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id userid phone plan_name amount expiry_date createdAt');

    for (const payment of recentPayments) {
      const user = await User.findById(payment.userid);
      console.log(`   Payment ${payment._id}: ${payment.plan_name} - ${payment.amount} - User: ${user?.phone || 'Unknown'} - Expiry: ${payment.expiry_date}`);
    }

    // Get all active channel members
    const members = await ChannelMember.find({
      isActive: true,
      expiresAt: { $exists: true }
    });

    console.log(`\n🔍 Processing ${members.length} active channel members:\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        console.log(`\n👤 Processing Member: ${member.telegramUserId}`);
        console.log(`   Channel: ${member.channelId}`);
        console.log(`   Joined: ${member.joinedAt}`);
        console.log(`   Current Expiry: ${member.expiresAt}`);
        console.log(`   Invite Link Used: ${member.inviteLinkUsed || 'None'}`);

        let payment = null;

        // Method 1: Find by invite link
        if (member.inviteLinkUsed) {
          const inviteLink = await InviteLink.findOne({
            link: member.inviteLinkUsed
          });

          if (inviteLink) {
            console.log(`   📎 Found invite link: ${inviteLink._id}`);
            console.log(`   📎 PaymentLinkId: ${inviteLink.paymentLinkId}`);
            console.log(`   📎 UserId: ${inviteLink.userId}`);

            if (inviteLink.paymentLinkId) {
              payment = await PaymentLink.findById(inviteLink.paymentLinkId);
              if (payment) {
                console.log(`   ✅ Found payment via invite link: ${payment._id}`);
              }
            }
          }
        }

        // Method 2: Find by user's telegram ID
        if (!payment) {
          const user = await User.findOne({ telegramUserId: member.telegramUserId });
          if (user) {
            console.log(`   👤 Found user: ${user._id} (${user.phone})`);
            payment = await PaymentLink.findOne({
              userid: user._id,
              status: 'SUCCESS'
            }).sort({ createdAt: -1 });

            if (payment) {
              console.log(`   ✅ Found payment via user ID: ${payment._id}`);
            }
          } else {
            console.log(`   ⚠️ No user found with telegramUserId: ${member.telegramUserId}`);
          }
        }

        // Method 3: Find by phone number pattern (if available in userInfo)
        if (!payment && member.userInfo && member.userInfo.phone) {
          payment = await PaymentLink.findOne({
            phone: member.userInfo.phone,
            status: 'SUCCESS'
          }).sort({ createdAt: -1 });

          if (payment) {
            console.log(`   ✅ Found payment via phone: ${payment._id}`);
          }
        }

        // Method 4: Find payment within time range (if member joined recently)
        if (!payment) {
          const joinTime = new Date(member.joinedAt);
          const startTime = new Date(joinTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before join
          const endTime = new Date(joinTime.getTime() + 2 * 60 * 60 * 1000);   // 2 hours after join

          const nearbyPayments = await PaymentLink.find({
            status: 'SUCCESS',
            createdAt: { $gte: startTime, $lte: endTime }
          }).sort({ createdAt: -1 });

          console.log(`   🕐 Found ${nearbyPayments.length} payments near join time`);

          if (nearbyPayments.length === 1) {
            payment = nearbyPayments[0];
            console.log(`   ✅ Found payment via time proximity: ${payment._id}`);
          } else if (nearbyPayments.length > 1) {
            console.log(`   ⚠️ Multiple payments found near join time - need manual review`);
          }
        }

        if (payment && payment.expiry_date) {
          const newExpiryDate = new Date(payment.expiry_date);
          const oldExpiryDate = member.expiresAt;

          // Calculate durations
          const oldDurationMs = oldExpiryDate - member.joinedAt;
          const newDurationMs = newExpiryDate - member.joinedAt;
          const oldDurationDays = Math.ceil(oldDurationMs / (1000 * 60 * 60 * 24));
          const newDurationDays = Math.ceil(newDurationMs / (1000 * 60 * 60 * 24));

          console.log(`   📅 Payment Details:`);
          console.log(`      Plan: ${payment.plan_name}`);
          console.log(`      Amount: ${payment.amount}`);
          console.log(`      Payment Expiry: ${payment.expiry_date}`);
          console.log(`   📊 Duration Comparison:`);
          console.log(`      Old: ${oldDurationDays} days (expires: ${oldExpiryDate.toLocaleString()})`);
          console.log(`      New: ${newDurationDays} days (expires: ${newExpiryDate.toLocaleString()})`);

          // Only update if significantly different (more than 1 day)
          if (Math.abs(newDurationDays - oldDurationDays) > 1) {
            await ChannelMember.findByIdAndUpdate(member._id, {
              expiresAt: newExpiryDate
            });

            console.log(`   ✅ UPDATED: Duration changed from ${oldDurationDays} to ${newDurationDays} days`);
            fixedCount++;
          } else {
            console.log(`   ⏭️ SKIPPED: Durations are similar (${oldDurationDays} vs ${newDurationDays} days)`);
            skippedCount++;
          }
        } else {
          console.log(`   ❌ NO PAYMENT FOUND - Member will keep current expiry`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`   ❌ ERROR processing member ${member.telegramUserId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Enhanced Migration Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} members`);
    console.log(`   ⏭️ Skipped: ${skippedCount} members`);
    console.log(`   ❌ Errors: ${errorCount} members`);
    console.log(`   📋 Total processed: ${members.length} members`);

    if (fixedCount === 0 && members.length > 0) {
      console.log('\n🤔 No records were fixed. Possible reasons:');
      console.log('   1. Channel members might be test records without real payments');
      console.log('   2. Payment records might be in PENDING status instead of SUCCESS');
      console.log('   3. There might be a data connection issue between users and payments');
      console.log('\n💡 Recommendation: Check the recent payments and manually verify the data relationships');
    }

    console.log('\n🎉 Enhanced Channel Member Expiry Fix Complete!');

  } catch (error) {
    console.error('❌ Enhanced migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixChannelMemberExpiryEnhanced();
}

module.exports = { fixChannelMemberExpiryEnhanced };