require('dotenv').config();
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Create a separate connection for this script
const scriptConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Use the script connection for models
const ScriptPaymentLink = scriptConnection.model('PaymentLink', PaymentLink.schema);
const ScriptUser = scriptConnection.model('User', User.schema);

// Initialize bot
let bot = null;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: false });
  console.log('Telegram Bot initialized');
} else {
  console.log('BOT_TOKEN not found, will only show expired users without kicking');
}

async function fixExpiredUsers() {
  try {
    console.log('🔗 Connecting to MONGODB...');
    await scriptConnection.asPromise();
    console.log('✅ Connected to MONGODB');
    
    const now = new Date();
    console.log(`Checking for expired users at ${now.toISOString()}`);
    
    // Find all users with expired subscriptions
    const expiredUsers = await ScriptPaymentLink.find({
      expiry_date: { $lt: now }
    }).populate('userid');
    
    console.log(`Found ${expiredUsers.length} expired users`);
    
    let usersKicked = 0;
    let usersSkipped = 0;
    let usersWithErrors = 0;
    
    for (const paymentLink of expiredUsers) {
      const user = paymentLink.userid;
      
      if (!user) {
        console.log(`❌ Payment link ${paymentLink._id} has no associated user`);
        usersSkipped++;
        continue;
      }
      
      if (!user.telegramUserId) {
        console.log(`❌ User ${user._id} (${user.firstName} ${user.lastName}) has no telegramUserId`);
        usersSkipped++;
        continue;
      }
      
      console.log(`\n📋 Processing user: ${user.telegramUserId} (${user.firstName} ${user.lastName})`);
      console.log(`   Plan: ${paymentLink.plan_name} (${paymentLink.duration} days)`);
      console.log(`   Status: ${paymentLink.status}`);
      console.log(`   Expired: ${paymentLink.expiry_date}`);
      
      if (!bot) {
        console.log(`   ⚠️  Would kick user (bot not available)`);
        usersSkipped++;
        continue;
      }
      
      try {
        // Kick user from channel
        console.log(`   🚫 Attempting to kick user...`);
        await bot.banChatMember(CHANNEL_ID, user.telegramUserId);
        console.log(`   ✅ Ban successful`);
        
        await bot.unbanChatMember(CHANNEL_ID, user.telegramUserId);
        console.log(`   ✅ Unban successful - user kicked`);
        
        usersKicked++;
        console.log(`   🎯 Successfully kicked user ${user.telegramUserId}`);
        
      } catch (error) {
        console.error(`   ❌ Error kicking user ${user.telegramUserId}:`, error.message);
        usersWithErrors++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total expired users: ${expiredUsers.length}`);
    console.log(`   Users kicked: ${usersKicked}`);
    console.log(`   Users skipped: ${usersSkipped}`);
    console.log(`   Users with errors: ${usersWithErrors}`);
    
    if (usersKicked > 0) {
      console.log(`\n✅ Successfully processed ${usersKicked} expired users`);
    } else if (usersSkipped > 0) {
      console.log(`\n⚠️  No users were kicked. ${usersSkipped} users were skipped due to missing data.`);
    }
    
  } catch (error) {
    console.error('Error in fixExpiredUsers:', error);
  } finally {
    console.log('🔌 Closing script connection...');
    await scriptConnection.close();
    console.log('✅ Script connection closed');
    process.exit(0);
  }
}

// Check required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!BOT_TOKEN) {
  console.log('⚠️  BOT_TOKEN not found - will only show expired users without kicking');
}

if (!CHANNEL_ID) {
  console.log('⚠️  CHANNEL_ID not found - kicking may fail');
}

// Run the function
fixExpiredUsers(); 