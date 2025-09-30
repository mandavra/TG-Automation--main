const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function findUser() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Connected to database');
    
    // Search for user with exact phone number from transaction
    const phones = ['+917020025010', '917020025010', '+91-7020025010'];
    
    for (const phone of phones) {
      console.log(`\nSearching for phone: ${phone}`);
      const user = await User.findOne({ phone });
      if (user) {
        console.log('✅ FOUND USER:', user._id, user.phone, user.name);
        
        // Find their payments
        const payments = await PaymentLink.find({ userid: user._id, status: 'SUCCESS' });
        console.log('💰 User payments:', payments.length);
        
        payments.forEach(p => {
          console.log(`  - Amount: ${p.amount}, Plan: ${p.plan_name}, Bundle: ${p.groupId}, Status: ${p.status}`);
        });
        
        return; // Found the user, exit
      } else {
        console.log('❌ Not found');
      }
    }
    
    // Also search by email
    console.log('\nSearching by email: jenishbutani1@gmail.com');
    const user2 = await User.findOne({ email: 'jenishbutani1@gmail.com' });
    if (user2) {
      console.log('✅ FOUND BY EMAIL:', user2._id, user2.phone, user2.email);
      
      // Find their payments
      const payments = await PaymentLink.find({ userid: user2._id, status: 'SUCCESS' });
      console.log('💰 User payments:', payments.length);
      
      payments.forEach(p => {
        console.log(`  - Amount: ${p.amount}, Plan: ${p.plan_name}, Bundle: ${p.groupId}, Status: ${p.status}`);
      });
    }
    
    // Search all users with similar phone
    console.log('\nSearching all users with 7020025010:');
    const allUsers = await User.find({ phone: { $regex: '7020025010' } });
    console.log(`Found ${allUsers.length} users with similar phone:`);
    allUsers.forEach(u => {
      console.log(`  - Phone: ${u.phone}, ID: ${u._id}, Email: ${u.email}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

findUser();