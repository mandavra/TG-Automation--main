require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

async function fixTelegramId() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    console.log('✅ Connected to MongoDB');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const telegramUserId = args[0];
    
    if (!telegramUserId) {
      console.log('❌ Please provide your Telegram User ID');
      console.log('   Example: node fix-telegram-id.js 123456789');
      console.log('');
      console.log('📋 To get your Telegram User ID:');
      console.log('   1. Open Telegram');
      console.log('   2. Search for @userinfobot');
      console.log('   3. Send any message to the bot');
      console.log('   4. Copy the number it replies with');
      return;
    }

    // Find the specific user by phone number
    let user = await User.findOne({ phone: '8140241212' });
    
    if (!user) {
      console.log('❌ User not found with phone: 8140241212');
      console.log('🔍 Searching for user with ID: 6889a69bab4635b5e5fe278a');
      
      const userById = await User.findById('6889a69bab4635b5e5fe278a');
      if (!userById) {
        console.log('❌ User not found with ID either');
        return;
      }
      
      console.log('✅ Found user by ID');
      user = userById;
    }

    console.log('👤 Found user:', {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      currentTelegramUserId: user.telegramUserId || 'NOT SET'
    });

    // Update the user's telegramUserId
    user.telegramUserId = telegramUserId;
    await user.save();

    console.log('✅ Successfully updated Telegram User ID!');
    console.log('📋 Updated user:', {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      telegramUserId: user.telegramUserId
    });

    console.log('\n🎯 Now you can run the kick script:');
    console.log('   node check-and-kick-user.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

console.log('🚀 Starting fix Telegram ID script...');
fixTelegramId(); 