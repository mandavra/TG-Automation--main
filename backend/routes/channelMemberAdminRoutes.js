const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const ChannelMember = require('../models/ChannelMember');
const User = require('../models/user.model');
const Group = require('../models/group.model');

// Apply admin authentication and tenant isolation to all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Admin: Get all channel members with filtering and pagination
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, channelId, dateRange } = req.query;
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
    
    // Channel filter
    if (channelId && channelId !== 'all') {
      query.channelId = channelId;
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        query.isActive = true;
        query.expiresAt = { $gt: new Date() };
      } else if (status === 'expired') {
        query.isActive = true;
        query.expiresAt = { $lte: new Date() };
      } else if (status === 'kicked') {
        query.isActive = false;
      }
    }

    // Search by user details
    if (search) {
      // Get users matching search criteria first - handle superadmin access
      const userQuery = isSuper ? {} : { adminId };
      const matchingUsers = await User.find({
        ...userQuery,
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('telegramUserId');
      
      const telegramUserIds = matchingUsers.map(u => u.telegramUserId).filter(Boolean);
      
      query.$or = [
        { telegramUserId: { $in: telegramUserIds } },
        { 'userInfo.firstName': { $regex: search, $options: 'i' } },
        { 'userInfo.lastName': { $regex: search, $options: 'i' } },
        { 'userInfo.username': { $regex: search, $options: 'i' } },
        { 'channelInfo.title': { $regex: search, $options: 'i' } }
      ];
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
        query.joinedAt = { $gte: startDate };
      }
    }

    // Get channel members with pagination
    const members = await ChannelMember.find(query)
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Enhance member data with user information
    const enhancedMembers = await Promise.all(
      members.map(async (member) => {
        // Get user details - handle superadmin access
        const userQuery = isSuper ? 
          { telegramUserId: member.telegramUserId } : 
          { telegramUserId: member.telegramUserId, adminId };
        const user = await User.findOne(userQuery).select('firstName lastName email phone');

        // Calculate remaining time
        const now = new Date();
        const remainingMs = member.expiresAt - now;
        const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
        
        return {
          ...member,
          user,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                   (member.userInfo ? `${member.userInfo.firstName || ''} ${member.userInfo.lastName || ''}`.trim() : 'N/A'),
          userEmail: user?.email || 'N/A',
          userPhone: user?.phone || 'N/A',
          status: member.isActive ? 
            (member.expiresAt > now ? 'active' : 'expired') : 'kicked',
          remainingDays,
          isExpired: member.isActive && member.expiresAt <= now
        };
      })
    );

    // Get total count and stats
    const statsQuery = isSuper ? {} : { adminId };
    const [total, stats] = await Promise.all([
      ChannelMember.countDocuments(query),
      ChannelMember.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { 
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$expiresAt', new Date()] }] },
                  1, 0
                ]
              }
            },
            expired: { 
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $lte: ['$expiresAt', new Date()] }] },
                  1, 0
                ]
              }
            },
            kicked: { 
              $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const pages = Math.ceil(total / limitNum);

    res.json({
      members: enhancedMembers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      stats: stats[0] || { total: 0, active: 0, expired: 0, kicked: 0 }
    });
  } catch (err) {
    console.error('Admin channel members fetch error:', err);
    res.status(500).json({ error: "Failed to fetch channel members" });
  }
});

// Admin: Get channel member details by ID
router.get('/admin/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find channel member with tenant filtering - superadmin can access any member
    const memberQuery = isSuper ? { _id: memberId } : { _id: memberId, adminId: adminId };
    const member = await ChannelMember.findOne(memberQuery);
    
    if (!member) {
      return res.status(404).json({ error: "Channel member not found" });
    }

    // Get user details - handle superadmin access
    const userQuery = isSuper ? 
      { telegramUserId: member.telegramUserId } : 
      { telegramUserId: member.telegramUserId, adminId };
    const user = await User.findOne(userQuery);

    // Get channel/group details - handle superadmin access
    const groupQuery = isSuper ? 
      { 'channels.chatId': member.channelId } : 
      { 'channels.chatId': member.channelId, createdBy: adminId };
    const group = await Group.findOne(groupQuery).select('name description channels');

    const channel = group?.channels?.find(ch => ch.chatId === member.channelId);

    // Calculate time information
    const now = new Date();
    const remainingMs = member.expiresAt - now;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const totalDurationMs = member.expiresAt - member.joinedAt;
    const totalDurationDays = Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24));

    res.json({
      member: {
        ...member.toObject(),
        status: member.isActive ? 
          (member.expiresAt > now ? 'active' : 'expired') : 'kicked',
        remainingDays,
        totalDurationDays,
        isExpired: member.isActive && member.expiresAt <= now
      },
      user,
      group: group ? {
        name: group.name,
        description: group.description
      } : null,
      channel: channel ? {
        title: channel.chatTitle,
        chatId: channel.chatId,
        isActive: channel.isActive
      } : null,
      timeline: [
        {
          event: 'Joined Channel',
          timestamp: member.joinedAt,
          status: 'joined'
        },
        ...(member.kickedAt ? [{
          event: 'Removed from Channel',
          timestamp: member.kickedAt,
          status: 'kicked',
          reason: member.kickReason
        }] : []),
        ...(member.isActive && member.expiresAt <= now ? [{
          event: 'Membership Expired',
          timestamp: member.expiresAt,
          status: 'expired'
        }] : [])
      ]
    });
  } catch (err) {
    console.error('Channel member details fetch error:', err);
    res.status(500).json({ error: "Failed to fetch channel member details" });
  }
});

// Admin: Get channel member statistics dashboard
router.get('/admin/stats/dashboard', async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    const { dateRange = '30d', channelId } = req.query;

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

    let baseQuery = isSuper ? {} : { adminId };
    if (channelId && channelId !== 'all') {
      baseQuery.channelId = channelId;
    }

    const dateQuery = { ...baseQuery, joinedAt: { $gte: startDate, $lte: now } };

    // Channel member statistics
    const [
      totalMembers,
      newMembers,
      activeMembers,
      expiredMembers,
      membersByChannel,
      recentJoins,
      expiringMembers
    ] = await Promise.all([
      ChannelMember.countDocuments(baseQuery),
      ChannelMember.countDocuments(dateQuery),
      ChannelMember.countDocuments({ 
        ...baseQuery, 
        isActive: true, 
        expiresAt: { $gt: now } 
      }),
      ChannelMember.countDocuments({ 
        ...baseQuery, 
        isActive: true, 
        expiresAt: { $lte: now } 
      }),
      ChannelMember.aggregate([
        { $match: baseQuery },
        { 
          $group: { 
            _id: '$channelId', 
            count: { $sum: 1 },
            active: { 
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$expiresAt', now] }] },
                  1, 0
                ]
              }
            },
            channelTitle: { $first: '$channelInfo.title' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      ChannelMember.find(baseQuery)
        .sort({ joinedAt: -1 })
        .limit(10)
        .select('telegramUserId joinedAt expiresAt channelInfo userInfo'),
      ChannelMember.find({ 
        ...baseQuery, 
        isActive: true,
        expiresAt: { 
          $gt: now, 
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) 
        }
      }).limit(20).select('telegramUserId expiresAt channelInfo userInfo')
    ]);

    res.json({
      stats: {
        totalMembers,
        newMembers,
        activeMembers,
        expiredMembers,
        retentionRate: totalMembers > 0 ? 
          ((activeMembers / totalMembers) * 100).toFixed(2) : 0
      },
      membersByChannel,
      recentJoins,
      expiringMembers,
      dateRange
    });
  } catch (err) {
    console.error('Channel member stats fetch error:', err);
    res.status(500).json({ error: "Failed to fetch channel member statistics" });
  }
});

// Admin: Extend member subscription
router.post('/admin/:memberId/extend', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { extensionDays, reason } = req.body;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    if (!extensionDays || extensionDays <= 0) {
      return res.status(400).json({ error: "Extension days must be a positive number" });
    }
    
    // Find member with tenant filtering - superadmin can extend any member
    const memberQuery = isSuper ? { _id: memberId } : { _id: memberId, adminId: adminId };
    const member = await ChannelMember.findOne(memberQuery);
    
    if (!member) {
      return res.status(404).json({ error: "Channel member not found" });
    }

    // Extend the expiry date
    const extensionMs = extensionDays * 24 * 60 * 60 * 1000;
    member.expiresAt = new Date(member.expiresAt.getTime() + extensionMs);
    
    // Add extension log (if you want to track extensions)
    if (!member.extensions) {
      member.extensions = [];
    }
    member.extensions.push({
      extensionDays,
      reason,
      extendedAt: new Date(),
      extendedBy: adminId
    });
    
    await member.save();

    res.json({ 
      message: `Membership extended by ${extensionDays} days`,
      member,
      newExpiryDate: member.expiresAt
    });
  } catch (err) {
    console.error('Member extension error:', err);
    res.status(500).json({ error: "Failed to extend membership" });
  }
});

module.exports = router;