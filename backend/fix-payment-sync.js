const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
require('dotenv').config();

async function fixPaymentSync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/automation');
        console.log('📊 Connected to MongoDB');

        // Find users with successful payments
        const successfulPayments = await PaymentLink.find({
            status: 'SUCCESS'
        }).populate('userid', 'firstName lastName phone telegramUserId');

        console.log(`\n📋 Found ${successfulPayments.length} successful payments:`);

        for (const payment of successfulPayments) {
            const user = payment.userid;
            if (!user) {
                console.log(`❌ Payment ${payment._id}: No user found`);
                continue;
            }

            console.log(`\n👤 User: ${user.firstName} ${user.lastName} (${user.phone})`);
            console.log(`💳 Payment ID: ${payment._id}`);
            console.log(`💰 Amount: ₹${payment.amount}`);
            console.log(`📅 Date: ${payment.purchase_datetime}`);
            console.log(`📱 Telegram ID: ${user.telegramUserId || 'NOT SET'}`);
            console.log(`🔗 Link Delivered: ${payment.link_delivered || false}`);

            // Check if user has invite links
            const inviteLinks = await InviteLink.find({
                userId: user._id,
                is_used: false
            });

            console.log(`📬 Invite Links: ${inviteLinks.length} available`);

            // Update payment status based on conditions
            let shouldUpdate = false;
            let updateData = {};

            // If user has telegramUserId but payment shows as not delivered
            if (user.telegramUserId && !payment.link_delivered) {
                shouldUpdate = true;
                updateData.link_delivered = true;
                updateData.delivery_status = 'delivered';
                updateData.delivery_method = 'telegram';
                updateData.delivered_at = new Date();
                console.log('   🔧 Will mark as delivered - user has Telegram ID');
            }

            // If user has invite links but payment shows as not delivered
            if (inviteLinks.length > 0 && !payment.link_delivered) {
                shouldUpdate = true;
                updateData.link_delivered = true;
                updateData.delivery_status = 'delivered';
                updateData.delivery_method = 'invite_links';
                updateData.delivered_at = new Date();
                console.log('   🔧 Will mark as delivered - user has invite links');
            }

            // If user has no telegram ID and no invite links, mark as pending
            if (!user.telegramUserId && inviteLinks.length === 0) {
                if (payment.delivery_status !== 'pending_telegram_link') {
                    shouldUpdate = true;
                    updateData.delivery_status = 'pending_telegram_link';
                    updateData.failure_reason = 'User needs to connect Telegram account';
                    updateData.telegram_link_required = true;
                    console.log('   🔧 Will mark as pending telegram link');
                }
            }

            if (shouldUpdate) {
                await PaymentLink.findByIdAndUpdate(payment._id, updateData);
                console.log('   ✅ Payment status updated');
            } else {
                console.log('   ℹ️ No update needed');
            }
        }

        console.log('\n📊 Summary of fixes applied:');
        const updatedStats = await PaymentLink.aggregate([
            { $match: { status: 'SUCCESS' } },
            {
                $group: {
                    _id: '$delivery_status',
                    count: { $sum: 1 }
                }
            }
        ]);

        updatedStats.forEach(stat => {
            console.log(`   ${stat._id || 'undefined'}: ${stat.count} payments`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

fixPaymentSync();