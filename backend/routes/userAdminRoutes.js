const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const ChannelMember = require('../models/ChannelMember');

// Apply admin authentication and tenant isolation to all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Admin: Get all users with filtering and pagination
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, dateRange } = req.query;
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
    
    // Search by name, email, phone, or PAN
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Telegram status filter
    if (status && status !== 'all') {
      query.telegramJoinStatus = status;
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

    // Enhance user data with payment and channel info
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // Get payment history for this user
        const payments = await PaymentLink.find({ 
          userid: user._id,
          status: 'SUCCESS'
        }).select('amount plan_name purchase_datetime').sort({ purchase_datetime: -1 }).limit(3);

        // Get channel membership status
        const channelMemberships = await ChannelMember.find({
          telegramUserId: user.telegramUserId
        }).select('channelId isActive expiresAt channelInfo').limit(5);

        return {
          ...user,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          totalPayments: payments.length,
          totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
          recentPayments: payments,
          channelMemberships,
          activeChannels: channelMemberships.filter(cm => cm.isActive).length,
          joinStatus: user.telegramJoinStatus || 'pending'
        };
      })
    );

    // Get total count
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    res.json({
      users: enhancedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      total,
      pages
    });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Get user details by ID
router.get('/admin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    
    // Find user with tenant filtering (superadmin can see any user)
    const isSuper = req.admin?.role === 'superadmin';
    const userQuery = isSuper ? { _id: userId } : { _id: userId, adminId: adminId };
    
    const user = await User.findOne(userQuery);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get complete payment history
    const payments = await PaymentLink.find({ 
      userid: user._id 
    }).sort({ purchase_datetime: -1 });

    // Get channel memberships
    const channelMemberships = await ChannelMember.find({
      telegramUserId: user.telegramUserId
    }).populate('adminId', 'email');

    // Calculate user stats
    const stats = {
      totalPayments: payments.length,
      successfulPayments: payments.filter(p => p.status === 'SUCCESS').length,
      totalRevenue: payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0),
      averageOrderValue: payments.length > 0 ? 
        payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0) / 
        payments.filter(p => p.status === 'SUCCESS').length : 0,
      activeChannels: channelMemberships.filter(cm => cm.isActive).length,
      expiredChannels: channelMemberships.filter(cm => !cm.isActive).length
    };

    res.json({
      user: {
        ...user.toObject(),
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      },
      payments,
      channelMemberships,
      stats
    });
  } catch (err) {
    console.error('User details fetch error:', err);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// Admin: Get user statistics dashboard
router.get('/admin/stats/dashboard', async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
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

    // Apply tenant filtering for stats - superadmin sees all, regular admin sees only their own
    const isSuper = req.admin?.role === 'superadmin';
    const baseQuery = isSuper ? {} : { adminId };
    const dateQuery = isSuper ? 
      { createdAt: { $gte: startDate, $lte: now } } : 
      { ...baseQuery, createdAt: { $gte: startDate, $lte: now } };

    // User statistics
    const [
      totalUsers,
      newUsers,
      activeUsers,
      telegramJoinedUsers,
      usersByStatus,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(baseQuery),
      User.countDocuments(dateQuery),
      User.countDocuments({ ...baseQuery, telegramJoinStatus: { $in: ['joined', 'active'] } }),
      User.countDocuments({ ...baseQuery, telegramJoinStatus: 'joined' }),
      User.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$telegramJoinStatus', count: { $sum: 1 } } }
      ]),
      User.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('firstName lastName email phone telegramJoinStatus createdAt')
    ]);

    res.json({
      stats: {
        totalUsers,
        newUsers,
        activeUsers,
        telegramJoinedUsers,
        conversionRate: totalUsers > 0 ? ((telegramJoinedUsers / totalUsers) * 100).toFixed(2) : 0
      },
      usersByStatus,
      recentUsers: recentUsers.map(user => ({
        ...user.toObject(),
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      })),
      dateRange
    });
  } catch (err) {
    console.error('User stats fetch error:', err);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

module.exports = router;