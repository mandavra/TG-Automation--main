const cron = require('node-cron');
const PaymentLink = require('../models/paymentLinkModel');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const expiredSubscriptions = await PaymentLink.updateMany(
      {
        status: 'SUCCESS',
        expiry_date: { $lt: new Date() }
      },
      {
        $set: { status: 'EXPIRED' }
      }
    );
    
    console.log(`Updated ${expiredSubscriptions.modifiedCount} expired subscriptions`);
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
  }
});

module.exports = cron; 