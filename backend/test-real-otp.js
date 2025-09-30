require('dotenv').config();
const mongoose = require('mongoose');

async function testRealOTP() {
    try {
        console.log('=== TESTING REAL OTP SYSTEM ===\n');
        
        // Connect to MONGODB
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        // Test the OTP controller
        const { sendOtpController } = require('./controllers/otpController');
        
        // Get phone number from user input (you can change this)
        const testPhone = '9876543210'; // Change this to your real phone number
        
        console.log('📱 Testing OTP with phone:', testPhone);
        console.log('⚠️  Make sure this is your real phone number!');
        
        const mockReq = {
            body: { phone: testPhone },
            headers: {}
        };
        
        const mockRes = {
            status: function(code) {
                console.log('📡 Response status:', code);
                return this;
            },
            json: function(data) {
                console.log('📡 Response data:', data);
                return this;
            }
        };

        console.log('\n🚀 Sending OTP...');
        await sendOtpController(mockReq, mockRes);

        console.log('\n✅ OTP test completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Check your phone for SMS');
        console.log('2. If no SMS, check server logs for OTP');
        console.log('3. Use the OTP to verify');

    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MONGODB connection closed');
    }
}

// Ask user for phone number
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('📱 Enter your phone number to test OTP:');
console.log('Format: 9876543210 (10 digits)');
console.log('Press Enter to use default: 9876543210');

rl.question('Phone number: ', (phone) => {
    if (phone.trim()) {
        process.env.TEST_PHONE = phone.trim();
    }
    rl.close();
    testRealOTP();
}); 