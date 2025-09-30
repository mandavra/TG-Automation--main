const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Plan = require('../models/plan');

// Apply admin authentication and tenant isolation to all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Admin: Get all payments with filtering and pagination
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, dateRange, planId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query with admin filtering - tenant isolation
    let query = {};
    
    // Apply tenant filtering - superadmin sees all, regular admin sees only their own
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    if (!isSuper) {
      query.adminId = adminId;
    }
    
    // Search by customer details or transaction ID
    if (search) {
      // Get users matching search criteria first
      const userSearchQuery = isSuper ? {} : { adminId };
      userSearchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      
      const matchingUsers = await User.find(userSearchQuery).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      
      query.$or = [
        { userid: { $in: userIds } },
        { link_id: { $regex: search, $options: 'i' } },
        { customer_id: { $regex: search, $options: 'i' } },
        { plan_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Payment status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Plan filter
    if (planId && planId !== 'all') {
      query.plan_id = planId;
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Get payments with pagination and populate user data
    const payments = await PaymentLink.find(query)
      .populate('userid', 'firstName lastName email phone telegramJoinStatus')
      .populate('invoiceId', 'invoiceNo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Process payments data
    const processedPayments = payments.map(payment => ({
      ...payment,
      customerName: payment.userid ? 
        `${payment.userid.firstName || ''} ${payment.userid.lastName || ''}`.trim() : 'N/A',
      customerEmail: payment.userid?.email || 'N/A',
      customerPhone: payment.userid?.phone || payment.phone || 'N/A',
      joinStatus: payment.userid?.telegramJoinStatus || 'unknown',
      invoiceNo: payment.invoiceId?.invoiceNo || 'N/A',
      commission: payment.adminCommission || 0,
      commissionRate: payment.commissionRate || 100
    }));

    // Get total count and stats
    const [total, stats] = await Promise.all([
      PaymentLink.countDocuments(query),
      PaymentLink.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalCommission: { $sum: '$adminCommission' }
          }
        }
      ])
    ]);

    const pages = Math.ceil(total / limitNum);

    res.json({
      payments: processedPayments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      stats: {
        total,
        pages,
        statusBreakdown: stats
      }
    });
  } catch (err) {
    console.error('Admin payments fetch error:', err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Admin: Get payment details by ID
router.get('/admin/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    
    console.log(`🔍 Payment details request: paymentId=${paymentId}, adminId=${adminId}, role=${req.admin?.role}`);
    
    // Validate paymentId format
    if (!paymentId || !paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid payment ID format" });
    }
    
    // Find payment with tenant filtering (superadmin can see any payment)
    const isSuper = req.admin?.role === 'superadmin';
    const paymentQuery = isSuper ? { _id: paymentId } : { _id: paymentId, adminId: adminId };
    
    console.log(`🔍 Payment query:`, paymentQuery);
    
    const payment = await PaymentLink.findOne(paymentQuery)
    .populate('userid')
    .populate('invoiceId')
    .populate('groupId', 'name description')
    .populate('adminId', 'email role platformFee');
    
    console.log(`📊 Payment found:`, !!payment);
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found or access denied" });
    }

    // Helper to deeply discover a likely transaction/reference id
    const findDeepTransactionId = (obj) => {
      if (!obj || typeof obj !== 'object') return undefined;
      const stack = [obj];
      const keyRegex = /(utr|txn|transaction|reference|rrn|order).*id|^(utr|txn|rrn|ref|reference|order)$/i;
      while (stack.length) {
        const current = stack.pop();
        for (const [key, value] of Object.entries(current)) {
          if (value && typeof value === 'object') {
            stack.push(value);
          } else if (typeof value === 'string') {
            if (keyRegex.test(key) && value.trim().length >= 6) {
              return value.trim();
            }
          }
        }
      }
      return undefined;
    };

    // Derive a normalized transaction id (UTR)
    const p = payment.toObject();
    const derivedTransactionId = (
      p.utr ||
      p.transactionId ||
      p.txn_id ||
      p.txnId ||
      p.referenceId ||
      p.reference ||
      p.ref_no ||
      p.refNo ||
      p.rrn ||
      p.orderId ||
      p.payment_id ||
      p.razorpay_payment_id ||
      p.utrNumber ||
      p.utr_no ||
      p.utrNo ||
      findDeepTransactionId(p)
    );

    // Get related plan details safely
    let planDetails = null;
    if (payment.plan_id) {
      try {
        planDetails = await Plan.findById(payment.plan_id);
      } catch (planErr) {
        console.warn('Plan lookup failed:', planErr.message);
        // Continue without plan details
      }
    }

    // Calculate Net Earned Amount (always non-negative)
    const planPrice = payment.amount || 0;
    const platformFee = typeof payment.adminId?.platformFee === 'number'
      ? payment.adminId.platformFee
      : (payment.platformFee);
    let netEarnedAmount = planPrice - platformFee;
    if (netEarnedAmount < 0) netEarnedAmount = 0;

    res.json({
      payment: {
        ...p,
        customerName: payment.userid ? 
          `${payment.userid.firstName || ''} ${payment.userid.lastName || ''}`.trim() : 'N/A',
        adminPlatformFee: payment.adminId && typeof payment.adminId.platformFee === 'number' 
          ? payment.adminId.platformFee 
          : undefined,
        netEarnedAmount,
        // Ensure a normalized transactionId is available to frontend
        transactionId: derivedTransactionId || p.transactionId || p.utr || undefined
      },
      planDetails,
      timeline: [
        {
          event: 'Payment Created',
          timestamp: payment.createdAt,
          status: 'PENDING'
        },
        ...(payment.status === 'SUCCESS' ? [{
          event: 'Payment Successful',
          timestamp: payment.purchase_datetime || payment.updatedAt,
          status: 'SUCCESS'
        }] : []),
        ...(payment.status === 'FAILED' ? [{
          event: 'Payment Failed',
          timestamp: payment.updatedAt,
          status: 'FAILED'
        }] : []),
        ...(payment.invoiceId ? [{
          event: 'Invoice Generated',
          timestamp: payment.invoiceId.createdAt || payment.updatedAt,
          status: 'COMPLETED'
        }] : [])
      ]
    });
  } catch (err) {
    console.error('❌ Payment details fetch error:', err.message, err.stack);
    res.status(500).json({ 
      error: "Failed to fetch payment details",
      details: err.message
    });
  }
});

// Admin: Get payment analytics dashboard
router.get('/admin/stats/dashboard', async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    const { dateRange = '30d' } = req.query;

    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Apply tenant filtering - superadmin sees all, regular admin sees only their own
    const baseQuery = isSuper ? {} : { adminId };
    const dateQuery = { ...baseQuery, createdAt: { $gte: startDate, $lte: now } };

    // Payment statistics
    const [
      totalPayments,
      successfulPayments,
      totalRevenue,
      totalCommission,
      recentPayments,
      paymentsByStatus,
      topPlans
    ] = await Promise.all([
      PaymentLink.countDocuments(baseQuery),
      PaymentLink.countDocuments({ ...baseQuery, status: 'SUCCESS' }),
      PaymentLink.aggregate([
        { $match: { ...baseQuery, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PaymentLink.aggregate([
        { $match: { ...baseQuery, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$adminCommission' } } }
      ]),
      PaymentLink.find(baseQuery)
        .populate('userid', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('amount status plan_name purchase_datetime userid'),
      PaymentLink.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]),
      PaymentLink.aggregate([
        { $match: { ...baseQuery, status: 'SUCCESS' } },
        { $group: { _id: '$plan_name', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const conversionRate = totalPayments > 0 ? 
      ((successfulPayments / totalPayments) * 100).toFixed(2) : 0;

    res.json({
      stats: {
        totalPayments,
        successfulPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCommission: totalCommission[0]?.total || 0,
        conversionRate,
        averageOrderValue: successfulPayments > 0 ? 
          ((totalRevenue[0]?.total || 0) / successfulPayments).toFixed(2) : 0
      },
      recentPayments: recentPayments.map(payment => ({
        ...payment.toObject(),
        customerName: payment.userid ? 
          `${payment.userid.firstName || ''} ${payment.userid.lastName || ''}`.trim() : 'N/A'
      })),
      paymentsByStatus,
      topPlans,
      dateRange
    });
  } catch (err) {
    console.error('Payment stats fetch error:', err);
    res.status(500).json({ error: "Failed to fetch payment statistics" });
  }
});

// Admin: Refund payment (if supported)
router.post('/admin/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.adminContext?.adminId || req.admin._id;
    
    // Find payment with tenant filtering (superadmin can refund any payment)
    const isSuper = req.admin?.role === 'superadmin';
    const refundQuery = isSuper ? 
      { _id: paymentId, status: 'SUCCESS' } : 
      { _id: paymentId, adminId: adminId, status: 'SUCCESS' };
    
    const payment = await PaymentLink.findOne(refundQuery);
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found or cannot be refunded" });
    }

    // TODO: Implement actual refund logic with payment gateway
    // For now, just mark as refund requested
    payment.refundRequested = true;
    payment.refundReason = reason;
    payment.refundNotes = notes;
    payment.refundRequestedAt = new Date();
    
    await payment.save();

    res.json({ 
      message: "Refund request submitted successfully",
      payment 
    });
  } catch (err) {
    console.error('Payment refund error:', err);
    res.status(500).json({ error: "Failed to process refund request" });
  }
});

module.exports = router;