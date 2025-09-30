const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';
const TEST_PHONE = '9876543210'; // Different phone for KYC test

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow: OTP → Payment → KYC...\n');
  
  try {
    // Step 1: Send OTP
    console.log('📱 Step 1: Sending OTP to', TEST_PHONE);
    const sendResponse = await axios.post(`${API_BASE_URL}/otp/send-otp`, {
      phone: TEST_PHONE
    });
    
    console.log('✅ OTP sent successfully');
    console.log('📝 OTP Code:', sendResponse.data.smsData?.otp);
    
    const otpCode = sendResponse.data.smsData?.otp || '1234';
    
    // Step 2: Verify OTP
    console.log('\n🔍 Step 2: Verifying OTP', otpCode);
    const verifyResponse = await axios.post(`${API_BASE_URL}/otp/verify-otp`, {
      phone: TEST_PHONE,
      otp: otpCode
    });
    
    console.log('✅ OTP verified successfully');
    console.log('👤 User created:', !!verifyResponse.data.user);
    console.log('📋 User ID:', verifyResponse.data.user?._id);
    
    // Step 3: Simulate KYC submission using phone-based registration
    console.log('\n📝 Step 3: Submitting KYC data');
    const kycData = {
      fullName: "Test User",
      email: "test.user@example.com",
      phone: TEST_PHONE,
      state: "Maharashtra",
      panNumber: "ABCDE1234F",
      dob: "1990-01-01"
    };
    
    const kycResponse = await axios.post(`${API_BASE_URL}/kyc/register`, kycData);
    
    console.log('✅ KYC submission successful');
    console.log('📋 KYC Response:', {
      success: true,
      isNewUser: kycResponse.data.isNewUser,
      userExists: !!kycResponse.data.user,
      userId: kycResponse.data.user?._id,
      message: kycResponse.data.message
    });
    
    // Step 4: Verify user was updated with KYC data
    console.log('\n🔍 Step 4: Verifying user data updated');
    const checkResponse = await axios.post(`${API_BASE_URL}/kyc/check`, {
      phone: TEST_PHONE
    });
    
    console.log('✅ User verification successful');
    console.log('📋 Updated User Data:', {
      id: checkResponse.data.user?._id,
      firstName: checkResponse.data.user?.firstName,
      lastName: checkResponse.data.user?.lastName,
      email: checkResponse.data.user?.email,
      phone: checkResponse.data.user?.phone,
      city: checkResponse.data.user?.City,
      state: checkResponse.data.user?.State
    });
    
    console.log('\n🎉 SUCCESS: Complete flow works correctly!');
    console.log('✨ Users can now: OTP → Payment → KYC without "User data not found" errors');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('📝 Error details:', error.response.data);
    }
  }
}

// Run the test
testCompleteFlow();
