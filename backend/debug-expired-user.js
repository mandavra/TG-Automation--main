const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');

// Connect to MONGODB - you'll need to set your connection string
const MONGODB_URI = process.env.MONGODB_URI || 'MONGODB://localhost:27017/your_database';

async function debugExpiredUser() {
  try {
    // Create a separate connection for this script
    const scriptConnection = mongoose.createConnection(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Use the script connection for models
    const ScriptPaymentLink = scriptConnection.model('PaymentLink', PaymentLink.schema);
    const ScriptUser = scriptConnection.model('User', User.schema);

    console.log('🔗 Connecting to MONGODB...');
    await scriptConnection.asPromise();
    
    console.log('Connected to MONGODB');
    
    // Find the specific payment link
    const paymentLink = await ScriptPaymentLink.findById('6889aa19945b16c22a7d2470');
    
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
    const user = await ScriptUser.findById(paymentLink.userid);
    
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
    const allExpiredUsers = await ScriptPaymentLink.find({
      expiry_date: { $lt: now }
    }).populate('userid');

    console.log(`\nTotal expired users found: ${allExpiredUsers.length}`);
    
    allExpiredUsers.forEach((pl, index) => {
      const user = pl.userid;
      console.log(`${index + 1}. User: ${user?.telegramUserId || 'No Telegram ID'} (${user?.firstName} ${user?.lastName}) - Plan: ${pl.plan_name} - Status: ${pl.status} - Expired: ${pl.expiry_date}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('🔌 Closing script connection...');
    await scriptConnection.close();
    console.log('✅ Script connection closed');
  }
}

// Check if MONGODB_URI is provided
if (!process.env.MONGODB_URI) {
  console.log('Please set MONGODB_URI environment variable or update the script with your connection string');
  console.log('Example: MONGODB_URI=MONGODB://localhost:27017/your_database node debug-expired-user.js');
} else {
  debugExpiredUser();
} 