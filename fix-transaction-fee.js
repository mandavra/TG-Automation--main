const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PaymentLink = require('./backend/models/paymentLinkModel');
const Admin = require('./backend/models/admin.model');

async function fixTransactionFee() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation');
    console.log('✅ Connected to MongoDB');

    const paymentId = '68c5559cbcca71526eff7bf1'; // Your transaction ID
    
    // Find the payment
    console.log('🔍 Finding payment:', paymentId);
    const payment = await PaymentLink.findById(paymentId);
    
    if (!payment) {
      console.log('❌ Payment not found');
      return;
    }
    
    console.log('📋 Payment found:', {
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      adminId: payment.adminId,
      currentPlatformFee: payment.platformFee,
      currentNetAmount: payment.netAmount
    });
    
    // Find the admin
    console.log('🔍 Finding admin:', payment.adminId);
    const admin = await Admin.findById(payment.adminId);
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('👤 Admin found:', {
      id: admin._id,
      email: admin.email,
      platformFee: admin.platformFee
    });
    
    // Calculate correct fee
    let platformFee;
    if (admin.platformFee >= 1) {
      // Treat as fixed amount (₹16)
      platformFee = admin.platformFee;
    } else {
      // Treat as percentage
      platformFee = payment.amount * admin.platformFee;
    }
    
    const netAmount = payment.amount - platformFee;
    
    console.log('💰 Fee calculation:', {
      grossAmount: payment.amount,
      adminPlatformFee: admin.platformFee,
      calculatedPlatformFee: platformFee,
      calculatedNetAmount: netAmount
    });
    
    // Update the payment
    console.log('💾 Updating payment...');
    const updatedPayment = await PaymentLink.findByIdAndUpdate(
      paymentId,
      {
        platformFee: platformFee,
        netAmount: netAmount,
        feeCalculationData: {
          configId: 'manual-fix',
          version: 1,
          feeType: admin.platformFee >= 1 ? 'fixed' : 'percentage',
          feeRate: admin.platformFee,
          calculatedAt: new Date(),
          breakdown: {
            grossAmount: payment.amount,
            platformFee: platformFee,
            netAmount: netAmount,
            calculation: {
              type: admin.platformFee >= 1 ? 'fixed' : 'percentage',
              rate: admin.platformFee
            }
          }
        },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log('✅ Payment updated successfully!');
    console.log('📊 Final result:', {
      id: updatedPayment._id,
      amount: updatedPayment.amount,
      platformFee: updatedPayment.platformFee,
      netAmount: updatedPayment.netAmount,
      status: updatedPayment.status
    });
    
    console.log('🎉 Net Earned Amount should now be:', updatedPayment.netAmount);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixTransactionFee();
