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
    // Find the user "man davra"
    const user = await User.findOne({ 
      firstName: 'man', 
      lastName: 'davra',
      email: 'mandavra12@gmail.com'
    });
    
    if (!user) {
      console.log('❌ User "man davra" not found');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      telegramUserId: user.telegramUserId || 'NOT SET'
    });
    
    // Ask for Telegram ID
    console.log('\n📱 To set the Telegram ID for this user:');
    console.log('1. Ask the user to send a message to @userinfobot on Telegram');
    console.log('2. The bot will reply with their Telegram User ID');
    console.log('3. Use that ID to update the user record');
    
    console.log('\n🔧 To update the Telegram ID manually, run:');
    console.log(`User.findByIdAndUpdate('${user._id}', { telegramUserId: 'USER_TELEGRAM_ID' })`);
    
    console.log('\n📋 Current user details:');
    console.log(`User ID: ${user._id}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Telegram ID: ${user.telegramUserId || 'NOT SET'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}); 