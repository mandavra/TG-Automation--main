
const mongoose = require('mongoose');
const PaymentLink = require('./models/paymentLinkModel');
const WithdrawalRequest = require('./models/withdrawalRequest.model');
const Admin = require('./models/admin.model');

async function debugBalanceIssue() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/tg_automation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all admins
    const admins = await Admin.find({});
    console.log(`\nFound ${admins.length} admins:`);
    admins.forEach(admin => {
      console.log(`- ${admin.email} (ID: ${admin._id})`);
    });

    // Check for each admin
    for (const admin of admins) {
      console.log(`\n=== Debugging balance for admin: ${admin.email} (${admin._id}) ===`);
      
      // Check successful payments
      const successfulPayments = await PaymentLink.find({ 
        adminId: admin._id, 
        status: 'SUCCESS' 
      });
      
      console.log(`Successful payments: ${successfulPayments.length}`);
      
      if (successfulPayments.length > 0) {
        console.log('Payment details:');
        successfulPayments.forEach(payment => {
          console.log(`  - Amount: ₹${payment.amount}, Commission: ₹${payment.adminCommission}, Rate: ${payment.commissionRate}%`);
        });
        
        const totalCommission = successfulPayments.reduce((sum, p) => sum + (p.adminCommission || 0), 0);
        console.log(`Total commission: ₹${totalCommission}`);
      }
      
      // Check withdrawal requests
      const withdrawalRequests = await WithdrawalRequest.find({ adminId: admin._id });
      console.log(`Withdrawal requests: ${withdrawalRequests.length}`);
      
      if (withdrawalRequests.length > 0) {
        const pending = withdrawalRequests.filter(w => w.status === 'pending');
        const processed = withdrawalRequests.filter(w => ['approved', 'processed', 'completed'].includes(w.status));
        
        console.log(`  - Pending: ${pending.length} (₹${pending.reduce((sum, w) => sum + w.amount, 0)})`);
        console.log(`  - Processed: ${processed.length} (₹${processed.reduce((sum, w) => sum + w.amount, 0)})`);
      }
      
      // Calculate balance using the same logic as the controller
      const totalRevenue = await PaymentLink.aggregate([
        { $match: { adminId: admin._id, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$adminCommission' } } }
      ]);

      const totalWithdrawn = await WithdrawalRequest.aggregate([
        { 
          $match: { 
            adminId: admin._id, 
            status: { $in: ['approved', 'processed', 'completed'] } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalPending = await WithdrawalRequest.aggregate([
        { 
          $match: { 
            adminId: admin._id, 
            status: 'pending' 
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const revenue = totalRevenue[0]?.total || 0;
      const withdrawn = totalWithdrawn[0]?.total || 0;
      const pending = totalPending[0]?.total || 0;
      const availableBalance = revenue - withdrawn - pending;

      console.log(`\nBalance calculation:`);
      console.log(`  - Total Revenue: ₹${revenue}`);
      console.log(`  - Total Withdrawn: ₹${withdrawn}`);
      console.log(`  - Total Pending: ₹${pending}`);
      console.log(`  - Available Balance: ₹${Math.max(0, availableBalance)}`);
    }

    // Check if there are any payments with adminCommission = 0
    const zeroCommissionPayments = await PaymentLink.find({ 
      status: 'SUCCESS',
      adminCommission: 0 
    });
    
    console.log(`\n=== Payments with zero commission: ${zeroCommissionPayments.length} ===`);
    if (zeroCommissionPayments.length > 0) {
      zeroCommissionPayments.forEach(payment => {
        console.log(`  - Payment ID: ${payment._id}, Amount: ₹${payment.amount}, Commission: ₹${payment.adminCommission}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugBalanceIssue();
