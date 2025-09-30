const mongoose = require('mongoose');
const axios = require('axios');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const cron = require('node-cron');

// === Telegram Bot Details ===
require('dotenv').config();
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;

const removeUserFromTelegram = async (userId, userRecord) => {
  try {
    // For channels, we need to use banChatMember instead of kickChatMember
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/banChatMember`, {
      chat_id: CHAT_ID,
      user_id: userId
    });
    console.log(`Banned user ${userId} from Telegram channel`);

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Unban to allow future rejoining
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/unbanChatMember`, {
      chat_id: CHAT_ID,
      user_id: userId
    });
    console.log(`Unbanned user ${userId} from Telegram channel`);

    // Update user status to 'expired'
    if (userRecord) {
      await User.findByIdAndUpdate(userRecord._id, {
        telegramJoinStatus: 'expired'
      });
      console.log(`Updated user ${userRecord._id} status to expired`);
    }

  } catch (error) {
    console.error(`Telegram bot error for ${userId}:`, error.response?.data || error.message);
  }
};

const checkExpiredUsers = async () => {
  console.log('Running daily user cleanup + Telegram kick job');

  try {
    const now = new Date();

    const expiredPayments = await PaymentLink.find({
      expiry_date: { $lt: now },
      status: 'SUCCESS'
    });

    console.log(`Found ${expiredPayments.length} expired payments to process`);

    for (const payment of expiredPayments) {
      const dbUserId = payment.userid;

      // Find user record before deletion to preserve Telegram info
      const userRecord = await User.findById(dbUserId);
      const telegramUserId = userRecord?.telegramUserId || null;

      console.log(`Processing expired payment for user ${dbUserId} (${userRecord?.email || 'no email'})`);

      // Remove from Telegram first if they have a Telegram ID and are currently joined
      if (telegramUserId && userRecord?.telegramJoinStatus === 'joined') {
        await removeUserFromTelegram(telegramUserId, userRecord);
      } else if (!telegramUserId) {
        console.warn(`No Telegram ID found for user ${dbUserId}`);
      } else {
        console.log(`User ${dbUserId} not currently joined to Telegram (status: ${userRecord?.telegramJoinStatus})`);
      }

      // Clean up database records
      await User.findByIdAndDelete(dbUserId);
      await PaymentLink.findByIdAndDelete(payment._id);
      console.log(`Deleted DB user ${dbUserId} and payment record`);
    }

    console.log(`Daily cleanup completed at ${now.toISOString()}`);
    console.log(`Processed ${expiredPayments.length} expired users`);
    
  } catch (err) {
    console.error('Daily cleanup error:', err.message);
  }
};

// Initial run - only if MONGODB is connected
if (mongoose.connection.readyState === 1) {
  console.log('Running initial cleanup check...');
  checkExpiredUsers();
} else {
  console.log('MONGODB not connected, skipping initial cleanup run');
}

// PRODUCTION SCHEDULE: Run daily at 2 AM
cron.schedule('0 2 * * *', checkExpiredUsers);

console.log('✅ Production expiry job scheduled to run daily at 2:00 AM');

module.exports = { checkExpiredUsers };