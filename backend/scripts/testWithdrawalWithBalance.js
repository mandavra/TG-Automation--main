const axios = require('axios');
const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function testWithdrawalWithBalance() {
  try {
    console.log('=== Testing Admin Withdrawal with Balance ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login as admin to get admin ID
    console.log('Step 1: Login as regular admin...');
    const adminLoginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    const adminData = adminLoginResponse.data.admin;
    const adminId = adminData.id;
    
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Admin logged in successfully, ID:', adminId);
    
    // Step 2: Create some fake successful payments to give admin commission
    console.log('\nStep 2: Creating fake successful payments for admin commission...');
    
    const payment1 = new PaymentLink({
      userid: new mongoose.Types.ObjectId(),
      link_id: 'test_link_1_' + Date.now(),
      link_url: 'https://test.com/payment1',
      customer_id: 'test_customer_1',
      phone: '9999999999',
      amount: 1000,
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      duration: 30, // 30 days
      adminId: new mongoose.Types.ObjectId(adminId),
      adminCommission: 100, // 10% commission
      status: 'SUCCESS'
    });
    
    const payment2 = new PaymentLink({
      userid: new mongoose.Types.ObjectId(),
      link_id: 'test_link_2_' + Date.now(),
      link_url: 'https://test.com/payment2',
      customer_id: 'test_customer_2',
      phone: '9999999998',
      amount: 2000,
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      duration: 30, // 30 days
      adminId: new mongoose.Types.ObjectId(adminId),
      adminCommission: 200, // 10% commission
      status: 'SUCCESS'
    });
    
    await payment1.save();
    await payment2.save();
    
    console.log('✅ Created 2 successful payments with total commission: ₹300');
    
    // Step 3: Check balance
    console.log('\nStep 3: Check admin balance after adding payments...');
    const balanceResponse = await axios.get(`${baseURL}/api/withdrawal/balance`, { headers: adminHeaders });
    console.log('Balance data:', balanceResponse.data);
    
    if (balanceResponse.data.balance.availableBalance > 0) {
      // Step 4: Test withdrawal request with UPI (small amount)
      console.log('\nStep 4: Submit UPI withdrawal request for ₹100...');
      const upiRequestData = {
        amount: 100,
        paymentMethod: "upi",
        bankDetails: {
          upiId: "admin@paytm"
        }
      };
      
      try {
        const upiResponse = await axios.post(`${baseURL}/api/withdrawal/request`, upiRequestData, { headers: adminHeaders });
        console.log('✅ UPI request successful:', upiResponse.data);
      } catch (error) {
        console.log('❌ UPI request failed:', error.response?.data || error.message);
      }
      
      // Step 5: Check requests after submission
      console.log('\nStep 5: Check withdrawal requests after submission...');
      const requestsResponse = await axios.get(`${baseURL}/api/withdrawal/my-requests`, { headers: adminHeaders });
      console.log('Withdrawal requests count:', requestsResponse.data.withdrawalRequests.length);
      if (requestsResponse.data.withdrawalRequests.length > 0) {
        console.log('Latest request:', requestsResponse.data.withdrawalRequests[0]);
      }
    } else {
      console.log('❌ Balance is still 0, commission calculation might not be working');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    mongoose.connection.close();
  }
}

testWithdrawalWithBalance();