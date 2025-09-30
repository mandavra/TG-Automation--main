require('dotenv').config();
const mongoose = require('mongoose');

async function createTestExpiredUser() {
    try {
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        const User = require('./models/user.model');
        const PaymentLink = require('./models/paymentLinkModel');
        
        // Create a test user with Telegram ID
        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'test2@example.com',
            phone: '+919876543211',
            telegramUserId: '987654321', // Test Telegram ID
            City: 'Mumbai',
            stateCode: 27 // Maharashtra state code
        });
        
        await testUser.save();
        console.log('✅ Test user created:', testUser._id);
        
        // Create expired payment for this user
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
        
        const expiredPayment = new PaymentLink({
            userid: testUser._id.toString(),
            link_id: 'TEST_LINK_123',
            link_url: 'https://test-payment-link.com',
            customer_id: 'TEST_CUSTOMER_123',
            phone: '+919876543211',
            plan_name: 'Test Plan',
            duration: 7,
            status: 'SUCCESS',
            purchase_datetime: pastDate,
            expiry_date: pastDate, // Already expired
            amount: 999
        });
        
        await expiredPayment.save();
        console.log('✅ Expired payment created:', expiredPayment._id);
        console.log('✅ Expiry date:', expiredPayment.expiry_date);
        
        // Verify the data
        const verifyUser = await User.findById(testUser._id);
        const verifyPayment = await PaymentLink.findById(expiredPayment._id).populate('userid');
        
        console.log('\n=== VERIFICATION ===');
        console.log('User:', verifyUser.firstName, verifyUser.lastName);
        console.log('Telegram ID:', verifyUser.telegramUserId);
        console.log('Payment Plan:', verifyPayment.plan_name);
        console.log('Payment Status:', verifyPayment.status);
        console.log('Expiry Date:', verifyPayment.expiry_date);
        console.log('Is Expired:', verifyPayment.expiry_date < new Date());
        
        console.log('\n🎯 Now the kick job should find this expired user!');
        console.log('🔄 Restart your server to test the kick functionality.');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nMONGODB connection closed');
    }
}

createTestExpiredUser(); 