require('dotenv').config();
const mongoose = require('mongoose');

async function testOTPFixed() {
    try {
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        // Test the OTP controller directly
        console.log('\n=== TESTING OTP CONTROLLER ===');
        const { sendOtpController } = require('./controllers/otpController');
        
        // Mock request and response objects
        const mockReq = {
            body: { phone: '9876543210' },
            headers: {}
        };
        
        const mockRes = {
            status: function(code) {
                console.log('Response status:', code);
                return this;
            },
            json: function(data) {
                console.log('Response data:', data);
                return this;
            }
        };

        console.log('Testing OTP send with phone:', mockReq.body.phone);
        await sendOtpController(mockReq, mockRes);

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nMONGODB connection closed');
    }
}

testOTPFixed(); 