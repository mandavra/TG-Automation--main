const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function testAPILogic() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('✅ Connected to database');
    
    const phone = '+917020025010';
    const bundleId = '68c2eb598a16ab4d15e8bc27';
    
    console.log(`\n🔍 Testing API logic for phone: ${phone}, bundle: ${bundleId}`);

    // Find ALL users with this phone number (to handle duplicate accounts)
    const phoneFormats = [phone];
    if (phone.startsWith('+')) {
      phoneFormats.push(phone.substring(1));
    } else {
      phoneFormats.push('+' + phone);
    }
    
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Found ${allUsers.length} users with phone formats:`, phoneFormats);
    
    allUsers.forEach(user => {
      console.log(`  - User ID: ${user._id}, Phone: ${user.phone}, Created: ${user.createdAt}`);
    });
    
    if (allUsers.length === 0) {
      console.log(`❌ No users found for phone: ${phone}`);
      return;
    }

    // Check for successful payments across ALL users with this phone number
    const allUserIds = allUsers.map(u => u._id);
    console.log(`\n💳 Searching payments for user IDs:`, allUserIds.map(id => id.toString()));
    
    const successfulPayment = await PaymentLink.findOne({
      userid: { $in: allUserIds },
      groupId: bundleId,
      status: 'SUCCESS'
    }).sort({ createdAt: -1 });
    
    if (successfulPayment) {
      console.log(`✅ Found successful payment:`, {
        id: successfulPayment._id,
        userid: successfulPayment.userid,
        groupId: successfulPayment.groupId,
        amount: successfulPayment.amount,
        status: successfulPayment.status,
        phone: successfulPayment.phone
      });
    } else {
      console.log(`❌ No successful payment found for bundle ${bundleId}`);
      
      // Check if there are any payments for these users at all
      const anyPayments = await PaymentLink.find({
        userid: { $in: allUserIds }
      });
      console.log(`💰 Total payments for these users: ${anyPayments.length}`);
      anyPayments.forEach(p => {
        console.log(`  - Payment: ${p._id}, Bundle: ${p.groupId}, Status: ${p.status}, Amount: ${p.amount}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAPILogic();