require('dotenv').config();
const mongoose = require('mongoose');

async function fixUserRelationship() {
    try {
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        const User = require('./models/user.model');
        const PaymentLink = require('./models/paymentLinkModel');
        
        // Find the test user we just created
        const testUser = await User.findOne({ telegramUserId: '987654321' });
        console.log('\n=== TEST USER ===');
        console.log('User ID:', testUser._id);
        console.log('Name:', testUser.firstName, testUser.lastName);
        console.log('Telegram ID:', testUser.telegramUserId);
        
        // Find the payment for this user
        const payment = await PaymentLink.findOne({ 
            userid: testUser._id.toString() 
        });
        
        console.log('\n=== PAYMENT DETAILS ===');
        console.log('Payment ID:', payment._id);
        console.log('User ID in payment:', payment.userid);
        console.log('Plan:', payment.plan_name);
        console.log('Status:', payment.status);
        console.log('Expiry:', payment.expiry_date);
        
        // Update the payment to use ObjectId instead of string
        await PaymentLink.findByIdAndUpdate(payment._id, {
            userid: testUser._id
        });
        
        console.log('\n✅ Updated payment to use ObjectId');
        
        // Verify the relationship
        const updatedPayment = await PaymentLink.findById(payment._id).populate('userid');
        console.log('\n=== UPDATED PAYMENT ===');
        console.log('User:', updatedPayment.userid?.firstName, updatedPayment.userid?.lastName);
        console.log('Telegram ID:', updatedPayment.userid?.telegramUserId);
        console.log('Plan:', updatedPayment.plan_name);
        console.log('Expiry:', updatedPayment.expiry_date);
        console.log('Is Expired:', updatedPayment.expiry_date < new Date());
        
        // Test the kick job query
        const now = new Date();
        const expiredUsers = await PaymentLink.find({
            status: 'SUCCESS',
            expiry_date: { $lt: now }
        }).populate('userid');
        
        console.log('\n=== KICK JOB TEST ===');
        console.log('Expired users found:', expiredUsers.length);
        
        expiredUsers.forEach((payment, index) => {
            const user = payment.userid;
            console.log(`\n${index + 1}. User: ${user?.firstName} ${user?.lastName}`);
            console.log(`   Telegram ID: ${user?.telegramUserId || 'NOT SET'}`);
            console.log(`   Plan: ${payment.plan_name}`);
            console.log(`   Expiry: ${payment.expiry_date}`);
        });
        
        console.log('\n🎯 Now the kick job should work properly!');
        console.log('🔄 Restart your server to test the kick functionality.');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nMONGODB connection closed');
    }
}

fixUserRelationship(); 