const channelMembershipService = require('../services/channelMembershipService');

/**
 * Record when user leaves a channel (called by Telegram bot webhook)
 */
const recordChannelLeave = async (req, res) => {
  try {
    const { channelId, telegramUserId, reason = 'left' } = req.body;

    if (!channelId || !telegramUserId) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID and Telegram User ID are required'
      });
    }

    const result = await channelMembershipService.recordChannelLeave(
      channelId, 
      telegramUserId, 
      reason
    );

    return res.json(result);

  } catch (error) {
    console.error('Error recording channel leave:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record channel leave',
      error: error.message
    });
  }
};

/**
 * Handle user rejoin request (user-facing)
 */
const handleRejoinRequest = async (req, res) => {
  try {
    const { userId, channelId } = req.params;
    const { reason = 'accidental_leave' } = req.body;

    if (!userId || !channelId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Channel ID are required'
      });
    }

    const result = await channelMembershipService.handleUserRejoinRequest(
      userId, 
      channelId, 
      reason
    );

    return res.json(result);

  } catch (error) {
    console.error('Error handling rejoin request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process rejoin request',
      error: error.message
    });
  }
};

/**
 * Get user's channel membership status
 */
const getUserMembershipStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { channelId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await channelMembershipService.getUserChannelMembershipStatus(
      userId, 
      channelId || null
    );

    return res.json(result);

  } catch (error) {
    console.error('Error getting membership status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get membership status',
      error: error.message
    });
  }
};

/**
 * Get channel membership analytics (Admin only)
 */
const getMembershipAnalytics = async (req, res) => {
  try {
    const adminId = req.admin?.id;

    const result = await channelMembershipService.getChannelMembershipAnalytics(adminId);

    return res.json(result);

  } catch (error) {
    console.error('Error getting membership analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get membership analytics',
      error: error.message
    });
  }
};

/**
 * Bulk check membership status (Admin only)
 */
const bulkCheckMembership = async (req, res) => {
  try {
    const { userChannelPairs } = req.body;

    if (!userChannelPairs || !Array.isArray(userChannelPairs)) {
      return res.status(400).json({
        success: false,
        message: 'User-channel pairs array is required'
      });
    }

    if (userChannelPairs.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 user-channel pairs allowed per request'
      });
    }

    const result = await channelMembershipService.bulkCheckMembershipStatus(userChannelPairs);

    return res.json(result);

  } catch (error) {
    console.error('Error in bulk membership check:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check membership status',
      error: error.message
    });
  }
};

/**
 * Generate recovery link for user who left channel (Admin function)
 */
const generateRecoveryLink = async (req, res) => {
  try {
    const { userId, channelId } = req.params;

    if (!userId || !channelId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Channel ID are required'
      });
    }

    // Find active subscription
    const subscription = await channelMembershipService.findActiveSubscriptionForChannel(userId, channelId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found for this channel'
      });
    }

    const result = await channelMembershipService.generateRecoveryInvite(userId, channelId, subscription);

    return res.json(result);

  } catch (error) {
    console.error('Error generating recovery link:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recovery link',
      error: error.message
    });
  }
};

/**
 * Get users who have left channels recently (Admin dashboard)
 */
const getRecentChannelLeavers = async (req, res) => {
  try {
    const { hours = 24, limit = 50 } = req.query;
    const adminId = req.admin?.id;

    // This would query a ChannelLeave model if implemented
    // For now, we'll return a mock response structure
    
    const recentLeavers = [
      // Mock data - replace with actual database query
      {
        userId: 'user123',
        userName: 'John Doe',
        userPhone: '+919876543210',
        channelId: 'channel456',
        channelTitle: 'Premium Trading Signals',
        leftAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        reason: 'left',
        hasActiveSubscription: true,
        recoveryGenerated: true,
        recoveryUsed: false
      }
    ];

    return res.json({
      success: true,
      recentLeavers,
      totalCount: recentLeavers.length,
      timeframe: `Last ${hours} hours`
    });

  } catch (error) {
    console.error('Error getting recent channel leavers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get recent channel leavers',
      error: error.message
    });
  }
};

/**
 * User-friendly rejoin interface for dashboard
 */
const getUserRejoinOptions = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find user by phone
    const User = require('../models/user.model');
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get membership status for all channels
    const membershipResult = await channelMembershipService.getUserChannelMembershipStatus(user._id);
    
    if (!membershipResult.success) {
      return res.status(500).json(membershipResult);
    }

    // Filter for channels user might want to rejoin
    const rejoinOptions = [];
    
    Object.values(membershipResult.membershipStatus).forEach(status => {
      if (status.hasActiveSubscription && status.currentStatus !== 'member') {
        rejoinOptions.push({
          channelId: status.channelId,
          channelTitle: status.channelTitle,
          currentStatus: status.currentStatus,
          canRejoin: status.canRejoin,
          hasRecoveryLinks: status.recoveryLinks.length > 0,
          lastSubscription: status.subscriptions[0] // Most recent
        });
      }
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      },
      rejoinOptions,
      totalOptions: rejoinOptions.length
    });

  } catch (error) {
    console.error('Error getting rejoin options:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get rejoin options',
      error: error.message
    });
  }
};

module.exports = {
  recordChannelLeave,
  handleRejoinRequest,
  getUserMembershipStatus,
  getMembershipAnalytics,
  bulkCheckMembership,
  generateRecoveryLink,
  getRecentChannelLeavers,
  getUserRejoinOptions
};