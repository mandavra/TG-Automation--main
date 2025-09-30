const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');
const WithdrawalRequest = require('../models/withdrawalRequest.model');
const Admin = require('../models/admin.model');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function debugBalance() {
  try {
    console.log('=== Debugging Balance Calculation ===\n');
    
    const admin = await Admin.findOne({ email: 'abc@abc.com' });
    console.log('Admin ID:', admin._id);
    console.log('Admin ID string:', admin._id.toString());
    
    // Test manual aggregation like in controller
    const adminObjectId = new mongoose.Types.ObjectId(admin._id);
    console.log('Converted ObjectId:', adminObjectId);
    
    // Check payments
    console.log('\n--- Checking Payments ---');
    const allPayments = await PaymentLink.find({});
    console.log('Total payments in DB:', allPayments.length);
    
    const adminPayments = await PaymentLink.find({ adminId: adminObjectId });
    console.log('Payments for this admin:', adminPayments.length);
    
    const successfulPayments = await PaymentLink.find({ 
      adminId: adminObjectId, 
      status: 'SUCCESS' 
    });
    console.log('Successful payments:', successfulPayments.length);
    
    if (successfulPayments.length > 0) {
      let totalCommission = 0;
      successfulPayments.forEach(payment => {
        console.log(`Payment: ₹${payment.amount}, Commission: ₹${payment.adminCommission}, Status: ${payment.status}`);
        totalCommission += payment.adminCommission || 0;
      });
      console.log('Total commission calculated manually:', totalCommission);
    }
    
    // Test aggregation like in controller
    console.log('\n--- Testing Aggregation ---');
    const totalRevenue = await PaymentLink.aggregate([
      { $match: { adminId: adminObjectId, status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$adminCommission' } } }
    ]);
    console.log('Aggregation result:', totalRevenue);
    
    // Check withdrawals
    console.log('\n--- Checking Withdrawals ---');
    const totalWithdrawn = await WithdrawalRequest.aggregate([
      { 
        $match: { 
          adminId: adminObjectId, 
          status: { $in: ['approved', 'processed', 'completed'] } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Total withdrawn:', totalWithdrawn);
    
    const totalPending = await WithdrawalRequest.aggregate([
      { 
        $match: { 
          adminId: adminObjectId, 
          status: 'pending' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Total pending:', totalPending);
    
    const revenue = totalRevenue[0]?.total || 0;
    const withdrawn = totalWithdrawn[0]?.total || 0;
    const pending = totalPending[0]?.total || 0;
    const availableBalance = revenue - withdrawn - pending;
    
    console.log('\n--- Final Calculation ---');
    console.log('Revenue:', revenue);
    console.log('Withdrawn:', withdrawn);
    console.log('Pending:', pending);
    console.log('Available Balance:', Math.max(0, availableBalance));
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.connection.close();
  }
}

debugBalance();