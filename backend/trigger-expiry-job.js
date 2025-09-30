// Manual trigger for the expiry job to test user removal
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');

// Telegram Bot Details
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;

const removeUserFromTelegram = async (userId, userRecord) => {
  try {
    console.log(`🚨 Removing user ${userId} from Telegram channel...`);
    
    // For channels, we need to use banChatMember instead of kickChatMember
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/banChatMember`, {
      chat_id: CHAT_ID,
      user_id: userId
    });
    console.log(`✅ Banned user ${userId} from Telegram channel`);

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Unban to allow future rejoining
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/unbanChatMember`, {
      chat_id: CHAT_ID,
      user_id: userId
    });
    console.log(`✅ Unbanned user ${userId} from Telegram channel`);

    // Update user status to 'expired'
    if (userRecord) {
      await User.findByIdAndUpdate(userRecord._id, {
        telegramJoinStatus: 'expired'
      });
      console.log(`✅ Updated user ${userRecord._id} status to expired`);
    }

  } catch (error) {
    console.error(`❌ Telegram bot error for ${userId}:`, error.response?.data || error.message);
  }
};

const manualExpiryCheck = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🔍 Running manual expiry check...\n');

    const now = new Date();
    const expiredPayments = await PaymentLink.find({
      expiry_date: { $lt: now },
      payment_status: 'SUCCESS'
    });

    console.log(`📊 Found ${expiredPayments.length} expired payments to process\n`);

    let processedCount = 0;

    for (const payment of expiredPayments) {
      const dbUserId = payment.userid;
      
      // Find user record before deletion to preserve Telegram info
      const userRecord = await User.findById(dbUserId);
      
      if (!userRecord) {
        console.log(`⚠️  User ${dbUserId} not found in database`);
        await PaymentLink.findByIdAndDelete(payment._id);
        continue;
      }

      const telegramUserId = userRecord.telegramUserId;
      
      console.log(`🔄 Processing expired payment for: ${userRecord.firstName} ${userRecord.lastName}`);
      console.log(`   📧 Email: ${userRecord.email}`);
      console.log(`   📱 Telegram ID: ${telegramUserId || 'Not set'}`);
      console.log(`   💳 Plan: ${payment.plan_name}`);
      console.log(`   ⏰ Expired: ${payment.expiry_date.toLocaleString()}`);

      // Remove from Telegram if they have a Telegram ID and are currently active
      if (telegramUserId && (userRecord.telegramJoinStatus === 'joined' || userRecord.telegramJoinStatus === 'active')) {
        await removeUserFromTelegram(telegramUserId, userRecord);
        console.log(`✅ Removed from Telegram channel`);
      } else if (!telegramUserId) {
        console.log(`⚠️  No Telegram ID found for user ${dbUserId}`);
      } else {
        console.log(`ℹ️  User not currently joined to Telegram (status: ${userRecord.telegramJoinStatus})`);
      }

      // Clean up database records
      await User.findByIdAndDelete(dbUserId);
      await PaymentLink.findByIdAndDelete(payment._id);
      console.log(`🗑️  Deleted user and payment records\n`);
      
      processedCount++;
    }

    console.log(`✅ Manual expiry check completed`);
    console.log(`📊 Processed ${processedCount} expired users`);
    
    if (processedCount === 0) {
      console.log('ℹ️  No expired users found to remove');
      console.log('💡 To test the system:');
      console.log('   1. Run "node test-expiry-system.js" to create test users');
      console.log('   2. Wait for their expiry times');
      console.log('   3. Run this script again to see removal in action');
    }

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error during manual expiry check:', error.message);
    mongoose.disconnect();
  }
};

console.log('🚀 Starting Manual Expiry Job...\n');
manualExpiryCheck();