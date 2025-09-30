// Script to check status of test users and their expiry times
const mongoose = require('./backend/node_modules/mongoose');
const MONGODB_URI = 'mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg';

async function checkTestUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define schemas
    const PaymentLink = mongoose.model('PaymentLink', new mongoose.Schema({
      userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      link_id: String,
      customer_id: String,
      phone: String,
      amount: Number,
      plan_name: String,
      status: String,
      expiry_date: Date,
      duration: Number
    }, { timestamps: true }));

    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      telegramUserId: String,
      telegramJoinStatus: String,
      telegramJoinedAt: Date
    }, { timestamps: true }));

    // Find test users and their payment records
    const testUsers = await User.find({
      email: { $regex: /test\d+@example\.com/ }
    });

    console.log(`📊 Found ${testUsers.length} test users:\n`);

    const now = new Date();
    
    for (const user of testUsers) {
      const payment = await PaymentLink.findOne({ userid: user._id });
      
      console.log(`👤 ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 Telegram ID: ${user.telegramUserId}`);
      console.log(`   📊 Join Status: ${user.telegramJoinStatus || 'pending'}`);
      
      if (payment) {
        const timeUntilExpiry = payment.expiry_date - now;
        const minutesLeft = Math.ceil(timeUntilExpiry / (1000 * 60));
        
        console.log(`   💳 Plan: ${payment.plan_name}`);
        console.log(`   ⏰ Expires: ${payment.expiry_date.toLocaleString()}`);
        
        if (timeUntilExpiry > 0) {
          console.log(`   🕐 Time Left: ${minutesLeft} minutes`);
          console.log(`   🟢 Status: ACTIVE`);
        } else {
          console.log(`   ⏰ Time Left: EXPIRED ${Math.abs(minutesLeft)} minutes ago`);
          console.log(`   🔴 Status: SHOULD BE REMOVED`);
        }
      } else {
        console.log(`   ❌ No payment record found`);
      }
      
      console.log('');
    }

    // Check for expired payments that should trigger removal
    const expiredPayments = await PaymentLink.find({
      expiry_date: { $lt: now },
      status: 'SUCCESS'
    }).populate('userid');

    console.log(`🚨 Expired Payments (should be processed): ${expiredPayments.length}\n`);
    
    for (const payment of expiredPayments) {
      if (payment.userid && payment.userid.email && payment.userid.email.includes('test')) {
        console.log(`⚠️  EXPIRED: ${payment.userid.firstName} ${payment.userid.lastName}`);
        console.log(`   📱 Telegram ID: ${payment.userid.telegramUserId}`);
        console.log(`   ⏰ Expired: ${payment.expiry_date.toLocaleString()}`);
      }
    }

    console.log('\n🔄 Next Steps:');
    console.log('• Wait for the expiry job to run (every minute)');
    console.log('• Watch backend logs for removal activity'); 
    console.log('• Run this script again to see updated status');
    console.log('• Check Telegram channel to verify users are removed');

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTestUsers();