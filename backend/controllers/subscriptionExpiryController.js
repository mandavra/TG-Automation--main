const subscriptionExpiryService = require('../services/subscriptionExpiryService');

/**
 * Get subscriptions expiring within specified days
 */
const getExpiringSubscriptions = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const adminId = req.admin?.id;

    const subscriptions = await subscriptionExpiryService.getSubscriptionsExpiringIn(
      parseInt(days),
      adminId
    );

    // Format response for frontend
    const formattedSubscriptions = subscriptions.map(subscription => ({
      id: subscription._id,
      user: subscription.userid ? {
        id: subscription.userid._id,
        name: `${subscription.userid.firstName || ''} ${subscription.userid.lastName || ''}`.trim(),
        phone: subscription.userid.phone,
        email: subscription.userid.email
      } : null,
      channelBundle: subscription.groupId ? {
        id: subscription.groupId._id,
        name: subscription.groupId.name,
        description: subscription.groupId.description,
        channelCount: subscription.groupId.channels?.length || 0
      } : null,
      planName: subscription.plan_name,
      amount: subscription.amount,
      expiryDate: subscription.expiry_date,
      daysUntilExpiry: subscription.daysUntilExpiry,
      hoursUntilExpiry: subscription.hoursUntilExpiry,
      expiryCategory: subscription.expiryCategory,
      urgencyLevel: subscription.urgencyLevel,
      createdAt: subscription.createdAt
    }));

    return res.json({
      success: true,
      subscriptions: formattedSubscriptions,
      totalCount: formattedSubscriptions.length,
      daysFilter: parseInt(days)
    });

  } catch (error) {
    console.error('Error getting expiring subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get expiring subscriptions',
      error: error.message
    });
  }
};

/**
 * Send expiry notification to a specific subscription
 */
const sendExpiryNotification = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { notificationType = 'reminder' } = req.body;

    // Get subscription details
    const PaymentLink = require('../models/paymentLinkModel');
    const subscription = await PaymentLink.findById(subscriptionId)
      .populate(['userid', 'groupId']);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Add expiry details
    const { differenceInDays } = require('date-fns');
    subscription.daysUntilExpiry = differenceInDays(new Date(subscription.expiry_date), new Date());

    const notificationSent = await subscriptionExpiryService.sendExpiryNotification(
      subscription,
      notificationType
    );

    return res.json({
      success: true,
      message: notificationSent ? 'Notification sent successfully' : 'Notification could not be sent',
      notificationSent,
      subscription: {
        id: subscription._id,
        user: subscription.userid?.phone,
        planName: subscription.plan_name,
        daysUntilExpiry: subscription.daysUntilExpiry
      }
    });

  } catch (error) {
    console.error('Error sending expiry notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send expiry notification',
      error: error.message
    });
  }
};

/**
 * Process expiry notifications for all qualifying subscriptions
 */
const processExpiryNotifications = async (req, res) => {
  try {
    const { 
      daysAhead = [7, 3, 1],
      batchSize = 50,
      delay = 1000 
    } = req.body;
    const adminId = req.admin?.id;

    const options = {
      daysAhead: Array.isArray(daysAhead) ? daysAhead : [daysAhead],
      adminId,
      batchSize: parseInt(batchSize),
      delay: parseInt(delay)
    };

    const results = await subscriptionExpiryService.processExpiryNotifications(options);

    return res.json({
      success: true,
      message: `Processing completed: ${results.processed} processed, ${results.notificationsSent} notifications sent`,
      results
    });

  } catch (error) {
    console.error('Error processing expiry notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process expiry notifications',
      error: error.message
    });
  }
};

/**
 * Get expiry statistics for admin dashboard
 */
const getExpiryStatistics = async (req, res) => {
  try {
    const adminId = req.admin?.id;

    const statistics = await subscriptionExpiryService.getExpiryStatistics(adminId);

    return res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error getting expiry statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get expiry statistics',
      error: error.message
    });
  }
};

/**
 * Extend subscription manually
 */
const extendSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { additionalDays, reason = 'Admin extension' } = req.body;

    if (!additionalDays || additionalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Additional days must be a positive number'
      });
    }

    if (additionalDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend subscription by more than 365 days at once'
      });
    }

    const result = await subscriptionExpiryService.extendSubscription(
      subscriptionId,
      parseInt(additionalDays),
      reason
    );

    if (result.success) {
      return res.json({
        success: true,
        message: `Subscription extended by ${result.additionalDays} days`,
        newExpiryDate: result.newExpiryDate,
        additionalDays: result.additionalDays,
        reason: result.reason
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to extend subscription'
      });
    }

  } catch (error) {
    console.error('Error extending subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to extend subscription',
      error: error.message
    });
  }
};

/**
 * Bulk extend multiple subscriptions
 */
const bulkExtendSubscriptions = async (req, res) => {
  try {
    const { subscriptionIds, additionalDays, reason = 'Bulk admin extension' } = req.body;

    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Subscription IDs array is required'
      });
    }

    if (subscriptionIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend more than 100 subscriptions at once'
      });
    }

    if (!additionalDays || additionalDays <= 0 || additionalDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Additional days must be between 1 and 365'
      });
    }

    const results = {
      total: subscriptionIds.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const subscriptionId of subscriptionIds) {
      try {
        const result = await subscriptionExpiryService.extendSubscription(
          subscriptionId,
          parseInt(additionalDays),
          reason
        );

        if (result.success) {
          results.successful++;
          results.details.push({
            subscriptionId,
            status: 'success',
            newExpiryDate: result.newExpiryDate
          });
        } else {
          results.failed++;
          results.details.push({
            subscriptionId,
            status: 'failed',
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          subscriptionId,
          status: 'error',
          error: error.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Bulk extension completed: ${results.successful} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk extend subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk extension failed',
      error: error.message
    });
  }
};

/**
 * Get subscription renewal recommendations
 */
const getRenewalRecommendations = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    
    // Get subscriptions expiring in next 3 days (high priority renewals)
    const highPriorityRenewals = await subscriptionExpiryService.getSubscriptionsExpiringIn(3, adminId);
    
    // Get subscriptions expiring in next 7 days
    const weeklyRenewals = await subscriptionExpiryService.getSubscriptionsExpiringIn(7, adminId);

    // Calculate renewal opportunities
    const renewalStats = await subscriptionExpiryService.getExpiryStatistics(adminId);

    // Format recommendations
    const recommendations = {
      highPriority: highPriorityRenewals.map(sub => ({
        id: sub._id,
        user: sub.userid?.phone || 'Unknown',
        planName: sub.plan_name,
        amount: sub.amount,
        daysLeft: sub.daysUntilExpiry,
        urgencyLevel: sub.urgencyLevel,
        potentialRevenue: sub.amount // If they renew same plan
      })),
      thisWeek: weeklyRenewals.length,
      totalOpportunities: renewalStats.renewalOpportunities,
      potentialRevenue: highPriorityRenewals.reduce((sum, sub) => sum + (sub.amount || 0), 0)
    };

    return res.json({
      success: true,
      recommendations,
      statistics: renewalStats
    });

  } catch (error) {
    console.error('Error getting renewal recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get renewal recommendations',
      error: error.message
    });
  }
};

module.exports = {
  getExpiringSubscriptions,
  sendExpiryNotification,
  processExpiryNotifications,
  getExpiryStatistics,
  extendSubscription,
  bulkExtendSubscriptions,
  getRenewalRecommendations
};