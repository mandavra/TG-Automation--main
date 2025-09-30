const axios = require('axios');
require('dotenv').config();

async function testPaymentLinkCreation() {
  console.log('=== Payment Link Creation Test ===\n');
  
  const testData = {
    customer_id: 'test-customer-123',
    phone: '9999999999',
    amount: 100,
    plan_id: 'test-plan',
    plan_name: 'Test Plan',
    userid: 'test-customer-123',
    purchase_datetime: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    duration: 30
  };

  console.log('Test data:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    console.log('Sending request to create payment link...');
    
    const response = await axios.post('http://localhost:4000/api/payment/test-create-link', {
      customer_id: testData.customer_id,
      phone: testData.phone,
      amount: testData.amount
    }, {
      timeout: 40000
    });

    console.log('✅ Payment link created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Payment link creation failed');
    console.log('Error status:', error.response?.status);
    console.log('Error response:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error message:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testPaymentLinkCreation().catch(console.error); 