const InviteLink = require('../models/InviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const { generateInviteLinksForChannelBundle } = require('./generateOneTimeInviteLink');

/**
 * Channel Membership Management Service
 * Handles users accidentally leaving Telegram channels and provides recovery mechanisms
 */
class ChannelMembershipService {

  /**
   * Record when a user leaves a channel
   * @param {string} channelId - Telegram channel ID
   * @param {string} telegramUserId - User's Telegram ID
   * @param {string} reason - Leave reason (left, kicked, banned)
   * @returns {Promise<Object>} Recording result
   */
  async recordChannelLeave(channelId, telegramUserId, reason = 'left') {
    try {
      console.log(`📤 Recording channel leave: User ${telegramUserId} ${reason} channel ${channelId}`);

      // Find user by Telegram ID
      const user = await User.findOne({ telegramUserId: telegramUserId });
      if (!user) {
        return {
          success: false,
          error: 'User not found in database',
          code: 'USER_NOT_FOUND'
        };
      }

      // Find active subscription for this channel
      const activeSubscription = await this.findActiveSubscriptionForChannel(user._id, channelId);
      
      if (!activeSubscription) {
        console.log(`⚠️ No active subscription found for user ${telegramUserId} in channel ${channelId}`);
        return {
          success: true,
          message: 'No active subscription found - no action needed',
          code: 'NO_SUBSCRIPTION'
        };
      }

      // Record the leave event
      const leaveRecord = await this.createLeaveRecord({
        userId: user._id,
        telegramUserId,
        channelId,
        reason,
        subscriptionId: activeSubscription.paymentId,
        bundleId: activeSubscription.bundleId,
        leftAt: new Date(),
        canRejoin: reason === 'left' // Can rejoin if they left voluntarily
      });

      // Generate automatic recovery if eligible
      if (reason === 'left' && activeSubscription.isActive) {
        const recoveryResult = await this.generateRecoveryInvite(user._id, channelId, activeSubscription);
        
        return {
          success: true,
          message: 'Channel leave recorded and recovery invite generated',
          leaveRecord,
          recovery: recoveryResult,
          code: 'LEAVE_RECORDED_WITH_RECOVERY'
        };
      }

      return {
        success: true,
        message: 'Channel leave recorded',
        leaveRecord,
        code: 'LEAVE_RECORDED'
      };

    } catch (error) {
      console.error('❌ Error recording channel leave:', error);
      return {
        success: false,
        error: error.message,
        code: 'RECORDING_ERROR'
      };
    }
  }

  /**
   * Find active subscription for a specific channel
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object|null>} Active subscription or null
   */
  async findActiveSubscriptionForChannel(userId, channelId) {
    try {
      // Find active invite links for this user and channel
      const activeLinks = await InviteLink.find({
        userId: userId,
        channelId: channelId,
        is_used: true,
        expires_at: { $gt: new Date() }
      }).populate(['paymentLinkId', 'groupId']);

      if (activeLinks.length === 0) {
        return null;
      }

      const link = activeLinks[0];
      const payment = link.paymentLinkId;

      if (!payment || payment.status !== 'SUCCESS') {
        return null;
      }

      return {
        paymentId: payment._id,
        bundleId: link.groupId?._id,
        userId: userId,
        channelId: channelId,
        expiryDate: payment.expiry_date,
        isActive: new Date(payment.expiry_date) > new Date(),
        planName: payment.plan_name,
        amount: payment.amount
      };

    } catch (error) {
      console.error('❌ Error finding active subscription:', error);
      return null;
    }
  }

  /**
   * Create a leave record in the database
   * @param {Object} leaveData - Leave event data
   * @returns {Promise<Object>} Created leave record
   */
  async createLeaveRecord(leaveData) {
    try {
      // You might want to create a dedicated ChannelLeave model
      // For now, we'll use the existing InviteLink model with additional fields
      
      const leaveRecord = {
        userId: leaveData.userId,
        telegramUserId: leaveData.telegramUserId,
        channelId: leaveData.channelId,
        reason: leaveData.reason,
        subscriptionId: leaveData.subscriptionId,
        bundleId: leaveData.bundleId,
        leftAt: leaveData.leftAt,
        canRejoin: leaveData.canRejoin,
        recoveryAttempts: 0,
        lastRecoveryAttempt: null
      };

      // Store in a collection or add to existing records
      // This could be a new model ChannelMembershipEvent
      console.log('📝 Leave record created:', leaveRecord);
      
      return leaveRecord;

    } catch (error) {
      console.error('❌ Error creating leave record:', error);
      throw error;
    }
  }

  /**
   * Generate recovery invite link for user who accidentally left
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   * @param {Object} subscription - Active subscription data
   * @returns {Promise<Object>} Recovery result
   */
  async generateRecoveryInvite(userId, channelId, subscription) {
    try {
      console.log(`🔄 Generating recovery invite for user ${userId} in channel ${channelId}`);

      // First, mark any existing unused links for this channel as expired
      await InviteLink.updateMany(
        {
          userId: userId,
          channelId: channelId,
          is_used: false,
          expires_at: { $gt: new Date() }
        },
        {
          expires_at: new Date(),
          note: 'Expired due to channel leave recovery'
        }
      );

      // Generate new recovery invite link
      const recoveryDuration = 7 * 24 * 60 * 60; // 7 days in seconds
      
      const result = await generateInviteLinksForChannelBundle(
        userId,
        subscription.bundleId,
        recoveryDuration,
        subscription.paymentId,
        null, // plan_id not needed for recovery
        {
          specificChannelId: channelId,
          isRecovery: true,
          recoveryReason: 'channel_leave'
        }
      );

      if (result.successCount > 0) {
        console.log(`✅ Recovery invite generated successfully for channel ${channelId}`);
        
        return {
          success: true,
          message: 'Recovery invite link generated',
          recoveryLink: result.generatedLinks[0],
          expiresIn: '7 days',
          channelId: channelId
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate recovery invite',
          errors: result.errors
        };
      }

    } catch (error) {
      console.error('❌ Error generating recovery invite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's channel membership status
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID (optional)
   * @returns {Promise<Object>} Membership status
   */
  async getUserChannelMembershipStatus(userId, channelId = null) {
    try {
      let query = { userId: userId };
      if (channelId) {
        query.channelId = channelId;
      }

      const inviteLinks = await InviteLink.find(query)
        .populate(['paymentLinkId', 'groupId'])
        .sort({ createdAt: -1 });

      const membershipStatus = {};

      for (const link of inviteLinks) {
        const channelKey = link.channelId;
        
        if (!membershipStatus[channelKey]) {
          membershipStatus[channelKey] = {
            channelId: link.channelId,
            channelTitle: link.channelTitle,
            subscriptions: [],
            currentStatus: 'unknown',
            hasActiveSubscription: false,
            canRejoin: false,
            recoveryLinks: []
          };
        }

        const payment = link.paymentLinkId;
        const isActive = payment && 
                        payment.status === 'SUCCESS' && 
                        new Date(payment.expiry_date) > new Date();

        const subscriptionInfo = {
          linkId: link._id,
          paymentId: payment?._id,
          isUsed: link.is_used,
          isExpired: link.expires_at && new Date(link.expires_at) <= new Date(),
          isActive: isActive,
          createdAt: link.createdAt,
          expiresAt: link.expires_at,
          planName: payment?.plan_name,
          bundleName: link.groupId?.name
        };

        membershipStatus[channelKey].subscriptions.push(subscriptionInfo);

        // Update status based on most recent/active subscription
        if (isActive) {
          membershipStatus[channelKey].hasActiveSubscription = true;
          
          if (link.is_used) {
            membershipStatus[channelKey].currentStatus = 'member';
          } else {
            membershipStatus[channelKey].currentStatus = 'invited_not_joined';
            membershipStatus[channelKey].canRejoin = true;
          }
        }

        // Check if this is a recovery link
        if (link.note && link.note.includes('recovery')) {
          membershipStatus[channelKey].recoveryLinks.push(subscriptionInfo);
        }
      }

      return {
        success: true,
        membershipStatus: channelId ? membershipStatus[channelId] : membershipStatus
      };

    } catch (error) {
      console.error('❌ Error getting membership status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle user rejoin request
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   * @param {string} reason - Rejoin reason
   * @returns {Promise<Object>} Rejoin result
   */
  async handleUserRejoinRequest(userId, channelId, reason = 'accidental_leave') {
    try {
      console.log(`🔄 Processing rejoin request for user ${userId} in channel ${channelId}`);

      // Check if user has active subscription for this channel
      const subscription = await this.findActiveSubscriptionForChannel(userId, channelId);
      
      if (!subscription) {
        return {
          success: false,
          error: 'No active subscription found for this channel',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        };
      }

      // Check for existing unused recovery links
      const existingRecoveryLink = await InviteLink.findOne({
        userId: userId,
        channelId: channelId,
        is_used: false,
        expires_at: { $gt: new Date() },
        note: { $regex: /recovery/ }
      });

      if (existingRecoveryLink) {
        return {
          success: true,
          message: 'Recovery link already available',
          recoveryLink: {
            id: existingRecoveryLink._id,
            link: existingRecoveryLink.link,
            expiresAt: existingRecoveryLink.expires_at
          },
          code: 'EXISTING_RECOVERY_AVAILABLE'
        };
      }

      // Generate new recovery link
      const recoveryResult = await this.generateRecoveryInvite(userId, channelId, subscription);
      
      if (recoveryResult.success) {
        // Record the rejoin attempt
        await this.recordRejoinAttempt(userId, channelId, reason);
        
        return {
          success: true,
          message: 'New recovery link generated',
          recovery: recoveryResult,
          code: 'NEW_RECOVERY_GENERATED'
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate recovery link',
          details: recoveryResult.error,
          code: 'RECOVERY_GENERATION_FAILED'
        };
      }

    } catch (error) {
      console.error('❌ Error handling rejoin request:', error);
      return {
        success: false,
        error: error.message,
        code: 'REJOIN_ERROR'
      };
    }
  }

  /**
   * Record rejoin attempt
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   * @param {string} reason - Rejoin reason
   */
  async recordRejoinAttempt(userId, channelId, reason) {
    try {
      // This would ideally go to a rejoin attempts collection
      const rejoinRecord = {
        userId,
        channelId,
        reason,
        requestedAt: new Date(),
        ipAddress: null, // Could be captured from request
        userAgent: null  // Could be captured from request
      };

      console.log('📝 Rejoin attempt recorded:', rejoinRecord);
      // Store in database
      
    } catch (error) {
      console.error('❌ Error recording rejoin attempt:', error);
    }
  }

  /**
   * Get channel membership analytics for admin
   * @param {string} adminId - Admin ID (optional, for tenant filtering)
   * @returns {Promise<Object>} Membership analytics
   */
  async getChannelMembershipAnalytics(adminId = null) {
    try {
      let matchQuery = {};
      
      if (adminId) {
        // Filter by admin's groups
        const adminGroups = await Group.find({ createdBy: adminId });
        const adminGroupIds = adminGroups.map(group => group._id);
        matchQuery.groupId = { $in: adminGroupIds };
      }

      // Get invite link statistics
      const linkStats = await InviteLink.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$channelId',
            channelTitle: { $first: '$channelTitle' },
            totalInvites: { $sum: 1 },
            usedInvites: {
              $sum: { $cond: [{ $eq: ['$is_used', true] }, 1, 0] }
            },
            expiredInvites: {
              $sum: { 
                $cond: [
                  { $and: [
                    { $eq: ['$is_used', false] },
                    { $lte: ['$expires_at', new Date()] }
                  ]}, 
                  1, 
                  0
                ] 
              }
            }
          }
        },
        {
          $addFields: {
            joinRate: {
              $cond: [
                { $eq: ['$totalInvites', 0] },
                0,
                { $multiply: [{ $divide: ['$usedInvites', '$totalInvites'] }, 100] }
              ]
            }
          }
        },
        { $sort: { totalInvites: -1 } }
      ]);

      const totalStats = linkStats.reduce((acc, channel) => {
        acc.totalChannels++;
        acc.totalInvites += channel.totalInvites;
        acc.totalJoined += channel.usedInvites;
        acc.totalExpired += channel.expiredInvites;
        return acc;
      }, {
        totalChannels: 0,
        totalInvites: 0,
        totalJoined: 0,
        totalExpired: 0
      });

      totalStats.overallJoinRate = totalStats.totalInvites > 0 
        ? ((totalStats.totalJoined / totalStats.totalInvites) * 100).toFixed(2)
        : 0;

      return {
        success: true,
        analytics: {
          summary: totalStats,
          channelBreakdown: linkStats
        }
      };

    } catch (error) {
      console.error('❌ Error getting membership analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk check channel membership status via Telegram API
   * @param {Array} userChannelPairs - Array of {userId, channelId} pairs
   * @returns {Promise<Object>} Bulk membership check result
   */
  async bulkCheckMembershipStatus(userChannelPairs) {
    try {
      // This would integrate with your Telegram bot API
      // For now, returning a mock response structure
      
      const results = [];
      
      for (const pair of userChannelPairs) {
        // Mock check - replace with actual Telegram API call
        const mockStatus = Math.random() > 0.8 ? 'left' : 'member';
        
        results.push({
          userId: pair.userId,
          channelId: pair.channelId,
          status: mockStatus, // member, left, kicked, banned
          lastChecked: new Date()
        });
      }

      return {
        success: true,
        results,
        checkedCount: results.length
      };

    } catch (error) {
      console.error('❌ Error in bulk membership check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ChannelMembershipService();