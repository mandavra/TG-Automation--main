require('dotenv').config();
const axios = require('axios');

async function debugAmazeSMS() {
    try {
        console.log('=== AMAZESMS DEBUG ===');
        
        const AMAZESMS_CONFIG = {
            user: process.env.AMAZESMS_USER,
            authkey: process.env.AMAZESMS_AUTHKEY,
            sender: process.env.AMAZESMS_SENDER,
            entityid: process.env.AMAZESMS_ENTITYID || '1001612146484297247',
            templateid: process.env.AMAZESMS_TEMPLATEID || '1007542138834564545'
        };

        console.log('Config:', {
            user: AMAZESMS_CONFIG.user ? 'SET' : 'NOT SET',
            authkey: AMAZESMS_CONFIG.authkey ? 'SET' : 'NOT SET',
            sender: AMAZESMS_CONFIG.sender,
            entityid: AMAZESMS_CONFIG.entityid,
            templateid: AMAZESMS_CONFIG.templateid
        });

        const url = 'https://amazesms.in/api/pushsms';
        const params = {
            user: AMAZESMS_CONFIG.user,
            authkey: AMAZESMS_CONFIG.authkey,
            sender: AMAZESMS_CONFIG.sender,
            mobile: '9876543210',
            text: 'Test message from Vyom Research',
            entityid: AMAZESMS_CONFIG.entityid,
            templateid: AMAZESMS_CONFIG.templateid
        };

        console.log('\nRequest URL:', url);
        console.log('Request params:', params);

        try {
            const response = await axios.get(url, { 
                params,
                timeout: 10000 // 10 second timeout
            });
            
            console.log('\nResponse status:', response.status);
            console.log('Response data:', response.data);
            
        } catch (error) {
            console.log('\nError details:');
            console.log('Status:', error.response?.status);
            console.log('Status text:', error.response?.statusText);
            console.log('Response data:', error.response?.data);
            console.log('Error message:', error.message);
            
            if (error.response?.status === 503) {
                console.log('\n🔴 503 Service Unavailable - AmazeSMS service is down or credentials are invalid');
                console.log('Possible solutions:');
                console.log('1. Check if AmazeSMS credentials are correct');
                console.log('2. Check if AmazeSMS service is available');
                console.log('3. Try using a different SMS service');
            }
        }

    } catch (error) {
        console.error('Debug error:', error);
    }
}

debugAmazeSMS(); 