require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllUsers() {
    try {
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        const PaymentLink = require('./models/paymentLinkModel');
        const User = require('./models/user.model');
        
        console.log('\n=== ALL PAYMENT LINKS ===');
        const allPayments = await PaymentLink.find({}).populate('userid');
        console.log('Total payments:', allPayments.length);
        
        allPayments.forEach((payment, index) => {
            const user = payment.userid;
            console.log(`\n${index + 1}. Payment Details:`);
            console.log(`   Payment ID: ${payment._id}`);
            console.log(`   Status: ${payment.status}`);
            console.log(`   Plan: ${payment.plan_name || 'N/A'}`);
            console.log(`   Duration: ${payment.duration || 'N/A'} days`);
            console.log(`   Purchase Date: ${payment.purchase_datetime || 'N/A'}`);
            console.log(`   Expiry Date: ${payment.expiry_date || 'N/A'}`);
            
            if (user) {
                console.log(`   User: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
                console.log(`   User ID: ${user._id}`);
                console.log(`   Telegram ID: ${user.telegramUserId || 'NOT SET'}`);
                console.log(`   Email: ${user.email || 'N/A'}`);
                console.log(`   Phone: ${user.phone || 'N/A'}`);
            } else {
                console.log(`   User: NULL (User not found)`);
            }
        });
        
        console.log('\n=== ALL USERS ===');
        const allUsers = await User.find({});
        console.log('Total users:', allUsers.length);
        
        allUsers.forEach((user, index) => {
            console.log(`\n${index + 1}. User Details:`);
            console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
            console.log(`   User ID: ${user._id}`);
            console.log(`   Telegram ID: ${user.telegramUserId || 'NOT SET'}`);
            console.log(`   Email: ${user.email || 'N/A'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Created: ${user.createdAt || 'N/A'}`);
        });
        
        // Check successful payments
        console.log('\n=== SUCCESSFUL PAYMENTS ===');
        const successfulPayments = await PaymentLink.find({ status: 'SUCCESS' }).populate('userid');
        console.log('Successful payments:', successfulPayments.length);
        
        successfulPayments.forEach((payment, index) => {
            const user = payment.userid;
            console.log(`\n${index + 1}. ${user?.firstName || 'N/A'} ${user?.lastName || 'N/A'}`);
            console.log(`   Plan: ${payment.plan_name}`);
            console.log(`   Duration: ${payment.duration} days`);
            console.log(`   Expiry: ${payment.expiry_date}`);
            console.log(`   Telegram ID: ${user?.telegramUserId || 'NOT SET'}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nMONGODB connection closed');
    }
}

checkAllUsers(); 