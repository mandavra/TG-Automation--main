require('dotenv').config();
const mongoose = require('mongoose');

async function checkExpiredUsers() {
    try {
        console.log('Connecting to MONGODB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MONGODB connected successfully');

        const PaymentLink = require('./models/paymentLinkModel');
        const User = require('./models/user.model');
        const now = new Date();
        
        console.log('\n=== CHECKING EXPIRED USERS ===');
        console.log('Current time:', now.toISOString());
        
        // Find expired users
        const expiredUsers = await PaymentLink.find({
            status: 'SUCCESS',
            expiry_date: { $lt: now }
        }).populate('userid');
        
        console.log('\nExpired users found:', expiredUsers.length);
        
        if (expiredUsers.length > 0) {
            console.log('\n=== EXPIRED USERS DETAILS ===');
            expiredUsers.forEach((payment, index) => {
                const user = payment.userid;
                console.log(`\n${index + 1}. User Details:`);
                console.log(`   Name: ${user?.firstName || 'N/A'} ${user?.lastName || 'N/A'}`);
                console.log(`   Telegram ID: ${user?.telegramUserId || 'NOT SET'}`);
                console.log(`   Plan: ${payment.plan_name || 'N/A'}`);
                console.log(`   Duration: ${payment.duration || 'N/A'} days`);
                console.log(`   Expiry Date: ${payment.expiry_date || 'N/A'}`);
                console.log(`   Purchase Date: ${payment.purchase_datetime || 'N/A'}`);
            });
        } else {
            console.log('\nNo expired users found!');
        }
        
        // Check all users with telegramUserId
        console.log('\n=== ALL USERS WITH TELEGRAM ID ===');
        const allUsers = await PaymentLink.find({
            status: 'SUCCESS'
        }).populate('userid');
        
        const usersWithTelegramId = allUsers.filter(payment => payment.userid?.telegramUserId);
        console.log('Users with Telegram ID:', usersWithTelegramId.length);
        
        usersWithTelegramId.forEach((payment, index) => {
            const user = payment.userid;
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   Telegram ID: ${user.telegramUserId}`);
            console.log(`   Plan: ${payment.plan_name}`);
            console.log(`   Expiry: ${payment.expiry_date}`);
            console.log(`   Status: ${payment.expiry_date < now ? 'EXPIRED' : 'ACTIVE'}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nMONGODB connection closed');
    }
}

checkExpiredUsers(); 