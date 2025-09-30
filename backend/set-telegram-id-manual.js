require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

// Connect to MONGODB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MONGODB connection error:'));
db.once('open', async () => {
  console.log('Connected to MONGODB');
  
  try {
    // User details
    const userId = '6889a69bab4635b5e5fe278a'; // man davra's user ID
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      telegramUserId: user.telegramUserId || 'NOT SET'
    });
    
    // Check if Telegram ID is already set
    if (user.telegramUserId && user.telegramUserId !== 'NOT SET') {
      console.log('✅ Telegram ID is already set:', user.telegramUserId);
      return;
    }
    
    console.log('\n📱 To set Telegram ID:');
    console.log('1. Ask the user to send a message to @userinfobot on Telegram');
    console.log('2. Get their Telegram User ID from the bot response');
    console.log('3. Run this script with the Telegram ID as argument');
    
    // Check if Telegram ID is provided as command line argument
    const telegramId = process.argv[2];
    
    if (telegramId) {
      console.log(`\n🔧 Setting Telegram ID to: ${telegramId}`);
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { telegramUserId: telegramId },
        { new: true }
      );
      
      if (updatedUser) {
        console.log('✅ Successfully updated Telegram ID!');
        console.log('Updated user:', {
          id: updatedUser._id,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`,
          telegramUserId: updatedUser.telegramUserId
        });
      } else {
        console.log('❌ Failed to update user');
      }
    } else {
      console.log('\n💡 Usage: node set-telegram-id-manual.js <TELEGRAM_USER_ID>');
      console.log('Example: node set-telegram-id-manual.js 123456789');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}); 