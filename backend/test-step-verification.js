const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

async function testStepVerification() {
    console.log('🚀 Testing Step Verification System');
    console.log('=' .repeat(50));

    try {
        // Test 1: Verify steps for non-existent user
        console.log('\n1. Testing non-existent user...');
        try {
            const response = await axios.get(`${API_BASE}/step-verification/verify-steps/+919999999998`);
            console.log('   Unexpected success:', response.data);
        } catch (error) {
            console.log('   ✅ Expected error:', error.response?.status, error.response?.data?.message);
        }

        // Test 2: Verify steps for existing user (if any)
        console.log('\n2. Testing with phone numbers from server logs...');
        const testPhones = ['+919624165190', '+917202025010', '9999999999', '9875224245'];
        
        for (const phone of testPhones) {
            try {
                console.log(`\n   Testing phone: ${phone}`);
                const response = await axios.get(`${API_BASE}/step-verification/verify-steps/${encodeURIComponent(phone)}`);
                console.log(`   ✅ Success for ${phone}:`, {
                    user: response.data.user?.firstName + ' ' + response.data.user?.lastName,
                    steps: response.data.steps,
                    allCompleted: response.data.allStepsCompleted
                });
                
                // Test getting invite links if user exists
                if (response.data.success) {
                    try {
                        const linksResponse = await axios.get(`${API_BASE}/step-verification/invite-links/${encodeURIComponent(phone)}`);
                        console.log(`   📋 Invite links for ${phone}:`, linksResponse.data.totalLinks, 'links');
                    } catch (linkError) {
                        console.log(`   ⚠️ Invite links error for ${phone}:`, linkError.response?.data?.message);
                    }
                }
                break; // Stop after first successful user
            } catch (error) {
                console.log(`   ❌ Error for ${phone}:`, error.response?.data?.message);
            }
        }

        console.log('\n✅ Step verification tests completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testStepVerification();