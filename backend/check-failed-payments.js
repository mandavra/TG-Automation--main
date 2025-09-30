const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function checkFailedPayments() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/automation');
    console.log('📊 Connected to MongoDB\n');
    
    // Find all successful payments that haven't been delivered
    const failedDeliveries = await PaymentLink.find({
      status: 'SUCCESS',
      $or: [
        { link_delivered: { $ne: true } },
        { link_delivered: { $exists: false } }
      ]
    }).populate('userid', 'firstName lastName phone telegramUserId email')
      .sort({ purchase_datetime: -1 })
      .limit(20);
    
    console.log(`📋 Found ${failedDeliveries.length} failed payment deliveries:\n`);
    
    failedDeliveries.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ID: ${payment._id}`);
      console.log(`   User: ${payment.userid?.firstName || 'Unknown'} ${payment.userid?.lastName || ''}`);
      console.log(`   Phone: ${payment.userid?.phone || 'Not set'}`);
      console.log(`   Telegram ID: ${payment.userid?.telegramUserId || '❌ NOT SET'}`);
      console.log(`   Email: ${payment.userid?.email || 'Not set'}`);
      console.log(`   Plan: ${payment.plan_name}`);
      console.log(`   Amount: ${payment.amount}`);
      console.log(`   Date: ${payment.purchase_datetime}`);
      console.log(`   Link Delivered: ${payment.link_delivered || false}`);
      console.log(`   Delivery Status: ${payment.delivery_status || 'Not set'}`);
      console.log('   ' + '-'.repeat(50));
    });

    // Get summary statistics
    const totalSuccessfulPayments = await PaymentLink.countDocuments({ status: 'SUCCESS' });
    const totalDeliveredPayments = await PaymentLink.countDocuments({ 
      status: 'SUCCESS', 
      link_delivered: true 
    });
    const totalFailedDeliveries = totalSuccessfulPayments - totalDeliveredPayments;

    console.log('\n📊 Summary Statistics:');
    console.log(`   Total Successful Payments: ${totalSuccessfulPayments}`);
    console.log(`   Successfully Delivered: ${totalDeliveredPayments}`);
    console.log(`   Failed Deliveries: ${totalFailedDeliveries}`);
    console.log(`   Delivery Success Rate: ${totalSuccessfulPayments > 0 ? ((totalDeliveredPayments / totalSuccessfulPayments) * 100).toFixed(2) : 0}%`);

  } catch (error) {
    console.error('❌ Error checking failed payments:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkFailedPayments();