const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');

require('dotenv').config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Connected to MongoDB');

    // Find recent users
    const users = await User.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n📱 Recent users:');
    users.forEach(user => {
      console.log(`- Phone: ${user.phone}, ID: ${user._id}, Name: ${user.name || 'N/A'}`);
    });

    // Find recent successful payments
    const payments = await PaymentLink.find({ status: 'SUCCESS' }).sort({ createdAt: -1 }).limit(5).populate('userid');
    console.log('\n💰 Recent successful payments:');
    payments.forEach(payment => {
      console.log(`- Phone: ${payment.userid?.phone}, Amount: ${payment.amount}, Plan: ${payment.plan_name}, Bundle: ${payment.groupId}`);
    });

    // Check specific phone numbers
    const phoneNumbers = ['+917020025010', '917020025010', '7020025010'];
    console.log('\n🔍 Checking specific phone numbers:');
    for (const phone of phoneNumbers) {
      const user = await User.findOne({ phone });
      console.log(`- ${phone}: ${user ? 'FOUND' : 'NOT FOUND'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Database check error:', error);
    process.exit(1);
  }
}

checkDatabase();