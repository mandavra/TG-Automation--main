const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Plan = require('../models/plan');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function createTestData() {
  try {
    console.log('🔄 Creating test data...');

    // First, get or create a test admin ID (you may need to adjust this)
    const testAdminId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'); // Default test admin ID

    // Create test users
    const testUsers = [
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+919876543210',
        City: 'Mumbai',
        State: 'Maharashtra',
        telegramUserId: '@johndoe123',
        telegramJoinStatus: 'joined',
        telegramJoinedAt: new Date(),
        adminId: testAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+919876543211',
        City: 'Delhi',
        State: 'Delhi',
        telegramUserId: '@janesmith456',
        telegramJoinStatus: 'pending',
        adminId: testAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob.wilson@example.com',
        phone: '+919876543212',
        City: 'Bangalore',
        State: 'Karnataka',
        telegramUserId: '@bobwilson789',
        telegramJoinStatus: 'joined',
        telegramJoinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        adminId: testAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert or update users
    for (const user of testUsers) {
      const { _id, ...userWithoutId } = user;
      await User.findOneAndUpdate(
        { email: user.email },
        userWithoutId,
        { upsert: true, new: true }
      );
      console.log(`✅ Created/Updated user: ${user.firstName} ${user.lastName}`);
    }

    // Get the created users
    const users = await User.find({ 
      email: { $in: testUsers.map(u => u.email) }
    });

    // Create test plans using the correct schema
    const testPlans = [
      {
        _id: new mongoose.Types.ObjectId(),
        type: 'Base',
        mrp: 999,
        discountPrice: 899,
        duration: 'month',
        adminId: testAdminId,
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        type: 'Pro',
        mrp: 1999,
        discountPrice: 1799,
        duration: 'month',
        adminId: testAdminId,
        isActive: true
      }
    ];

    // Insert or update plans
    for (const plan of testPlans) {
      const { _id, ...planWithoutId } = plan;
      await Plan.findOneAndUpdate(
        { type: plan.type, adminId: testAdminId },
        planWithoutId,
        { upsert: true, new: true }
      );
      console.log(`✅ Created/Updated plan: ${plan.type} Plan`);
    }

    // Get the created plans
    const plans = await Plan.find({
      type: { $in: testPlans.map(p => p.type) },
      adminId: testAdminId
    });

    // Create test payments
    const testPayments = [
      {
        _id: new mongoose.Types.ObjectId(),
        userid: users[0]._id,
        link_id: 'pl_test_success_123',
        link_url: 'https://payments.cashfree.com/links/pl_test_success_123',
        customer_id: 'cust_john_doe_123',
        phone: users[0].phone,
        amount: plans[0].mrp,
        plan_id: plans[0]._id.toString(),
        plan_name: `${plans[0].type} Plan`,
        status: 'SUCCESS',
        purchase_datetime: new Date(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        duration: 30,
        transactionId: 'TXN_SUCCESS_123456789',
        paymentId: 'pay_success_123456789',
        adminId: testAdminId,
        adminCommission: plans[0].mrp * 0.97, // 97% to admin
        commissionRate: 97,
        link_delivered: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userid: users[1]._id,
        link_id: 'pl_test_pending_456',
        link_url: 'https://payments.cashfree.com/links/pl_test_pending_456',
        customer_id: 'cust_jane_smith_456',
        phone: users[1].phone,
        amount: plans[1].mrp,
        plan_id: plans[1]._id.toString(),
        plan_name: `${plans[1].type} Plan`,
        status: 'PENDING',
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        duration: 90,
        adminId: testAdminId,
        adminCommission: 0,
        commissionRate: 97,
        link_delivered: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userid: users[2]._id,
        link_id: 'pl_test_failed_789',
        link_url: 'https://payments.cashfree.com/links/pl_test_failed_789',
        customer_id: 'cust_bob_wilson_789',
        phone: users[2].phone,
        amount: plans[0].mrp,
        plan_id: plans[0]._id.toString(),
        plan_name: `${plans[0].type} Plan`,
        status: 'FAILED',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        duration: 30,
        failure_reason: 'Insufficient funds in customer account',
        adminId: testAdminId,
        adminCommission: 0,
        commissionRate: 97,
        link_delivered: true,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        updatedAt: new Date()
      }
    ];

    // Insert or update payments
    for (const payment of testPayments) {
      const { _id, ...paymentWithoutId } = payment;
      await PaymentLink.findOneAndUpdate(
        { link_id: payment.link_id },
        paymentWithoutId,
        { upsert: true, new: true }
      );
      console.log(`✅ Created/Updated payment: ${payment.link_id} (${payment.status})`);
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users created: ${testUsers.length}`);
    console.log(`📋 Plans created: ${testPlans.length}`);
    console.log(`💳 Payments created: ${testPayments.length}`);
    
    console.log('\n💡 Test Payment IDs you can use:');
    testPayments.forEach(payment => {
      console.log(`   ${payment._id} - ${payment.status} payment for ${payment.plan_name}`);
    });

    console.log('\n🌐 You can now test the payment details functionality with these payment IDs!');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createTestData();