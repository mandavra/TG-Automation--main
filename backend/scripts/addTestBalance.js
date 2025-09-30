const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');
const Admin = require('../models/admin.model');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function addTestBalance() {
  try {
    console.log('=== Adding Test Balance for Admin ===\n');
    
    // Find the admin
    const admin = await Admin.findOne({ email: 'abc@abc.com' });
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('✅ Found admin:', admin.email, 'ID:', admin._id);
    
    // Create test payments with commission
    const testPayments = [
      {
        userid: new mongoose.Types.ObjectId(),
        link_id: 'test_payment_1_' + Date.now(),
        link_url: 'https://test.com/payment1',
        customer_id: 'test_customer_1',
        phone: '9999999001',
        amount: 1000,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 30,
        adminId: admin._id,
        adminCommission: 500, // ₹500 commission
        status: 'SUCCESS'
      },
      {
        userid: new mongoose.Types.ObjectId(),
        link_id: 'test_payment_2_' + Date.now(),
        link_url: 'https://test.com/payment2',
        customer_id: 'test_customer_2',
        phone: '9999999002',
        amount: 1500,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 30,
        adminId: admin._id,
        adminCommission: 750, // ₹750 commission
        status: 'SUCCESS'
      },
      {
        userid: new mongoose.Types.ObjectId(),
        link_id: 'test_payment_3_' + Date.now(),
        link_url: 'https://test.com/payment3',
        customer_id: 'test_customer_3',
        phone: '9999999003',
        amount: 2000,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 30,
        adminId: admin._id,
        adminCommission: 1000, // ₹1000 commission
        status: 'SUCCESS'
      }
    ];
    
    for (let i = 0; i < testPayments.length; i++) {
      const payment = new PaymentLink(testPayments[i]);
      await payment.save();
      console.log(`✅ Created test payment ${i + 1} with ₹${testPayments[i].adminCommission} commission`);
    }
    
    const totalCommission = testPayments.reduce((sum, payment) => sum + payment.adminCommission, 0);
    console.log(`\n✅ Total commission added: ₹${totalCommission}`);
    console.log('Admin should now have ₹2250 available balance');
    
    console.log('\n=== Test Balance Addition Complete ===');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

addTestBalance();