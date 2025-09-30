const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');

async function fixAdminCommission() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/telegram-bot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all successful payments with missing or zero adminCommission
    const paymentsToFix = await PaymentLink.find({
      status: 'SUCCESS',
      $or: [
        { adminCommission: { $exists: false } },
        { adminCommission: 0 },
        { adminCommission: null }
      ]
    });

    console.log(`Found ${paymentsToFix.length} payments to fix`);

    if (paymentsToFix.length === 0) {
      console.log('No payments need fixing!');
      return;
    }

    // Fix each payment
    for (const payment of paymentsToFix) {
      const adminCommission = payment.amount * 1.0; // 100% commission
      
      await PaymentLink.findByIdAndUpdate(payment._id, {
        adminCommission: adminCommission,
        commissionRate: 100
      });

      console.log(`✅ Fixed payment ${payment._id}: Amount ₹${payment.amount} -> Commission ₹${adminCommission}`);
    }

    console.log(`\n🎉 Fixed ${paymentsToFix.length} payments!`);

    // Verify the fix
    const totalRevenue = await PaymentLink.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$adminCommission' } } }
    ]);

    console.log(`\n📊 Total revenue from all successful payments: ₹${totalRevenue[0]?.total || 0}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixAdminCommission();
