const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const Invoice = require('../models/Invoice');

// Apply admin authentication and tenant isolation to all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Admin: Get all KYC data with filtering and pagination
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, verificationStatus, dateRange, city, state } = req.query;
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
    
    // Search by user details
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // City filter
    if (city && city !== 'all') {
      query.City = { $regex: city, $options: 'i' };
    }

    // State filter
    if (state && state !== 'all') {
      query.State = { $regex: state, $options: 'i' };
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

    // Get users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get related payment and invoice data for each user
    const userIds = users.map(user => user._id);
    const paymentQuery = isSuper ? { userid: { $in: userIds } } : { userid: { $in: userIds }, adminId };
    const [paymentLinks, invoices] = await Promise.all([
      PaymentLink.find(paymentQuery)
        .sort({ createdAt: -1 }),
      Invoice.find({ userid: { $in: userIds } })
    ]);

    // Create lookup maps
    const paymentMap = {};
    const invoiceMap = {};
    
    paymentLinks.forEach(payment => {
      if (!paymentMap[payment.userid]) {
        paymentMap[payment.userid] = payment;
      }
    });

    invoices.forEach(invoice => {
      if (!invoiceMap[invoice.userid]) {
        invoiceMap[invoice.userid] = invoice;
      }
    });

    // Process users data
    const processedUsers = users.map(user => {
      const payment = paymentMap[user._id];
      const invoice = invoiceMap[user._id];
      
      return {
        ...user,
        fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim(),
        paymentStatus: payment?.status || 'PENDING',
        planName: payment?.plan_name || 'N/A',
        paymentAmount: payment?.amount || 0,
        hasInvoice: !!invoice,
        invoiceNo: invoice?.invoiceNo || 'N/A',
        verificationStatus: getVerificationStatus(user),
        completionPercentage: getCompletionPercentage(user),
        lastUpdated: user.updatedAt || user.createdAt
      };
    });

    // Get total count and stats
    const statsQuery = isSuper ? {} : { adminId };
    const [total, stats] = await Promise.all([
      User.countDocuments(query),
      User.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: null,
            totalKyc: { $sum: 1 },
            withPan: { $sum: { $cond: [{ $ne: ['$panNumber', null] }, 1, 0] } },
            withEmail: { $sum: { $cond: [{ $ne: ['$email', null] }, 1, 0] } },
            withPhone: { $sum: { $cond: [{ $ne: ['$phone', null] }, 1, 0] } },
            thisMonth: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const pages = Math.ceil(total / limitNum);
    const statsData = stats[0] || { totalKyc: 0, withPan: 0, withEmail: 0, withPhone: 0, thisMonth: 0 };

    res.json({
      users: processedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      stats: {
        total,
        pages,
        ...statsData,
        completionRate: total > 0 ? ((statsData.withPan / total) * 100).toFixed(2) : 0
      }
    });
  } catch (err) {
    console.error('Admin KYC fetch error:', err);
    res.status(500).json({ error: "Failed to fetch KYC data" });
  }
});

// Admin: Get KYC statistics dashboard
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

    const baseQuery = isSuper ? {} : { adminId };
    const dateQuery = { ...baseQuery, createdAt: { $gte: startDate, $lte: now } };

    // KYC statistics
    const [
      totalKyc,
      newKyc,
      kycWithPan,
      kycWithEmail,
      recentKyc,
      kycByState,
      kycByCity,
      completionStats
    ] = await Promise.all([
      User.countDocuments(baseQuery),
      User.countDocuments(dateQuery),
      User.countDocuments({ ...baseQuery, panNumber: { $ne: null, $ne: '' } }),
      User.countDocuments({ ...baseQuery, email: { $ne: null, $ne: '' } }),
      User.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('firstName lastName email phone panNumber createdAt')
        .lean(),
      User.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$State', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      User.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$City', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      User.aggregate([
        { $match: baseQuery },
        {
          $project: {
            completionScore: {
              $add: [
                { $cond: [{ $ne: ['$firstName', null] }, 1, 0] },
                { $cond: [{ $ne: ['$lastName', null] }, 1, 0] },
                { $cond: [{ $ne: ['$email', null] }, 1, 0] },
                { $cond: [{ $ne: ['$phone', null] }, 1, 0] },
                { $cond: [{ $ne: ['$panNumber', null] }, 1, 0] },
                { $cond: [{ $ne: ['$dob', null] }, 1, 0] },
                { $cond: [{ $ne: ['$City', null] }, 1, 0] },
                { $cond: [{ $ne: ['$State', null] }, 1, 0] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgCompletion: { $avg: '$completionScore' },
            maxCompletion: { $max: '$completionScore' }
          }
        }
      ])
    ]);

    const completionRate = totalKyc > 0 ? 
      ((kycWithPan / totalKyc) * 100).toFixed(2) : 0;

    const avgCompletionPercentage = completionStats[0] ? 
      ((completionStats[0].avgCompletion / 8) * 100).toFixed(1) : 0;

    res.json({
      stats: {
        totalKyc,
        newKyc,
        kycWithPan,
        kycWithEmail,
        completionRate,
        avgCompletionPercentage
      },
      recentKyc: recentKyc.map(user => ({
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        completionPercentage: getCompletionPercentage(user)
      })),
      kycByState,
      kycByCity,
      dateRange
    });
  } catch (err) {
    console.error('KYC stats fetch error:', err);
    res.status(500).json({ error: "Failed to fetch KYC statistics" });
  }
});

// Admin: Get KYC details by ID
router.get('/admin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find user with tenant filtering - superadmin can access any user
    const userQuery = isSuper ? { _id: userId } : { _id: userId, adminId: adminId };
    const user = await User.findOne(userQuery).lean();
    
    if (!user) {
      return res.status(404).json({ error: "KYC data not found" });
    }

    // Get related data - for superadmin, get all payment links and invoices
    const paymentQuery = isSuper ? { userid: userId } : { userid: userId, adminId };
    const [paymentLinks, invoices] = await Promise.all([
      PaymentLink.find(paymentQuery).sort({ createdAt: -1 }),
      Invoice.find({ userid: userId }).sort({ createdAt: -1 })
    ]);

    // Calculate verification status and completion
    const verificationStatus = getVerificationStatus(user);
    const completionPercentage = getCompletionPercentage(user);
    
    // Build activity timeline
    const timeline = [];
    
    timeline.push({
      event: 'KYC Registration',
      timestamp: user.createdAt,
      type: 'registration',
      details: 'User registered with basic information'
    });

    if (user.updatedAt && user.updatedAt !== user.createdAt) {
      timeline.push({
        event: 'KYC Updated',
        timestamp: user.updatedAt,
        type: 'update',
        details: 'KYC information was updated'
      });
    }

    // Add payment events
    paymentLinks.forEach(payment => {
      timeline.push({
        event: 'Payment Created',
        timestamp: payment.createdAt,
        type: 'payment',
        details: `Payment link created for ${payment.plan_name} - ₹${payment.amount}`,
        status: payment.status
      });
    });

    // Add invoice events
    invoices.forEach(invoice => {
      timeline.push({
        event: 'Invoice Generated',
        timestamp: invoice.billDate || invoice.createdAt,
        type: 'invoice',
        details: `Invoice ${invoice.invoiceNo} generated for ₹${invoice.total}`
      });
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      user: {
        ...user,
        fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim(),
        verificationStatus,
        completionPercentage
      },
      paymentLinks,
      invoices,
      timeline,
      stats: {
        totalPayments: paymentLinks.length,
        totalInvoices: invoices.length,
        totalAmount: paymentLinks.reduce((sum, p) => sum + (p.amount || 0), 0),
        lastActivity: timeline[0]?.timestamp || user.createdAt
      }
    });
  } catch (err) {
    console.error('KYC details fetch error:', err);
    res.status(500).json({ error: "Failed to fetch KYC details" });
  }
});

// Admin: Update KYC status or information
router.put('/admin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    const updateData = req.body;
    
    // Find and update user with tenant filtering - superadmin can update any user
    const updateQuery = isSuper ? { _id: userId } : { _id: userId, adminId: adminId };
    const user = await User.findOneAndUpdate(
      updateQuery,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "KYC data not found" });
    }

    res.json({ 
      message: "KYC information updated successfully",
      user: {
        ...user.toObject(),
        fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim(),
        verificationStatus: getVerificationStatus(user),
        completionPercentage: getCompletionPercentage(user)
      }
    });
  } catch (err) {
    console.error('KYC update error:', err);
    res.status(500).json({ error: "Failed to update KYC information" });
  }
});

// Helper function to determine verification status
function getVerificationStatus(user) {
  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'panNumber'];
  const filledFields = requiredFields.filter(field => user[field] && user[field] !== '');
  
  if (filledFields.length === requiredFields.length) {
    return 'verified';
  } else if (filledFields.length >= 3) {
    return 'partial';
  } else {
    return 'incomplete';
  }
}

// Helper function to calculate completion percentage
function getCompletionPercentage(user) {
  const allFields = ['firstName', 'lastName', 'email', 'phone', 'panNumber', 'dob', 'City', 'State'];
  const filledFields = allFields.filter(field => user[field] && user[field] !== '');
  return Math.round((filledFields.length / allFields.length) * 100);
}

module.exports = router;