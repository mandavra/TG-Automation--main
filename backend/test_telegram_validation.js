const axios = require('axios');

async function testTelegramValidation() {
    const testData = {
        invite_link: "test_link_123",
        telegram_user_id: "123456789",
        channel_id: "-1002842114460",
        user_info: {
            first_name: "Test",
            last_name: "User",
            username: "testuser"
        },
        channel_info: {
            admin_id: "522249472",
            group_id: "first-group",
            channel_name: "Trial 1"
        }
    };

    try {
        console.log('🔍 Testing telegram validation endpoint...');
        console.log('📤 Request data:', JSON.stringify(testData, null, 2));

        const response = await axios.post('http://localhost:4000/api/telegram/validate-join', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ Response status:', response.status);
        console.log('📥 Response data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error testing validation:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testTelegramValidation();
