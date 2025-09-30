const axios = require('axios');

async function testWithdrawalRequest() {
  try {
    console.log('=== Testing Admin Withdrawal Request ===\n');
    
    const baseURL = 'http://localhost:4000';
    
    // Step 1: Login as admin
    console.log('Step 1: Login as regular admin...');
    const adminLoginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'abc@abc.com',
      password: 'testpassword123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Admin logged in successfully');
    
    // Step 2: Check balance first
    console.log('\nStep 2: Check admin balance...');
    const balanceResponse = await axios.get(`${baseURL}/api/withdrawal/balance`, { headers: adminHeaders });
    console.log('Balance data:', balanceResponse.data);
    
    // Step 3: Test withdrawal request with UPI
    console.log('\nStep 3: Submit UPI withdrawal request...');
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
    
    // Step 4: Test withdrawal request with Bank Transfer
    console.log('\nStep 4: Submit Bank Transfer withdrawal request...');
    const bankRequestData = {
      amount: 100,
      paymentMethod: "bank_transfer",
      bankDetails: {
        accountNumber: "1234567890",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        accountHolderName: "Test Admin"
      }
    };
    
    try {
      const bankResponse = await axios.post(`${baseURL}/api/withdrawal/request`, bankRequestData, { headers: adminHeaders });
      console.log('✅ Bank transfer request successful:', bankResponse.data);
    } catch (error) {
      console.log('❌ Bank transfer request failed:', error.response?.data || error.message);
    }
    
    // Step 5: Check requests after submission
    console.log('\nStep 5: Check withdrawal requests after submission...');
    const requestsResponse = await axios.get(`${baseURL}/api/withdrawal/my-requests`, { headers: adminHeaders });
    console.log('Withdrawal requests:', requestsResponse.data);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testWithdrawalRequest();