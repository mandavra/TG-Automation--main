const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function syncUserStepCompletion() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/automation');
        console.log('📊 Connected to MongoDB for step completion sync');

        // Find all users with successful payments who might have step completion issues
        const usersWithPayments = await PaymentLink.aggregate([
            {
                $match: {
                    status: 'SUCCESS',
                    link_delivered: true
                }
            },
            {
                $group: {
                    _id: '$phone',
                    userId: { $first: '$userid' },
                    successfulPayments: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    latestPayment: { $max: '$purchase_datetime' },
                    paymentIds: { $push: '$_id' }
                }
            }
        ]);

        console.log(`\n📋 Found ${usersWithPayments.length} users with successful payments:`);

        for (const userPayment of usersWithPayments) {
            const { _id: phone, userId, successfulPayments, totalAmount, latestPayment, paymentIds } = userPayment;
            
            console.log(`\n👤 User: ${phone}`);
            console.log(`💳 Successful payments: ${successfulPayments} (₹${totalAmount} total)`);
            console.log(`📅 Latest payment: ${latestPayment}`);
            console.log(`🆔 Payment IDs: ${paymentIds.join(', ')}`);

            // Get user details
            const user = await User.findById(userId);
            if (user) {
                console.log(`   User: ${user.firstName} ${user.lastName}`);
                console.log(`   Telegram ID: ${user.telegramUserId || 'NOT SET'}`);
                console.log(`   Telegram Status: ${user.telegramJoinStatus}`);
            }

            // Check current payment status
            const activePayments = await PaymentLink.find({
                phone: phone,
                status: 'SUCCESS',
                link_delivered: true
            }).sort({ purchase_datetime: -1 });

            console.log(`   📊 Step Completion Status:`);
            console.log(`     ✅ Registration: Completed (user exists)`);
            console.log(`     ✅ Payment: Completed (${activePayments.length} successful payments)`);
            
            // Determine KYC status (placeholder logic)
            const kycCompleted = user && (user.panNumber || user.email || user.dob);
            console.log(`     ${kycCompleted ? '✅' : '⏳'} KYC: ${kycCompleted ? 'Completed' : 'Pending'}`);
            
            // Determine e-sign status (placeholder logic)
            const esignCompleted = false; // Would need to check actual e-sign records
            console.log(`     ${esignCompleted ? '✅' : '⏳'} E-Sign: ${esignCompleted ? 'Completed' : 'Pending'}`);

            console.log(`   🔧 Recommended Frontend localStorage Updates:`);
            console.log(`     setBundleSpecificValue('paymentCompleted', 'true');`);
            
            if (kycCompleted) {
                console.log(`     setBundleSpecificValue('kycCompleted', 'true');`);
            }
            
            if (esignCompleted) {
                console.log(`     setBundleSpecificValue('digioCompleted', 'true');`);
            }
        }

        // Generate summary report
        console.log(`\n📊 Summary Report:`);
        console.log(`   Total users with successful payments: ${usersWithPayments.length}`);
        console.log(`   Users needing payment completion sync: ${usersWithPayments.length}`);
        
        const totalSuccessfulPayments = usersWithPayments.reduce((sum, user) => sum + user.successfulPayments, 0);
        const totalRevenue = usersWithPayments.reduce((sum, user) => sum + user.totalAmount, 0);
        
        console.log(`   Total successful payments: ${totalSuccessfulPayments}`);
        console.log(`   Total revenue: ₹${totalRevenue}`);

        console.log(`\n🔧 Frontend Sync Instructions:`);
        console.log(`   1. For each user with successful payments, the frontend should:`);
        console.log(`      - Set paymentCompleted = 'true' in localStorage`);
        console.log(`      - Check and sync KYC/e-sign status if applicable`);
        console.log(`      - Refresh the step UI to show correct progress`);
        
        console.log(`\n💡 Technical Solution:`);
        console.log(`   - Add a server-side verification endpoint to check user completion status`);
        console.log(`   - Frontend should call this endpoint on load to sync step status`);
        console.log(`   - Update localStorage based on actual database state`);

    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        mongoose.disconnect();
        console.log('\n✅ Sync analysis completed');
    }
}

syncUserStepCompletion();