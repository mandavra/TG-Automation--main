const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';
const TEST_PHONE = '9999999999'; // Test phone number

async function testOTPFlow() {
  console.log('🧪 Testing OTP Verification Flow Fix...\n');
  
  try {
    // Step 1: Send OTP
    console.log('📱 Step 1: Sending OTP to', TEST_PHONE);
    const sendResponse = await axios.post(`${API_BASE_URL}/otp/send-otp`, {
      phone: TEST_PHONE
    });
    
    console.log('✅ OTP sent successfully');
    console.log('📝 OTP Service used:', sendResponse.data.serviceUsed);
    console.log('📝 OTP Code:', sendResponse.data.smsData?.otp || 'Not shown (real SMS)');
    
    // For mock service, we can get the OTP from the response
    const otpCode = sendResponse.data.smsData?.otp || '1234'; // Default for mock
    
    // Step 2: Verify OTP
    console.log('\n🔍 Step 2: Verifying OTP', otpCode);
    const verifyResponse = await axios.post(`${API_BASE_URL}/otp/verify-otp`, {
      phone: TEST_PHONE,
      otp: otpCode
    });
    
    console.log('✅ OTP verified successfully');
    console.log('👤 User exists:', verifyResponse.data.userExists);
    console.log('📋 User data:', {
      id: verifyResponse.data.user?._id,
      phone: verifyResponse.data.user?.phone,
      isTemporary: verifyResponse.data.user?.isTemporary
    });
    
    if (verifyResponse.data.user && verifyResponse.data.user._id) {
      console.log('\n🎉 SUCCESS: OTP verification now works correctly!');
      console.log('✨ User data is properly returned, frontend should work now.');
    } else {
      console.log('\n❌ ISSUE: User data is still missing');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('📝 Error details:', error.response.data);
    }
  }
}

// Run the test
testOTPFlow();
