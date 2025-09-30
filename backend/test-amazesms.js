const { sendOtp, sendSMS } = require('./services/amazeSmsService');

async function testAmazeSMS() {
  console.log('Testing AmazeSMS Service...');
  
  try {
    // Test 1: Send OTP
    console.log('\n1. Testing OTP sending...');
    const otpResult = await sendOtp('8126888910'); // Replace with your test number
    console.log('OTP Result:', otpResult);
    
    // Test 2: Send SMS
    console.log('\n2. Testing SMS sending...');
    const smsResult = await sendSMS('Test message from AmazeSMS', '8126888910'); // Replace with your test number
    console.log('SMS Result:', smsResult);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAmazeSMS(); 