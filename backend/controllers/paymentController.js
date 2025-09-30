const { createPaymentLink, checkPaymentStatus } = require('../services/cashfreeService');
const PaymentLink = require('../models/paymentLinkModel');
const platformFeeService = require('../services/platformFeeService');


const createLink = async (req, res) => {
  try {
    const { customer_id, phone, amount, plan_id, plan_name } = req.body;
    const userid = req.user?.id || req.body.userid; // Get from JWT or request body

    if (!userid || !customer_id || !phone || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get adminId from plan if plan_id is provided
    let adminId = null;
    let groupId = null;
    if (plan_id) {
      const Plan = require('../models/plan');
      const plan = await Plan.findById(plan_id);
      if (plan) {
        adminId = plan.adminId;
        groupId = plan.groupId;
      }
    }

    const data = await createPaymentLink({ customer_id, phone, amount, plan_id, plan_name });

    // Save to MONGODB with admin attribution
    const newPayment = new PaymentLink({
      userid,
      link_id: data.link_id,
      link_url: data.link_url,
      customer_id,
      phone,
      amount,
      plan_id,
      plan_name,
      status: 'PENDING',
      adminId: adminId,
      groupId: groupId
    });

    await newPayment.save();

    res.status(200).json({
      success: true,
      paymentLink: data.link_url,
      linkId: data.link_id,
      message: 'Payment link created and saved'
    });

  } catch (error) {
    console.error('Payment Link Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment link creation failed' });
  }
};
const getStatus = async (req, res) => {
  try {
    const { linkId } = req.params;
    const data = await checkPaymentStatus(linkId);
    res.status(200).json({ status: data.link_status, data });
  } catch (error) {
    console.error('Status Check Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
};

// Get total revenue (sum of all successful payments) - Admin specific
const getTotalRevenue = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    
    // Super admin sees all revenue, regular admin sees only their revenue
    const matchQuery = req.adminContext?.role === 'superadmin' ? 
      { status: 'SUCCESS' } : 
      { status: 'SUCCESS', adminId: adminId };
    
    const result = await PaymentLink.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const total = result[0]?.total || 0;
    res.json({ total, adminSpecific: req.adminContext?.role !== 'superadmin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get total transactions (count of all successful payments) - Admin specific
const getTotalTransactions = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    
    // Super admin sees all transactions, regular admin sees only their transactions
    const matchQuery = req.adminContext?.role === 'superadmin' ? 
      { status: 'SUCCESS' } : 
      { status: 'SUCCESS', adminId: adminId };
    
    const count = await PaymentLink.countDocuments(matchQuery);
    res.json({ count, adminSpecific: req.adminContext?.role !== 'superadmin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get active users (unique userids with a successful, non-expired payment) - Admin specific
const getActiveUsers = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    const now = new Date();
    
    // Super admin sees all active users, regular admin sees only their users
    const matchQuery = req.adminContext?.role === 'superadmin' ? 
      { status: 'SUCCESS', expiry_date: { $gt: now } } : 
      { status: 'SUCCESS', expiry_date: { $gt: now }, adminId: adminId };
    
    const result = await PaymentLink.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$userid" } },
      { $count: "activeUsers" }
    ]);
    const count = result[0]?.activeUsers || 0;
    res.json({ count, adminSpecific: req.adminContext?.role !== 'superadmin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recent successful transactions (with user info if possible) - Admin specific
const getRecentSuccessfulTransactions = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    const limit = parseInt(req.query.limit) || 5;
    
    // Super admin sees all transactions, regular admin sees only their transactions
    const matchQuery = req.adminContext?.role === 'superadmin' ? 
      { status: 'SUCCESS' } : 
      { status: 'SUCCESS', adminId: adminId };
    
    const transactions = await PaymentLink.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userid', 'firstName lastName email phone')
      .lean();
      
    res.json({ transactions, adminSpecific: req.adminContext?.role !== 'superadmin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Process payment with dynamic platform fee calculation
const processPaymentWithFee = async (req, res) => {
  try {
    const { paymentId, status, amount, adminId, channelBundleId } = req.body;

    if (!paymentId || !status || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment ID, status, and amount are required' 
      });
    }

    // Find the payment record
    const payment = await PaymentLink.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    // Calculate platform fee using the new service
    let feeCalculation = null;
    let platformFee = 0;
    let netAmount = amount;

    if (status === 'SUCCESS') {
      try {
        feeCalculation = await platformFeeService.calculateTransactionFee({
          amount: amount,
          tenantId: adminId || payment.adminId,
          channelBundleId: channelBundleId || payment.groupId,
          transactionDate: new Date()
        });

        platformFee = feeCalculation.platformFee;
        netAmount = feeCalculation.netAmount;

        console.log(`Payment ${paymentId} fee calculation:`, {
          amount,
          platformFee,
          netAmount,
          configUsed: feeCalculation.configUsed?.configId
        });

      } catch (error) {
        console.error('Fee calculation error, using admin platform fee:', error);
        // Fallback: Get admin's platform fee setting
        try {
          const Admin = require('../models/admin.model');
          const admin = await Admin.findById(adminId || payment.adminId);
          if (admin && admin.platformFee) {
            // If platformFee >= 1, treat as fixed amount (₹16)
            // If platformFee < 1, treat as percentage (0.029 = 2.9%)
            if (admin.platformFee >= 1) {
              platformFee = admin.platformFee;
            } else {
              platformFee = amount * admin.platformFee;
            }
            netAmount = amount - platformFee;
            console.log(`Using admin platform fee: ${admin.platformFee} (${admin.platformFee >= 1 ? 'fixed' : 'percentage'}), calculated fee: ${platformFee}`);
          } else {
            // Final fallback to static 2.9% fee
            platformFee = (amount * 2.9) / 100;
            netAmount = amount - platformFee;
            console.log('Using final fallback 2.9% fee');
          }
        } catch (adminError) {
          console.error('Admin lookup error, using 2.9% fallback:', adminError);
        platformFee = (amount * 2.9) / 100;
        netAmount = amount - platformFee;
        }
      }
    }

    // Update payment with fee information
    const updatedPayment = await PaymentLink.findByIdAndUpdate(
      paymentId,
      {
        status,
        platformFee,
        netAmount,
        feeCalculationData: feeCalculation ? {
          configId: feeCalculation.configUsed?.configId,
          version: feeCalculation.configUsed?.version,
          feeType: feeCalculation.feeType,
          feeRate: feeCalculation.feeRate,
          calculatedAt: feeCalculation.calculatedAt,
          breakdown: feeCalculation.breakdown
        } : null,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        payment: updatedPayment,
        feeCalculation: feeCalculation ? {
          platformFee,
          netAmount,
          feeRate: feeCalculation.feeRate,
          feeType: feeCalculation.feeType,
          configUsed: feeCalculation.configUsed
        } : null
      },
      message: 'Payment processed successfully with fee calculation'
    });

  } catch (error) {
    console.error('Process payment with fee error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process payment with fee calculation' 
    });
  }
};

// Update existing payment status with fee recalculation
const updatePaymentWithFee = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, reason, forceRecalculateFees = false } = req.body;

    const payment = await PaymentLink.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    // Only recalculate fees if explicitly requested or payment is becoming successful
    let updateData = { status };
    if (reason) updateData.statusReason = reason;

    if ((status === 'SUCCESS' && payment.status !== 'SUCCESS') || forceRecalculateFees) {
      try {
        const feeCalculation = await platformFeeService.calculateTransactionFee({
          amount: payment.amount,
          tenantId: payment.adminId,
          channelBundleId: payment.groupId,
          transactionDate: new Date()
        });

        updateData.platformFee = feeCalculation.platformFee;
        updateData.netAmount = feeCalculation.netAmount;
        updateData.feeCalculationData = {
          configId: feeCalculation.configUsed?.configId,
          version: feeCalculation.configUsed?.version,
          feeType: feeCalculation.feeType,
          feeRate: feeCalculation.feeRate,
          calculatedAt: feeCalculation.calculatedAt,
          breakdown: feeCalculation.breakdown
        };

        console.log(`Payment ${paymentId} fee recalculated:`, {
          amount: payment.amount,
          platformFee: feeCalculation.platformFee,
          netAmount: feeCalculation.netAmount,
          configUsed: feeCalculation.configUsed?.configId
        });

      } catch (error) {
        console.error('Fee recalculation error, using admin platform fee:', error);
        // Fallback: Get admin's platform fee setting
        try {
          const Admin = require('../models/admin.model');
          const admin = await Admin.findById(payment.adminId);
          if (admin && admin.platformFee) {
            // If platformFee >= 1, treat as fixed amount (₹16)
            // If platformFee < 1, treat as percentage (0.029 = 2.9%)
            let calculatedFee;
            if (admin.platformFee >= 1) {
              calculatedFee = admin.platformFee;
            } else {
              calculatedFee = payment.amount * admin.platformFee;
            }
            
            updateData.platformFee = calculatedFee;
            updateData.netAmount = payment.amount - calculatedFee;
            updateData.feeCalculationData = {
              configId: 'admin-fallback',
              version: 1,
              feeType: admin.platformFee >= 1 ? 'fixed' : 'percentage',
              feeRate: admin.platformFee,
              calculatedAt: new Date(),
              breakdown: {
                grossAmount: payment.amount,
                platformFee: calculatedFee,
                netAmount: payment.amount - calculatedFee,
                calculation: {
                  type: admin.platformFee >= 1 ? 'fixed' : 'percentage',
                  rate: admin.platformFee
                }
              }
            };
            
            console.log(`Using admin platform fee for recalculation: ${admin.platformFee} (${admin.platformFee >= 1 ? 'fixed' : 'percentage'}), calculated fee: ${calculatedFee}`);
          } else {
            console.log('No admin platform fee found, keeping existing fees');
          }
        } catch (adminError) {
          console.error('Admin lookup error during recalculation:', adminError);
        }
      }
    }

    const updatedPayment = await PaymentLink.findByIdAndUpdate(
      paymentId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Update payment with fee error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update payment' 
    });
  }
};

// Get payment details with fee breakdown
const getPaymentWithFeeDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentLink.findById(paymentId)
      .populate('userid', 'firstName lastName email phone')
      .populate('adminId', 'email role')
      .lean();

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    // If payment doesn't have fee calculation data, calculate it now for display
    let feeCalculation = null;
    if (!payment.feeCalculationData && payment.status === 'SUCCESS') {
      try {
        feeCalculation = await platformFeeService.calculateTransactionFee({
          amount: payment.amount,
          tenantId: payment.adminId?._id || payment.adminId,
          channelBundleId: payment.groupId,
          transactionDate: payment.createdAt
        });
      } catch (error) {
        console.error('Fee calculation for display error:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...payment,
        calculatedFeeData: feeCalculation || payment.feeCalculationData
      }
    });

  } catch (error) {
    console.error('Get payment with fee details error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get payment details' 
    });
  }
};

// Bulk recalculate fees for existing payments (admin only)
const bulkRecalculateFees = async (req, res) => {
  try {
    const { paymentIds, dateRange, adminId } = req.body;
    const isAdmin = req.adminContext?.role === 'admin' || req.adminContext?.role === 'superadmin';
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    let query = { status: 'SUCCESS' };
    
    if (paymentIds && paymentIds.length > 0) {
      query._id = { $in: paymentIds };
    } else if (dateRange) {
      query.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    if (adminId && req.adminContext?.role !== 'superadmin') {
      query.adminId = adminId;
    }

    const payments = await PaymentLink.find(query).limit(100); // Limit for safety
    
    const results = {
      processed: 0,
      updated: 0,
      errors: []
    };

    for (const payment of payments) {
      try {
        const feeCalculation = await platformFeeService.calculateTransactionFee({
          amount: payment.amount,
          tenantId: payment.adminId,
          channelBundleId: payment.groupId,
          transactionDate: payment.createdAt
        });

        await PaymentLink.findByIdAndUpdate(payment._id, {
          platformFee: feeCalculation.platformFee,
          netAmount: feeCalculation.netAmount,
          feeCalculationData: {
            configId: feeCalculation.configUsed?.configId,
            version: feeCalculation.configUsed?.version,
            feeType: feeCalculation.feeType,
            feeRate: feeCalculation.feeRate,
            calculatedAt: feeCalculation.calculatedAt,
            breakdown: feeCalculation.breakdown,
            recalculated: true,
            recalculatedAt: new Date()
          },
          updatedAt: new Date()
        });

        results.updated++;
      } catch (error) {
        results.errors.push({
          paymentId: payment._id,
          error: error.message
        });
      }
      results.processed++;
    }

    res.json({
      success: true,
      data: results,
      message: `Processed ${results.processed} payments, updated ${results.updated} successfully`
    });

  } catch (error) {
    console.error('Bulk recalculate fees error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to recalculate fees' 
    });
  }
};

// Recalculate fees for a specific payment
const recalculatePaymentFees = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await PaymentLink.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    // Get admin's platform fee setting
    const Admin = require('../models/admin.model');
    const admin = await Admin.findById(payment.adminId);
    
    if (!admin || !admin.platformFee) {
      return res.status(400).json({ 
        success: false, 
        error: 'Admin platform fee not found' 
      });
    }

    // Calculate fee based on admin's setting
    let platformFee;
    if (admin.platformFee >= 1) {
      // Treat as fixed amount (₹16)
      platformFee = admin.platformFee;
    } else {
      // Treat as percentage (0.029 = 2.9%)
      platformFee = payment.amount * admin.platformFee;
    }
    
    const netAmount = payment.amount - platformFee;
    
    // Update payment with calculated fees
    const updatedPayment = await PaymentLink.findByIdAndUpdate(
      paymentId,
      {
        platformFee: platformFee,
        netAmount: netAmount,
        feeCalculationData: {
          configId: 'admin-manual',
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

    console.log(`Payment ${paymentId} fees recalculated:`, {
      amount: payment.amount,
      adminPlatformFee: admin.platformFee,
      calculatedPlatformFee: platformFee,
      netAmount: netAmount
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Fees recalculated successfully'
    });

  } catch (error) {
    console.error('Recalculate payment fees error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to recalculate fees' 
    });
  }
};

module.exports = {
  createLink,
  getStatus,
  getTotalRevenue,
  getTotalTransactions,
  getActiveUsers,
  getRecentSuccessfulTransactions,
  processPaymentWithFee,
  updatePaymentWithFee,
  recalculatePaymentFees,
  getPaymentWithFeeDetails,
  bulkRecalculateFees
};