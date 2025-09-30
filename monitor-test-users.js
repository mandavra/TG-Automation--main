// Monitor script to track test users and their expiry times
const mongoose = require('./backend/node_modules/mongoose');
const MONGODB_URI = 'mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg';

async function monitorTestUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔍 Monitoring Test Users...\n');

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

    while (true) {
      console.clear();
      console.log('🔍 Live Test User Monitoring');
      console.log('============================\n');
      console.log(`⏰ Current Time: ${new Date().toLocaleString()}\n`);

      // Find test users
      const testUsers = await User.find({
        email: { $regex: /test_\d+@example\.com/ }
      }).sort({ createdAt: -1 });

      if (testUsers.length === 0) {
        console.log('📝 No test users found');
        console.log('💡 Generate test links with: /getlink 1m, /getlink 2m, etc.');
      } else {
        console.log(`👥 Found ${testUsers.length} test user(s):\n`);

        const now = new Date();
        
        for (const user of testUsers) {
          const payment = await PaymentLink.findOne({ userid: user._id });
          
          console.log(`👤 ${user.firstName} ${user.lastName}`);
          console.log(`   📱 Telegram ID: ${user.telegramUserId}`);
          console.log(`   📊 Status: ${user.telegramJoinStatus || 'pending'}`);
          console.log(`   🕐 Joined: ${user.telegramJoinedAt ? user.telegramJoinedAt.toLocaleString() : 'Not joined'}`);
          
          if (payment) {
            const timeUntilExpiry = payment.expiry_date - now;
            const secondsLeft = Math.ceil(timeUntilExpiry / 1000);
            
            console.log(`   💳 Plan: ${payment.plan_name}`);
            console.log(`   ⏰ Expires: ${payment.expiry_date.toLocaleString()}`);
            
            if (timeUntilExpiry > 0) {
              const minutes = Math.floor(secondsLeft / 60);
              const seconds = secondsLeft % 60;
              console.log(`   ⏳ Time Left: ${minutes}m ${seconds}s`);
              console.log(`   🟢 Status: ACTIVE`);
            } else {
              const expiredSeconds = Math.abs(secondsLeft);
              const expiredMinutes = Math.floor(expiredSeconds / 60);
              const expiredSecondsRem = expiredSeconds % 60;
              console.log(`   ⏰ Expired: ${expiredMinutes}m ${expiredSecondsRem}s ago`);
              console.log(`   🔴 Status: SHOULD BE REMOVED`);
            }
          } else {
            console.log(`   ❌ No payment record found`);
          }
          
          console.log('');
        }

        // Summary
        const activeUsers = await PaymentLink.find({
          expiry_date: { $gt: now },
          status: 'SUCCESS'
        }).populate('userid');

        const expiredUsers = await PaymentLink.find({
          expiry_date: { $lt: now },
          status: 'SUCCESS'
        }).populate('userid');

        console.log('📊 Summary:');
        console.log(`   🟢 Active: ${activeUsers.length}`);
        console.log(`   🔴 Expired (pending removal): ${expiredUsers.length}`);
      }

      console.log('\n🔄 Auto-refreshing every 5 seconds...');
      console.log('Press Ctrl+C to stop monitoring');

      // Wait 5 seconds before next update
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
  }
}

console.log('🚀 Starting Test User Monitor...\n');
monitorTestUsers();