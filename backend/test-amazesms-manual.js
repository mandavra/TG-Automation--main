const axios = require('axios');

async function testAmazeSMSManual() {
    try {
        console.log('=== TESTING AMAZESMS MANUAL URL ===');
        
        // The exact URL from user
        const url = 'https://amazesms.in/api/pushsms?user=vyomResearch&authkey=928lk7F8tFoQ&sender=VYMRSH&mobile=8126888910&text=Your OTP is 9874. It is valid for 10 minutes. Do not share this with anyone. - Vyom Research&entityid=1001612146484297247&templateid=1007542138834564545';
        
        console.log('Testing URL:', url);
        console.log('\nParameters:');
        console.log('- user: vyomResearch');
        console.log('- authkey: 928lk7F8tFoQ');
        console.log('- sender: VYMRSH');
        console.log('- mobile: 8126888910');
        console.log('- text: Your OTP is 9874. It is valid for 10 minutes. Do not share this with anyone. - Vyom Research');
        console.log('- entityid: 1001612146484297247');
        console.log('- templateid: 1007542138834564545');
        
        console.log('\n=== MAKING REQUEST ===');
        
        try {
            const response = await axios.get(url, {
                timeout: 15000, // 15 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            console.log('\n✅ SUCCESS!');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('Response Data:', response.data);
            
            if (response.data && (response.data.STATUS === 'OK' || response.data.status === 'success')) {
                console.log('\n🎉 SMS sent successfully!');
            } else {
                console.log('\n⚠️ API responded but status might indicate failure');
            }
            
        } catch (error) {
            console.log('\n❌ ERROR:');
            console.log('Status:', error.response?.status);
            console.log('Status Text:', error.response?.statusText);
            console.log('Response Data:', error.response?.data);
            console.log('Error Message:', error.message);
            
            if (error.response?.status === 503) {
                console.log('\n🔴 503 Service Unavailable - AmazeSMS service is down');
            } else if (error.response?.status === 401) {
                console.log('\n🔴 401 Unauthorized - Check credentials');
            } else if (error.response?.status === 400) {
                console.log('\n🔴 400 Bad Request - Check parameters');
            }
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testAmazeSMSManual(); 