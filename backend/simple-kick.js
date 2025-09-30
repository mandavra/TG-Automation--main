const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');

// Configuration - Replace these with your actual values
const MONGODB_URI = 'mongodb://localhost:27017/your_database'; // Replace with your MongoDB connection string
const BOT_TOKEN = 'your_telegram_bot_token'; // Replace with your bot token
const CHANNEL_ID = 'your_channel_id'; // Replace with your channel ID

async function simpleKick() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the specific payment link
    const paymentLink = await PaymentLink.findById('6889aa19945b16c22a7d2470');
    
    if (!paymentLink) {
      console.log('❌ Payment link not found');
      return;
    }

    console.log('📋 Found payment link:', {
      userid: paymentLink.userid,
      plan_name: paymentLink.plan_name,
      expiry_date: paymentLink.expiry_date,
      status: paymentLink.status
    });

    // Get user details
    const user = await User.findById(paymentLink.userid);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Found user:', {
      telegramUserId: user.telegramUserId,
      firstName: user.firstName,
      lastName: user.lastName
    });

    if (!user.telegramUserId) {
      console.log('❌ User has no telegramUserId');
      return;
    }

    // Check if user is expired
    const now = new Date();
    const expiryDate = new Date(paymentLink.expiry_date);
    
    console.log('⏰ Current time:', now.toISOString());
    console.log('📅 Expiry date:', expiryDate.toISOString());
    console.log('🔍 Is expired:', now > expiryDate);

    if (now <= expiryDate) {
      console.log('⚠️ User subscription is not expired yet');
      return;
    }

    // Initialize bot
    const bot = new TelegramBot(BOT_TOKEN, { polling: false });
    console.log('🤖 Bot initialized');

    // Kick user from channel
    console.log(`🚫 Attempting to kick user ${user.telegramUserId} from channel...`);
    
    await bot.banChatMember(CHANNEL_ID, user.telegramUserId);
    console.log('✅ Ban successful');
    
    await bot.unbanChatMember(CHANNEL_ID, user.telegramUserId);
    console.log('✅ Unban successful - user has been kicked');
    
    console.log(`🎯 Successfully kicked user ${user.telegramUserId} (${user.firstName} ${user.lastName})`);
    console.log(`📝 Reason: Plan expired - ${paymentLink.plan_name} (${paymentLink.duration} days)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Check if configuration is set
if (MONGODB_URI === 'mongodb://localhost:27017/your_database') {
  console.log('❌ Please update the configuration in the script:');
  console.log('   - MONGODB_URI: Your MongoDB connection string');
  console.log('   - BOT_TOKEN: Your Telegram bot token');
  console.log('   - CHANNEL_ID: Your Telegram channel ID');
  process.exit(1);
}

console.log('🚀 Starting simple kick script...');
simpleKick(); 