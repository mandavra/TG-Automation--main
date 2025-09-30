const axios = require('axios');
require('dotenv').config();

async function fixAmazeSMS() {
    try {
        console.log('=== FIXING AMAZESMS SERVICE ===\n');
        
        const AMAZESMS_CONFIG = {
            user: process.env.AMAZESMS_USER,
            authkey: process.env.AMAZESMS_AUTHKEY,
            sender: process.env.AMAZESMS_SENDER,
            entityid: process.env.AMAZESMS_ENTITYID || '1001612146484297247',
            templateid: process.env.AMAZESMS_TEMPLATEID || '1007542138834564545'
        };

        console.log('Current Config:', {
            user: AMAZESMS_CONFIG.user,
            authkey: AMAZESMS_CONFIG.authkey ? 'SET' : 'NOT SET',
            sender: AMAZESMS_CONFIG.sender,
            entityid: AMAZESMS_CONFIG.entityid,
            templateid: AMAZESMS_CONFIG.templateid
        });

        // Test different approaches
        const testCases = [
            {
                name: 'Standard API Call',
                url: 'https://amazesms.in/api/pushsms',
                method: 'GET',
                params: {
                    user: AMAZESMS_CONFIG.user,
                    authkey: AMAZESMS_CONFIG.authkey,
                    sender: AMAZESMS_CONFIG.sender,
                    mobile: '9876543210',
                    text: 'Test OTP 1234 from Vyom Research',
                    entityid: AMAZESMS_CONFIG.entityid,
                    templateid: AMAZESMS_CONFIG.templateid
                }
            },
            {
                name: 'Without Template ID',
                url: 'https://amazesms.in/api/pushsms',
                method: 'GET',
                params: {
                    user: AMAZESMS_CONFIG.user,
                    authkey: AMAZESMS_CONFIG.authkey,
                    sender: AMAZESMS_CONFIG.sender,
                    mobile: '9876543210',
                    text: 'Test OTP 1234 from Vyom Research'
                }
            },
            {
                name: 'POST Method',
                url: 'https://amazesms.in/api/pushsms',
                method: 'POST',
                data: {
                    user: AMAZESMS_CONFIG.user,
                    authkey: AMAZESMS_CONFIG.authkey,
                    sender: AMAZESMS_CONFIG.sender,
                    mobile: '9876543210',
                    text: 'Test OTP 1234 from Vyom Research',
                    entityid: AMAZESMS_CONFIG.entityid,
                    templateid: AMAZESMS_CONFIG.templateid
                }
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n--- Testing: ${testCase.name} ---`);
            
            try {
                let response;
                
                if (testCase.method === 'GET') {
                    response = await axios.get(testCase.url, {
                        params: testCase.params,
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json'
                        }
                    });
                } else {
                    response = await axios.post(testCase.url, testCase.data, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                }
                
                console.log('✅ SUCCESS!');
                console.log('Status:', response.status);
                console.log('Response:', response.data);
                
                if (response.data && (response.data.STATUS === 'OK' || response.data.status === 'success')) {
                    console.log('🎉 SMS sent successfully!');
                    return true;
                }
                
            } catch (error) {
                console.log('❌ FAILED');
                console.log('Status:', error.response?.status);
                console.log('Error:', error.message);
                
                if (error.response?.status === 503) {
                    console.log('🔴 Service Unavailable - AmazeSMS is down');
                } else if (error.response?.status === 401) {
                    console.log('🔴 Unauthorized - Check credentials');
                } else if (error.response?.status === 400) {
                    console.log('🔴 Bad Request - Check parameters');
                }
            }
        }

        console.log('\n🔍 All tests failed. AmazeSMS service appears to be down.');
        console.log('💡 Solutions:');
        console.log('1. Wait for AmazeSMS service to come back online');
        console.log('2. Check AmazeSMS dashboard for service status');
        console.log('3. Contact AmazeSMS support');
        console.log('4. Use Mock service for now (working perfectly)');

        return false;
        
    } catch (error) {
        console.error('Fix error:', error);
        return false;
    }
}

fixAmazeSMS(); 