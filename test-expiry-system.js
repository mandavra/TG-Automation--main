// Test script to verify user expiry system works correctly
const mongoose = require('./backend/node_modules/mongoose');
const MONGODB_URI = 'mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg';

async function testExpirySystem() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define schemas
    const PaymentLink = mongoose.model('PaymentLink', new mongoose.Schema({
      userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      link_id: String,
      link_url: String,
      customer_id: String,
      phone: String,
      amount: Number,
      plan_id: String,
      plan_name: String,
      status: String,
      purchase_datetime: String,
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

    console.log('\n🧪 Creating Test Users with Different Expiry Times...\n');

    // Create test users with staggered expiry times
    const testUsers = [
      {
        firstName: 'Test',
        lastName: 'User1',
        email: 'test1@example.com',
        phone: '1111111111',
        telegramUserId: '111111111',
        telegramJoinStatus: 'joined',
        telegramJoinedAt: new Date(),
        expiryMinutes: 2, // Expires in 2 minutes
        planName: '2-Minute Test Plan'
      },
      {
        firstName: 'Test',
        lastName: 'User2', 
        email: 'test2@example.com',
        phone: '2222222222',
        telegramUserId: '222222222',
        telegramJoinStatus: 'joined',
        telegramJoinedAt: new Date(),
        expiryMinutes: 5, // Expires in 5 minutes
        planName: '5-Minute Test Plan'
      },
      {
        firstName: 'Test',
        lastName: 'User3',
        email: 'test3@example.com', 
        phone: '3333333333',
        telegramUserId: '333333333',
        telegramJoinStatus: 'joined',
        telegramJoinedAt: new Date(),
        expiryMinutes: 10, // Expires in 10 minutes
        planName: '10-Minute Test Plan'
      }
    ];

    for (const userData of testUsers) {
      // Create user
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        telegramUserId: userData.telegramUserId,
        telegramJoinStatus: userData.telegramJoinStatus,
        telegramJoinedAt: userData.telegramJoinedAt
      });
      await user.save();

      // Create payment record with expiry
      const expiryTime = new Date(Date.now() + (userData.expiryMinutes * 60 * 1000));
      const payment = new PaymentLink({
        userid: user._id,
        link_id: `test_${Date.now()}_${user._id}`,
        link_url: `https://test.cashfree.com/test_${Date.now()}`,
        customer_id: `test_customer_${Date.now()}`,
        phone: userData.phone,
        amount: 100,
        plan_id: `test_plan_${userData.expiryMinutes}min`,
        plan_name: userData.planName,
        status: 'SUCCESS',
        purchase_datetime: new Date().toISOString(),
        expiry_date: expiryTime,
        duration: userData.expiryMinutes * 60
      });
      await payment.save();

      console.log(`✅ Created: ${userData.firstName} ${userData.lastName}`);
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   📱 Telegram ID: ${userData.telegramUserId}`);
      console.log(`   ⏰ Expires: ${expiryTime.toLocaleString()}`);
      console.log(`   🕐 In ${userData.expiryMinutes} minutes`);
      console.log('');
    }

    console.log('🎯 Test Setup Complete!\n');
    console.log('📋 What happens next:');
    console.log('1. User1 will be removed in 2 minutes');
    console.log('2. User2 will be removed in 5 minutes'); 
    console.log('3. User3 will be removed in 10 minutes');
    console.log('\n⚠️  Note: The expiry job runs every minute, so users will be removed');
    console.log('   within 1 minute of their expiry time.');
    
    console.log('\n🔍 Monitor Progress:');
    console.log('• Watch backend logs for "Processing expired payment for user..."');
    console.log('• Check if users are removed from Telegram channel');
    console.log('• Run "node check-test-users.js" to see current status');

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExpirySystem();