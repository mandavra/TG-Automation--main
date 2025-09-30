const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function checkPayments() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Connected to database');
    
    // Find the user
    const user = await User.findOne({ phone: '+917020025010' });
    console.log('\n👤 User found:', user._id, user.phone);
    
    // Check all payment records for this phone number
    const paymentsByPhone = await PaymentLink.find({ phone: '+917020025010' });
    console.log('\n💳 Payments by phone:', paymentsByPhone.length);
    
    // Check all payment records for this user ID
    const paymentsByUserId = await PaymentLink.find({ userid: user._id });
    console.log('💳 Payments by user ID:', paymentsByUserId.length);
    
    // Check payments with different phone formats
    const phoneFormats = ['+917020025010', '917020025010', '+91-7020025010', '7020025010'];
    for (const phone of phoneFormats) {
      const payments = await PaymentLink.find({ phone });
      console.log(`📱 Payments for ${phone}:`, payments.length);
      if (payments.length > 0) {
        payments.forEach(p => {
          console.log(`  - ID: ${p._id}, UserID: ${p.userid}, Phone: ${p.phone}, Amount: ${p.amount}, Status: ${p.status}`);
        });
      }
    }
    
    // Check all recent successful payments to see the data structure
    console.log('\n🔍 Recent successful payments (any user):');
    const recentPayments = await PaymentLink.find({ status: 'SUCCESS' }).sort({ createdAt: -1 }).limit(5);
    recentPayments.forEach(p => {
      console.log(`  - Phone: ${p.phone}, UserID: ${p.userid}, Amount: ${p.amount}, Created: ${p.createdAt}`);
    });
    
    // Search for any payments that might contain this phone number
    console.log('\n🔍 Searching for payments containing "7020025010":');
    const phoneRegex = await PaymentLink.find({ phone: { $regex: '7020025010' } });
    phoneRegex.forEach(p => {
      console.log(`  - Found: ${p.phone}, UserID: ${p.userid}, Amount: ${p.amount}, Status: ${p.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkPayments();