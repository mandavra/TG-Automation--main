const userActivityService = require('../services/userActivityService');
const User = require('../models/user.model');

class UserActivityController {
  // Get user journey timeline
  async getUserJourneyTimeline(req, res) {
    try {
      const { userId } = req.params;
      const { filter, dateRange, limit = 50, skip = 0 } = req.query;

      // Build filter options
      const options = {
        limit: parseInt(limit),
        skip: parseInt(skip)
      };

      // Date range filtering
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        switch (dateRange) {
          case 'today':
            options.startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            options.startDate = weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            options.startDate = monthAgo;
            break;
        }
      }

      // Activity type filtering
      if (filter && filter !== 'all') {
        const filterMap = {
          authentication: ['user_registered', 'user_login', 'user_logout', 'otp_requested', 'otp_verified', 'otp_failed'],
          kyc: ['kyc_started', 'kyc_document_uploaded', 'kyc_submitted', 'kyc_approved', 'kyc_rejected'],
          payment: ['payment_initiated', 'payment_success', 'payment_failed', 'channel_links_delivered'],
          esign: ['esign_initiated', 'esign_completed', 'esign_failed'],
          admin: ['admin_action_taken', 'manual_intervention'],
          errors: ['error_occurred']
        };
        
        options.activityTypes = filterMap[filter] || [];
      }

      const timeline = await userActivityService.getUserJourneyTimeline(userId, options);
      
      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      console.error('Error getting user journey timeline:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user journey timeline'
      });
    }
  }

  // Get user progress and current stage
  async getUserProgress(req, res) {
    try {
      const { userId } = req.params;
      
      const progress = await userActivityService.getUserProgress(userId);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error getting user progress:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user progress'
      });
    }
  }

  // Get user activity summary
  async getUserActivitySummary(req, res) {
    try {
      const { userId } = req.params;
      
      const summary = await userActivityService.getUserActivitySummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user activity summary'
      });
    }
  }

  // Get multiple users' journey data (for admin dashboard)
  async getMultipleUsersJourney(req, res) {
    try {
      const { userIds } = req.body;
      
      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          message: 'User IDs array is required'
        });
      }

      const journeyData = {};
      
      for (const userId of userIds) {
        try {
          const [timeline, progress] = await Promise.all([
            userActivityService.getUserJourneyTimeline(userId, { limit: 20 }),
            userActivityService.getUserProgress(userId)
          ]);
          
          journeyData[userId] = {
            timeline,
            progress,
            lastActivity: timeline[0]?.timestamp || null
          };
        } catch (error) {
          console.error(`Error getting data for user ${userId}:`, error);
          journeyData[userId] = {
            timeline: [],
            progress: {},
            error: error.message
          };
        }
      }
      
      res.json({
        success: true,
        data: journeyData
      });
    } catch (error) {
      console.error('Error getting multiple users journey:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get users journey data'
      });
    }
  }

  // Log admin action on user
  async logAdminAction(req, res) {
    try {
      const { userId } = req.params;
      const { action, description, additionalData = {} } = req.body;
      const adminId = req.admin._id;

      if (!action || !description) {
        return res.status(400).json({
          success: false,
          message: 'Action and description are required'
        });
      }

      await userActivityService.logAdminAction(userId, adminId, action, description, additionalData);
      
      res.json({
        success: true,
        message: 'Admin action logged successfully'
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to log admin action'
      });
    }
  }

  // Get user stage statistics (for dashboard analytics)
  async getUserStageStatistics(req, res) {
    try {
      const pipeline = [
        {
          $match: {
            currentStage: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$currentStage',
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const UserActivity = require('../models/userActivity.model');
      const stageStats = await UserActivity.aggregate(pipeline);
      
      // Get total users for percentages
      const totalUsers = await User.countDocuments();
      
      const statistics = stageStats.map(stat => ({
        stage: stat._id,
        count: stat.count,
        percentage: totalUsers > 0 ? ((stat.count / totalUsers) * 100).toFixed(1) : 0,
        lastActivity: stat.lastActivity
      }));
      
      res.json({
        success: true,
        data: {
          totalUsers,
          stageBreakdown: statistics
        }
      });
    } catch (error) {
      console.error('Error getting user stage statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user stage statistics'
      });
    }
  }

  // Get recent user activities across all users (for admin monitoring)
  async getRecentActivities(req, res) {
    try {
      const { limit = 50, activityTypes = null, priority = null } = req.query;
      
      const UserActivity = require('../models/userActivity.model');
      
      const query = { isVisibleToAdmin: true };
      
      if (activityTypes) {
        const types = activityTypes.split(',');
        query.activityType = { $in: types };
      }
      
      if (priority) {
        query.priority = priority;
      }
      
      const recentActivities = await UserActivity.find(query)
        .populate('user', 'firstName lastName phone email')
        .populate('admin', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
      
      res.json({
        success: true,
        data: recentActivities
      });
    } catch (error) {
      console.error('Error getting recent activities:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get recent activities'
      });
    }
  }

  // Get activity analytics (for charts and graphs)
  async getActivityAnalytics(req, res) {
    try {
      const { period = 'week' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      const UserActivity = require('../models/userActivity.model');
      
      // Activity trends over time
      const activityTrends = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            isVisibleToAdmin: true
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
              type: '$activityType'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);
      
      // Activity type breakdown
      const typeBreakdown = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            isVisibleToAdmin: true
          }
        },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Status breakdown
      const statusBreakdown = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            isVisibleToAdmin: true
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          trends: activityTrends,
          typeBreakdown,
          statusBreakdown
        }
      });
    } catch (error) {
      console.error('Error getting activity analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get activity analytics'
      });
    }
  }
}

module.exports = new UserActivityController();