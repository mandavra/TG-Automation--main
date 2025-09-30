/**
 * Data Migration Script: Fix Channel Member Expiry Dates
 *
 * This script updates existing ChannelMember records to use the correct
 * expiry dates from their associated payments instead of hardcoded 30-day durations.
 */

const mongoose = require('mongoose');
const ChannelMember = require('./models/ChannelMember');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
const User = require('./models/user.model');
require('dotenv').config();

async function fixChannelMemberExpiry() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    console.log('✅ Connected to MongoDB');

    console.log('🔧 Starting Channel Member Expiry Fix...\n');

    // Get all active channel members
    const members = await ChannelMember.find({
      isActive: true,
      expiresAt: { $exists: true }
    });

    console.log(`📊 Found ${members.length} active channel members to process\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        console.log(`\n🔍 Processing member: ${member.telegramUserId} in channel: ${member.channelId}`);

        // Method 1: Try to find payment through invite link
        let payment = null;
        const inviteLink = await InviteLink.findOne({
          link: member.inviteLinkUsed
        });

        if (inviteLink && inviteLink.paymentLinkId) {
          payment = await PaymentLink.findById(inviteLink.paymentLinkId);
          console.log(`   📎 Found payment via invite link: ${payment?._id}`);
        }

        // Method 2: If no payment found, try to find by user
        if (!payment && member.telegramUserId) {
          // Find user by telegram ID
          const user = await User.findOne({ telegramUserId: member.telegramUserId });

          if (user) {
            payment = await PaymentLink.findOne({
              userid: user._id,
              status: 'SUCCESS'
            }).sort({ createdAt: -1 });
            console.log(`   👤 Found payment via user lookup: ${payment?._id}`);
          }
        }

        // Method 3: If still no payment, try finding by phone/email pattern
        if (!payment && member.userInfo) {
          // This is a fallback - try to find payment by matching user details
          const userQuery = {};
          if (member.userInfo.firstName) {
            userQuery.firstName = member.userInfo.firstName;
          }

          const user = await User.findOne(userQuery);
          if (user) {
            payment = await PaymentLink.findOne({
              userid: user._id,
              status: 'SUCCESS'
            }).sort({ createdAt: -1 });
            console.log(`   🔎 Found payment via user details: ${payment?._id}`);
          }
        }

        if (payment && payment.expiry_date) {
          const newExpiryDate = new Date(payment.expiry_date);
          const oldExpiryDate = member.expiresAt;

          // Calculate current duration vs new duration
          const oldDurationMs = oldExpiryDate - member.joinedAt;
          const newDurationMs = newExpiryDate - member.joinedAt;
          const oldDurationDays = Math.ceil(oldDurationMs / (1000 * 60 * 60 * 24));
          const newDurationDays = Math.ceil(newDurationMs / (1000 * 60 * 60 * 24));

          console.log(`   📅 Old expiry: ${oldExpiryDate.toLocaleString()} (${oldDurationDays} days)`);
          console.log(`   📅 New expiry: ${newExpiryDate.toLocaleString()} (${newDurationDays} days)`);

          // Only update if the new expiry is significantly different (more than 1 day difference)
          if (Math.abs(newDurationDays - oldDurationDays) > 1) {
            await ChannelMember.findByIdAndUpdate(member._id, {
              expiresAt: newExpiryDate
            });

            console.log(`   ✅ UPDATED: Duration changed from ${oldDurationDays} to ${newDurationDays} days`);
            fixedCount++;
          } else {
            console.log(`   ⏭️ SKIPPED: Expiry dates are similar (${oldDurationDays} vs ${newDurationDays} days)`);
            skippedCount++;
          }
        } else {
          console.log(`   ⚠️ No payment found for member ${member.telegramUserId}`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`   ❌ ERROR processing member ${member.telegramUserId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} members`);
    console.log(`   ⏭️ Skipped: ${skippedCount} members`);
    console.log(`   ❌ Errors: ${errorCount} members`);
    console.log(`   📋 Total processed: ${members.length} members`);

    console.log('\n🎉 Channel Member Expiry Fix Complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixChannelMemberExpiry();
}

module.exports = { fixChannelMemberExpiry };