const axios = require('axios');
const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');
const Admin = require('../models/admin.model');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function debugAdminBalance() {
  try {
    console.log('=== Debugging Admin Balance Calculation ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login as admin
    console.log('Step 1: Login as regular admin...');
    const adminLoginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    const adminData = adminLoginResponse.data.admin;
    const adminId = adminData.id;
    
    console.log('✅ Admin logged in successfully, ID:', adminId);
    console.log('Admin ID type:', typeof adminId);
    
    // Step 2: Check admin in database
    const adminInDb = await Admin.findById(adminId);
    console.log('\nAdmin in DB:', adminInDb ? 'Found' : 'Not Found');
    if (adminInDb) {
      console.log('DB Admin ID:', adminInDb._id.toString());
      console.log('DB Admin Email:', adminInDb.email);
    }
    
    // Step 3: Check existing payments for this admin
    const existingPayments = await PaymentLink.find({ adminId: adminId });
    console.log('\nExisting payments for admin:', existingPayments.length);
    
    if (existingPayments.length > 0) {
      console.log('Sample payment adminId:', existingPayments[0].adminId.toString());
      console.log('Sample payment adminCommission:', existingPayments[0].adminCommission);
      console.log('Sample payment status:', existingPayments[0].status);
    }
    
    // Step 4: Test aggregation query directly
    const totalRevenue = await PaymentLink.aggregate([
      { $match: { adminId: new mongoose.Types.ObjectId(adminId), status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$adminCommission' } } }
    ]);
    
    console.log('\nDirect aggregation result:', totalRevenue);
    
    // Step 5: Try with string comparison
    const totalRevenueString = await PaymentLink.aggregate([
      { $match: { adminId: adminId, status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$adminCommission' } } }
    ]);
    
    console.log('String adminId aggregation result:', totalRevenueString);
    
    // Step 6: Create a test payment with proper adminId
    console.log('\nStep 6: Creating test payment with verified adminId...');
    const testPayment = new PaymentLink({
      userid: new mongoose.Types.ObjectId(),
      link_id: 'test_debug_' + Date.now(),
      link_url: 'https://test.com/debug',
      customer_id: 'test_debug_customer',
      phone: '9999999990',
      amount: 500,
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 30,
      adminId: new mongoose.Types.ObjectId(adminId), // Using ObjectId conversion
      adminCommission: 50,
      status: 'SUCCESS'
    });
    
    await testPayment.save();
    console.log('✅ Test payment created');
    
    // Step 7: Test balance calculation again
    console.log('\nStep 7: Testing balance calculation after new payment...');
    const balanceResponse = await axios.get(`${baseURL}/api/withdrawal/balance`, { 
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('Balance after new payment:', balanceResponse.data);
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    mongoose.connection.close();
  }
}

debugAdminBalance();