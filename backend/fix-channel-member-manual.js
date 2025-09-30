/**
 * Manual Fix for Channel Member Expiry
 *
 * This script manually connects the channel members to their payments
 * based on the data we discovered in the enhanced analysis.
 */

const mongoose = require('mongoose');
const ChannelMember = require('./models/ChannelMember');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
const User = require('./models/user.model');
require('dotenv').config();

async function manualFixChannelMembers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    console.log('✅ Connected to MongoDB');

    console.log('🔧 Starting Manual Channel Member Fix...\n');

    // Manual mappings based on the debug output
    const manualMappings = [
      {
        telegramUserId: '1499314588',
        phone: '+917202025010', // From the payments list
        paymentId: '68d2315c9d96bf804396ae21', // Base - 1 - User: +917202025010
        inviteLinkId: '68d232729d96bf804396ae48',
        userId: '68d227c215327db4517e64e1'
      },
      {
        telegramUserId: '1574772163',
        phone: '+919624165190', // From the payments list
        paymentId: '68d234d49d96bf804396b19a', // Base - 1 - User: +919624165190
        inviteLinkId: '68d235279d96bf804396b1b3',
        userId: '68d234d39d96bf804396b193'
      }
    ];

    let fixedCount = 0;

    for (const mapping of manualMappings) {
      try {
        console.log(`\n🔧 Processing mapping for ${mapping.telegramUserId} (${mapping.phone})`);

        // Step 1: Update User record to include telegramUserId
        const userUpdateResult = await User.findByIdAndUpdate(
          mapping.userId,
          { telegramUserId: mapping.telegramUserId },
          { new: true }
        );

        if (userUpdateResult) {
          console.log(`   ✅ Updated User ${mapping.userId} with telegramUserId: ${mapping.telegramUserId}`);
        }

        // Step 2: Update InviteLink to include paymentLinkId
        const inviteLinkUpdateResult = await InviteLink.findByIdAndUpdate(
          mapping.inviteLinkId,
          { paymentLinkId: mapping.paymentId },
          { new: true }
        );

        if (inviteLinkUpdateResult) {
          console.log(`   ✅ Updated InviteLink ${mapping.inviteLinkId} with paymentLinkId: ${mapping.paymentId}`);
        }

        // Step 3: Get the payment expiry date
        const payment = await PaymentLink.findById(mapping.paymentId);
        if (payment && payment.expiry_date) {
          console.log(`   💰 Found payment: ${payment.plan_name} - Expiry: ${payment.expiry_date}`);

          // Step 4: Update ChannelMember expiry
          const member = await ChannelMember.findOne({
            telegramUserId: mapping.telegramUserId
          });

          if (member) {
            const oldExpiry = member.expiresAt;
            const newExpiry = new Date(payment.expiry_date);

            const oldDurationDays = Math.ceil((oldExpiry - member.joinedAt) / (1000 * 60 * 60 * 24));
            const newDurationDays = Math.ceil((newExpiry - member.joinedAt) / (1000 * 60 * 60 * 24));

            await ChannelMember.findByIdAndUpdate(member._id, {
              expiresAt: newExpiry
            });

            console.log(`   📅 Updated ChannelMember expiry:`);
            console.log(`      Old: ${oldExpiry.toLocaleString()} (${oldDurationDays} days)`);
            console.log(`      New: ${newExpiry.toLocaleString()} (${newDurationDays} days)`);

            fixedCount++;
          } else {
            console.log(`   ⚠️ ChannelMember not found for ${mapping.telegramUserId}`);
          }
        } else {
          console.log(`   ❌ Payment not found: ${mapping.paymentId}`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${mapping.telegramUserId}:`, error.message);
      }
    }

    console.log(`\n📊 Manual Fix Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} members`);
    console.log(`   📋 Total mappings: ${manualMappings.length}`);

    // Verify the results
    console.log(`\n🔍 Verification - Channel Members After Fix:`);
    const members = await ChannelMember.find({ isActive: true });

    for (const member of members) {
      const durationDays = Math.ceil((member.expiresAt - member.joinedAt) / (1000 * 60 * 60 * 24));
      console.log(`   Member ${member.telegramUserId}: ${durationDays} days (expires: ${member.expiresAt.toLocaleString()})`);
    }

    console.log('\n🎉 Manual Fix Complete!');

  } catch (error) {
    console.error('❌ Manual fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  manualFixChannelMembers();
}

module.exports = { manualFixChannelMembers };