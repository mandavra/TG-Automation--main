const mongoose = require('mongoose');
const axios = require('axios');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const cron = require('node-cron');

// === Telegram Bot Details ===
require('dotenv').config();
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;
const REJOIN_LINK = 'https://t.me/YOUR_GROUP_LINK_OR_USERNAME';

const removeUserFromTelegram = async (userId, userRecord = null, channelId = null) => {
  try {
    // Use specific channelId or fallback to default CHAT_ID
    const targetChannelId = channelId || CHAT_ID;
    
    console.log(`🚫 Removing user ${userId} from channel ${targetChannelId}`);

    // For channels, we need to use banChatMember instead of kickChatMember
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/banChatMember`, {
      chat_id: targetChannelId,
      user_id: userId
    });
    console.log(`   ✅ Banned user ${userId} from channel ${targetChannelId}`);

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Unban to allow future rejoining with new payment
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/unbanChatMember`, {
      chat_id: targetChannelId,
      user_id: userId
    });
    console.log(`   ✅ Unbanned user ${userId} from channel ${targetChannelId} (can rejoin with new payment)`);

    // Optional: Send expiry notification
    try {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: userId,
        text: `⏰ Your subscription has expired. You have been removed from the channel.\n\n🔄 You can rejoin by purchasing a new subscription.`
      });
      console.log(`   📨 Sent expiry notification to user ${userId}`);
    } catch (msgError) {
      console.log(`   ⚠️ Could not send notification to user ${userId} (they may have blocked the bot)`);
    }

  } catch (error) {
    console.error(`❌ Telegram bot error for user ${userId} in channel ${channelId || CHAT_ID}:`, error.response?.data || error.message);
  }
};

const checkExpiredUsers = async () => {
  console.log('🔍 Running expiry check based on actual join time...');

  try {
    const now = new Date();
    const ChannelMember = require('../models/ChannelMember');

    // Find expired channel members (based on actual join time + duration)
    const expiredMembers = await ChannelMember.find({
      expiresAt: { $lt: now },
      isActive: true
    });

    console.log(`Found ${expiredMembers.length} expired members`);

    for (const member of expiredMembers) {
      const telegramUserId = member.telegramUserId;
      const channelId = member.channelId;
      
      console.log(`⏰ Processing expired member: ${telegramUserId} from channel: ${channelId}`);
      console.log(`   Joined: ${member.joinedAt.toLocaleString()}`);
      console.log(`   Expired: ${member.expiresAt.toLocaleString()}`);
      console.log(`   Duration was: ${Math.round((member.expiresAt - member.joinedAt) / 1000)} seconds`);

      // Remove from specific Telegram channel
      await removeUserFromTelegram(telegramUserId, null, channelId);

      // Mark as inactive (don't delete - keep for audit)
      await ChannelMember.findByIdAndUpdate(member._id, {
        isActive: false,
        kickedAt: now,
        kickReason: 'Subscription expired'
      });

      console.log(`✅ Kicked ${telegramUserId} from channel ${channelId} and marked as inactive`);
    }

    console.log(`✅ Expiry check completed at ${now.toLocaleString()}`);
  } catch (err) {
    console.error('❌ Expiry check error:', err.message);
  }
};

// Initial run - only if MONGODB is connected
if (mongoose.connection.readyState === 1) {
  checkExpiredUsers();
} else {
  console.log('MONGODB not connected, skipping initial cleanup run');
}

// Run every minute for testing (change to '0 2 * * *' for production - daily at 2 AM)
cron.schedule('* * * * *', checkExpiredUsers);

console.log('⏰ Expiry job scheduled to run every minute for testing');
console.log('📋 Change to "0 2 * * *" for production (daily at 2 AM)');

module.exports = { checkExpiredUsers };