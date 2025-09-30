const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

async function testAPI() {
  try {
    // Test 1: Test endpoint
    console.log('1. Testing server connection...');
    const testResponse = await axios.get(`${API_BASE}/test`);
    console.log('Test response:', testResponse.data);

    // Test 2: Send OTP
    console.log('\n2. Testing OTP sending...');
    const otpResponse = await axios.post(`${API_BASE}/otp/send-otp`, {
      phone: '+918126888910'
    });
    console.log('OTP response:', otpResponse.data);

    // Test 3: Verify OTP (using the OTP from the response)
    if (otpResponse.data.smsData && otpResponse.data.smsData.otp) {
      console.log('\n3. Testing OTP verification...');
      const verifyResponse = await axios.post(`${API_BASE}/otp/verify-otp`, {
        phone: '+918126888910',
        otp: otpResponse.data.smsData.otp
      });
      console.log('Verify response:', verifyResponse.data);
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAPI(); 