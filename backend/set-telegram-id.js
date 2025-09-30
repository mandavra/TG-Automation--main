require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

// Configuration - Replace with your actual MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/your_database'; // Replace with your actual connection string

// Create a separate connection for this script
const scriptConnection = mongoose.createConnection(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Use the script connection for models
const ScriptUser = scriptConnection.model('User', User.schema);

async function setTelegramId() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await scriptConnection.asPromise();
    console.log('✅ Connected to MongoDB');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const telegramUserId = args[0];
    
    if (!telegramUserId) {
      console.log('❌ Please provide your Telegram User ID');
      console.log('   Example: node set-telegram-id.js 123456789');
      console.log('');
      console.log('📋 To get your Telegram User ID:');
      console.log('   1. Open Telegram');
      console.log('   2. Search for @userinfobot');
      console.log('   3. Send any message to the bot');
      console.log('   4. Copy the number it replies with');
      return;
    }

    // Find the specific user
    const user = await ScriptUser.findById('6889a69bab4635b5e5fe278a');
    
    if (!user) {
      console.log('❌ User not found');
      return;
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
    console.log('🔌 Closing script connection...');
    await scriptConnection.close();
    console.log('✅ Script connection closed');
    process.exit(0);
  }
}

// Check if configuration is set
if (MONGODB_URI === 'mongodb://localhost:27017/your_database') {
  console.log('❌ Please update MONGODB_URI in the script with your actual MongoDB connection string');
  process.exit(1);
}

console.log('🚀 Starting set Telegram ID script...');
setTelegramId(); 