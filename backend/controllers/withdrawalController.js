const WithdrawalRequest = require('../models/withdrawalRequest.model');
const PaymentLink = require('../models/paymentLinkModel');
const Admin = require('../models/admin.model');
const mongoose = require('mongoose');

// Calculate net earned amount for admin (same logic as analytics)
const calculateNetEarnedAmount = async (adminId) => {
  try {
    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const adminDoc = await Admin.findById(adminId);
    const defaultPlatformFee = adminDoc?.platformFee;
    const netEarnedPayments = await PaymentLink.find({
      adminId: adminObjectId,
      status: 'SUCCESS'
    }).populate('adminId', 'platformFee').lean();
    let netEarnedSubtotal = 0;
    for (const tx of netEarnedPayments) {
      const amount = Number(tx.amount || 0);
      if (typeof tx.netAmount === 'number' && tx.netAmount >= 0) {
        netEarnedSubtotal += tx.netAmount;
      } else if (typeof tx.platformFee === 'number' && tx.platformFee > 0) {
        netEarnedSubtotal += (amount - tx.platformFee);
      } else if (tx.adminId && typeof tx.adminId.platformFee === 'number' && tx.adminId.platformFee > 0) {
        if (tx.adminId.platformFee >= 1) {
          netEarnedSubtotal += (amount - tx.adminId.platformFee);
        } else {
          netEarnedSubtotal += (amount - (amount * tx.adminId.platformFee));
        }
      } else if (typeof defaultPlatformFee === 'number' && defaultPlatformFee > 0) {
        if (defaultPlatformFee >= 1) {
          netEarnedSubtotal += (amount - defaultPlatformFee);
        } else {
          netEarnedSubtotal += (amount - (amount * defaultPlatformFee));
        }
      } else {
        // fallback 2.9%
        netEarnedSubtotal += (amount - (amount * 0.029));
      }
    }
    return Math.max(0, netEarnedSubtotal);
  } catch (error) {
    console.error('Error calculating net earned amount:', error);
    return 0;
  }
};

// Calculate admin balance using net earned
const calculateAdminBalance = async (adminId) => {
  try {
    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const totalNetEarned = await calculateNetEarnedAmount(adminId);
    const totalWithdrawnAgg = await WithdrawalRequest.aggregate([
      { $match: { adminId: adminObjectId, status: { $in: ['approved', 'processed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPendingAgg = await WithdrawalRequest.aggregate([
      { $match: { adminId: adminObjectId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalWithdrawn = totalWithdrawnAgg[0]?.total || 0;
    const totalPending = totalPendingAgg[0]?.total || 0;
    const remainingNetEarned = Math.max(0, totalNetEarned - totalWithdrawn - totalPending);
    return {
      totalNetEarned,
      totalWithdrawn,
      totalPending,
      remainingNetEarned
    };
  } catch (error) {
    throw new Error(`Error calculating admin balance: ${error.message}`);
  }
};

// Get admin balance
exports.getAdminBalance = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const balance = await calculateAdminBalance(adminId);
    
    res.json({
      success: true,
      balance: balance
    });
  } catch (error) {
    console.error('Error getting admin balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin balance',
      error: error.message
    });
  }
};

// Create withdrawal request
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const { 
      amount, 
      adminNotes 
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    const paymentMethod = 'wallet'; // Set a default payment method

    // Check available balance
    const balance = await calculateAdminBalance(adminId);
    if (amount > balance.remainingNetEarned) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${balance.remainingNetEarned}, Requested: ₹${amount}`,
        availableBalance: balance.remainingNetEarned
      });
    }

    // Create withdrawal request
    const withdrawalRequest = new WithdrawalRequest({
      adminId,
      amount,
      paymentMethod,
      adminNotes,
      availableBalance: balance.remainingNetEarned,
      status: 'pending'
    });

    await withdrawalRequest.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawalRequest: {
        id: withdrawalRequest._id,
        amount: withdrawalRequest.amount,
        paymentMethod: withdrawalRequest.paymentMethod,
        status: withdrawalRequest.status,
        requestedAt: withdrawalRequest.requestedAt
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create withdrawal request',
      error: error.message
    });
  }
};

// Get withdrawal requests for admin
exports.getMyWithdrawalRequests = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const query = { adminId };
    if (status) {
      query.status = status;
    }

    const withdrawalRequests = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('processedBy', 'email role');

    const total = await WithdrawalRequest.countDocuments(query);

    res.json({
      success: true,
      withdrawalRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal requests',
      error: error.message
    });
  }
};

// Get all withdrawal requests (Super Admin only)
exports.getAllWithdrawalRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = {};
    if (status) {
      query.status = status;
    }

    const withdrawalRequests = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('adminId', 'email role')
      .populate('processedBy', 'email role');

    const total = await WithdrawalRequest.countDocuments(query);

    res.json({
      success: true,
      withdrawalRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting all withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal requests',
      error: error.message
    });
  }
};

// Process withdrawal request (Super Admin only)
exports.processWithdrawalRequest = async (req, res) => {
  try {
    // Only super admin can process requests
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    const { requestId } = req.params;
    const { action, processingNotes, transactionId } = req.body;
    const processorId = req.adminContext?.adminId || req.admin._id;

    if (!action || !['approve', 'reject', 'process', 'fail'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Valid action is required (approve, reject, process, fail)'
      });
    }

    const withdrawalRequest = await WithdrawalRequest.findById(requestId);
    if (!withdrawalRequest) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Check if request can be processed
    if (action === 'approve' && withdrawalRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be approved'
      });
    }

    if (action === 'process' && withdrawalRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved requests can be processed'
      });
    }

    // Validate balance before processing
    if (['approve', 'process'].includes(action)) {
      const balance = await calculateAdminBalance(withdrawalRequest.adminId);
      if (withdrawalRequest.amount > balance.remainingNetEarned) {
        return res.status(400).json({
          success: false,
          message: `Insufficient admin balance. Available: ₹${balance.remainingNetEarned}`,
          availableBalance: balance.remainingNetEarned
        });
      }
    }

    // Update withdrawal request
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      process: 'processed',
      fail: 'failed'
    };

    withdrawalRequest.status = statusMap[action];
    withdrawalRequest.processedBy = processorId;
    withdrawalRequest.processedAt = new Date();
    
    if (processingNotes) {
      withdrawalRequest.processingNotes = processingNotes;
    }
    
    if (transactionId) {
      withdrawalRequest.transactionId = transactionId;
    }

    await withdrawalRequest.save();

    res.json({
      success: true,
      message: `Withdrawal request ${action}d successfully`,
      withdrawalRequest: {
        id: withdrawalRequest._id,
        status: withdrawalRequest.status,
        processedAt: withdrawalRequest.processedAt,
        processingNotes: withdrawalRequest.processingNotes,
        transactionId: withdrawalRequest.transactionId
      }
    });

  } catch (error) {
    console.error('Error processing withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request',
      error: error.message
    });
  }
};

// Get withdrawal statistics (Super Admin only)
exports.getWithdrawalStatistics = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    const stats = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalRequests = await WithdrawalRequest.countDocuments();
    const totalAmount = await WithdrawalRequest.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      statistics: {
        totalRequests,
        totalAmount: totalAmount[0]?.total || 0,
        byStatus: stats
      }
    });

  } catch (error) {
    console.error('Error getting withdrawal statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal statistics',
      error: error.message
    });
  }
};

// Direct withdrawal by super admin
exports.directWithdrawal = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    const { 
      targetAdminId, 
      amount, 
      processingNotes,
      paymentMethod = 'bank_transfer',
      bankDetails,
      transactionId 
    } = req.body;

    // Validate target admin exists
    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) {
      return res.status(404).json({ message: 'Target admin not found' });
    }

    if (targetAdmin.role === 'superadmin') {
      return res.status(400).json({ message: 'Cannot withdraw from super admin account' });
    }

    // Check target admin's available balance
    const balanceInfo = await calculateAdminBalance(targetAdminId);
    if (amount > balanceInfo.remainingNetEarned) {
      return res.status(400).json({ 
        message: 'Insufficient admin balance',
        available: balanceInfo.remainingNetEarned,
        requested: amount
      });
    }

    // Create direct withdrawal record
    const withdrawalRequest = new WithdrawalRequest({
      adminId: targetAdminId,
      amount,
      paymentMethod,
      bankDetails,
      adminNotes: `Direct withdrawal by super admin: ${req.admin.email}`,
      processingNotes,
      transactionId,
      availableBalance: balanceInfo.remainingNetEarned,
      status: 'processed', // Direct withdrawals are immediately processed
      processedBy: req.admin._id,
      processedAt: new Date(),
      type: 'direct'
    });

    await withdrawalRequest.save();

    res.json({
      success: true,
      message: 'Direct withdrawal completed successfully',
      withdrawal: {
        id: withdrawalRequest._id,
        targetAdmin: targetAdmin.email,
        amount,
        status: withdrawalRequest.status,
        processedAt: withdrawalRequest.processedAt
      }
    });
  } catch (error) {
    console.error('Error processing direct withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process direct withdrawal',
      error: error.message
    });
  }
};

// Get super admin withdrawal dashboard
exports.getSuperAdminDashboard = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    // Get pending requests count
    const pendingCount = await WithdrawalRequest.countDocuments({ status: 'pending' });

    // Get recent requests (last 10)
    const recentRequests = await WithdrawalRequest.find({})
      .populate('adminId', 'email')
      .populate('processedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get overall statistics
    const stats = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get admin-wise withdrawal summary
    const adminSummary = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$adminId',
          totalRequests: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          completedAmount: {
            $sum: {
              $cond: [{ $in: ['$status', ['processed', 'approved']] }, '$amount', 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'admins',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      {
        $unwind: '$admin'
      },
      {
        $project: {
          adminEmail: '$admin.email',
          totalRequests: 1,
          totalAmount: 1,
          pendingAmount: 1,
          completedAmount: 1
        }
      }
    ]);

    res.json({
      success: true,
      dashboard: {
        pendingCount,
        recentRequests,
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, amount: stat.amount };
          return acc;
        }, {}),
        adminSummary
      }
    });
  } catch (error) {
    console.error('Error getting super admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal dashboard',
      error: error.message
    });
  }
};

// Get individual admin's balance and withdrawal history (Super Admin view)
exports.getAdminWithdrawalProfile = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    const { adminId } = req.params;

    // Validate admin exists
    const admin = await Admin.findById(adminId).select('email role');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.role === 'superadmin') {
      return res.status(400).json({ message: 'Cannot view super admin withdrawal profile' });
    }

    const balanceInfo = await calculateAdminBalance(adminId);
    
    // Get withdrawal history
    const withdrawalHistory = await WithdrawalRequest.find({ adminId })
      .populate('processedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      profile: {
        admin,
        balance: balanceInfo,
        withdrawalHistory
      }
    });
  } catch (error) {
    console.error('Error getting admin withdrawal profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin withdrawal profile',
      error: error.message
    });
  }
};

module.exports = {
  calculateAdminBalance,
  // Admin methods
  getAdminBalance: exports.getAdminBalance,
  createWithdrawalRequest: exports.createWithdrawalRequest,
  getMyWithdrawalRequests: exports.getMyWithdrawalRequests,
  
  // Super Admin methods
  getAllWithdrawalRequests: exports.getAllWithdrawalRequests,
  processWithdrawalRequest: exports.processWithdrawalRequest,
  getWithdrawalStatistics: exports.getWithdrawalStatistics,
  directWithdrawal: exports.directWithdrawal,
  getSuperAdminDashboard: exports.getSuperAdminDashboard,
  getAdminWithdrawalProfile: exports.getAdminWithdrawalProfile
};
