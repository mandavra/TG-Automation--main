const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const Group = require('./models/group.model');
const InviteLink = require('./models/InviteLink');

require('dotenv').config();

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Connected to MongoDB');

    // Create test admin first (minimal admin)
    const admin = new User({
      name: 'Test Admin',
      phone: '+919999999999',
      isAuthenticated: true,
      adminId: new mongoose.Types.ObjectId(), // Self-reference for admin
      createdAt: new Date()
    });
    admin.adminId = admin._id; // Self-reference
    await admin.save();
    console.log('✅ Created test admin:', admin._id);
    
    // Create test user
    const user = new User({
      name: 'Test User',
      phone: '+917020025010',
      isAuthenticated: true,
      adminId: admin._id, // Reference to admin
      createdAt: new Date()
    });
    await user.save();
    console.log('✅ Created test user:', user._id);

    // Create or find test group/bundle
    let group = await Group.findOne({ route: 'maintest' });
    if (!group) {
      group = new Group({
        name: 'Premium Bundle',
        route: 'maintest',
        description: 'Test premium bundle',
        channels: [],
        adminId: admin._id, // Use test admin
        createdBy: admin._id, // Required field
        createdAt: new Date()
      });
      await group.save();
      console.log('✅ Created test group:', group._id);
    }

    // Create successful payment record
    const payment = new PaymentLink({
      userid: user._id,
      link_id: 'TEST_PAYMENT_' + Date.now(),
      link_url: 'https://test-payment-link.com',
      customer_id: user._id.toString(),
      phone: user.phone,
      amount: 100,
      plan_id: 'test_plan_001',
      plan_name: 'Premium Monthly',
      status: 'SUCCESS',
      purchase_datetime: new Date(),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      duration: 30,
      utr: 'UTR_TEST_' + Date.now(),
      groupId: group._id,
      adminId: admin._id,
      adminCommission: 100, // 100% commission to admin
      commissionRate: 100,
      createdAt: new Date()
    });
    await payment.save();
    console.log('✅ Created test payment:', payment._id);

    // Create invite links
    const inviteLink = new InviteLink({
      link: 'https://t.me/+TestInviteLink123',
      userId: user._id,
      groupId: group._id,
      paymentLinkId: payment._id,
      adminId: admin._id, // Required field
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_used: false,
      createdAt: new Date()
    });
    await inviteLink.save();
    console.log('✅ Created test invite link:', inviteLink._id);

    console.log('\n🎉 Test data created successfully!');
    console.log('- User phone: +917020025010');
    console.log('- Bundle ID:', group._id);
    console.log('- Payment ID:', payment._id);
    console.log('- Telegram Link:', inviteLink.link);
    console.log('\nNow test with: /pc/maintest');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();