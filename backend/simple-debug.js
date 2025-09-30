const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');

// Configuration - Replace with your actual MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/your_database'; // Replace with your actual connection string

async function simpleDebug() {
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
      _id: paymentLink._id,
      userid: paymentLink.userid,
      plan_name: paymentLink.plan_name,
      expiry_date: paymentLink.expiry_date,
      status: paymentLink.status,
      duration: paymentLink.duration
    });

    // Get user details
    const user = await User.findById(paymentLink.userid);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Found user:', {
      _id: user._id,
      telegramUserId: user.telegramUserId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    });

    // Check if user is expired
    const now = new Date();
    const expiryDate = new Date(paymentLink.expiry_date);
    
    console.log('⏰ Current time:', now.toISOString());
    console.log('📅 Expiry date:', expiryDate.toISOString());
    console.log('🔍 Is expired:', now > expiryDate);
    console.log('⏱️ Time difference (hours):', (now - expiryDate) / (1000 * 60 * 60));

    // Check if there are other expired users
    const allExpiredUsers = await PaymentLink.find({
      expiry_date: { $lt: now }
    }).populate('userid');

    console.log(`\n📊 Total expired users found: ${allExpiredUsers.length}`);
    
    allExpiredUsers.forEach((pl, index) => {
      const user = pl.userid;
      console.log(`${index + 1}. User: ${user?.telegramUserId || 'No Telegram ID'} (${user?.firstName} ${user?.lastName}) - Plan: ${pl.plan_name} - Status: ${pl.status} - Expired: ${pl.expiry_date}`);
    });

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Payment Link ID: ${paymentLink._id}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Telegram User ID: ${user.telegramUserId || 'NOT SET'}`);
    console.log(`   Plan: ${paymentLink.plan_name}`);
    console.log(`   Status: ${paymentLink.status}`);
    console.log(`   Expired: ${now > expiryDate ? 'YES' : 'NO'}`);
    
    if (user.telegramUserId && now > expiryDate) {
      console.log('\n✅ READY TO KICK: User has Telegram ID and is expired');
    } else if (!user.telegramUserId) {
      console.log('\n❌ CANNOT KICK: User has no Telegram ID');
    } else if (now <= expiryDate) {
      console.log('\n⚠️ CANNOT KICK: User subscription is not expired yet');
    }

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
  console.log('❌ Please update MONGODB_URI in the script with your actual MongoDB connection string');
  console.log('   Example: mongodb://localhost:27017/telegram_bot');
  console.log('   Or: mongodb+srv://username:password@cluster.mongodb.net/database');
  process.exit(1);
}

console.log('🚀 Starting simple debug script...');
simpleDebug(); 