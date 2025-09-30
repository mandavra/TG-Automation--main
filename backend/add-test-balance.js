const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');
const Admin = require('./models/admin.model');
const User = require('./models/user.model');

async function addTestBalance() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/telegram-bot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get or create a test admin
    let admin = await Admin.findOne({ email: 'test@example.com' });
    if (!admin) {
      admin = new Admin({
        email: 'test@example.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin'
      });
      await admin.save();
      console.log('✅ Created test admin:', admin._id);
    } else {
      console.log('✅ Found existing test admin:', admin._id);
    }

    // Get or create a test user
    let user = await User.findOne({ phone: '+919876543210' });
    if (!user) {
      user = new User({
        firstName: 'Test',
        lastName: 'User',
        phone: '+919876543210',
        adminId: admin._id
      });
      await user.save();
      console.log('✅ Created test user:', user._id);
    } else {
      console.log('✅ Found existing test user:', user._id);
    }

    // Create test successful payments with adminCommission
    const testPayments = [
      {
        userid: user._id,
        link_id: 'TEST_BALANCE_001',
        link_url: 'https://test-payment-001.com',
        customer_id: 'cust_001',
        phone: user.phone,
        amount: 1000,
        plan_id: 'plan_001',
        plan_name: 'Premium Plan',
        status: 'SUCCESS',
        purchase_datetime: new Date(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        duration: 30,
        adminId: admin._id,
        adminCommission: 1000, // 100% commission
        commissionRate: 100
      },
      {
        userid: user._id,
        link_id: 'TEST_BALANCE_002',
        link_url: 'https://test-payment-002.com',
        customer_id: 'cust_002',
        phone: user.phone,
        amount: 500,
        plan_id: 'plan_002',
        plan_name: 'Basic Plan',
        status: 'SUCCESS',
        purchase_datetime: new Date(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        duration: 30,
        adminId: admin._id,
        adminCommission: 500, // 100% commission
        commissionRate: 100
      }
    ];

    // Insert or update test payments
    for (const paymentData of testPayments) {
      const existingPayment = await PaymentLink.findOne({ link_id: paymentData.link_id });
      
      if (existingPayment) {
        await PaymentLink.findByIdAndUpdate(existingPayment._id, paymentData);
        console.log(`✅ Updated payment: ${paymentData.link_id}`);
      } else {
        const payment = new PaymentLink(paymentData);
        await payment.save();
        console.log(`✅ Created payment: ${paymentData.link_id}`);
      }
    }

    // Calculate and display balance
    const totalRevenue = await PaymentLink.aggregate([
      { $match: { adminId: admin._id, status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$adminCommission' } } }
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    console.log(`\n💰 Test admin balance: ₹${revenue}`);
    console.log(`📧 Test admin email: ${admin.email}`);
    console.log(`🆔 Test admin ID: ${admin._id}`);

    console.log('\n🎉 Test balance data added successfully!');
    console.log('You can now test the withdrawal functionality.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addTestBalance();
