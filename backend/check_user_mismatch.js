const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function checkUserMismatch() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Connected to database');
    
    // Find all users with this phone number
    const allUsers = await User.find({ phone: '+917020025010' });
    console.log(`\n👥 All users with phone +917020025010: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`  - ID: ${user._id}, Name: ${user.name || 'undefined'}, Email: ${user.email || 'undefined'}, Created: ${user.createdAt}`);
    });
    
    // Find the payment user IDs
    const paymentUserIds = ['68c2eb598a16ab4d15e8bc1e', '68c2eb798514415a0b155713'];
    
    for (const userId of paymentUserIds) {
      console.log(`\n🔍 Checking user ID: ${userId}`);
      const user = await User.findById(userId);
      if (user) {
        console.log(`  ✅ User exists: Phone: ${user.phone}, Name: ${user.name || 'undefined'}, Email: ${user.email || 'undefined'}`);
        
        // Find payments for this user
        const payments = await PaymentLink.find({ userid: userId });
        console.log(`  💳 Payments: ${payments.length}`);
        payments.forEach(p => {
          console.log(`    - Amount: ${p.amount}, Status: ${p.status}, Phone: ${p.phone}, Created: ${p.createdAt}`);
        });
      } else {
        console.log(`  ❌ User not found`);
      }
    }
    
    // Check if there are multiple accounts with same phone
    console.log(`\n📱 Searching all users with phone containing "7020025010":`);
    const phoneUsers = await User.find({ phone: { $regex: '7020025010' } });
    phoneUsers.forEach(user => {
      console.log(`  - ID: ${user._id}, Phone: ${user.phone}, Name: ${user.name || 'undefined'}, Created: ${user.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkUserMismatch();