const channelLinkDeliveryService = require('../services/channelLinkDeliveryService');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');

/**
 * Verify channel link delivery for a specific payment
 */
const verifyChannelLinkDelivery = async (req, res) => {
  try {
    const { userId, paymentId } = req.params;

    if (!userId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Payment ID are required'
      });
    }

    const result = await channelLinkDeliveryService.verifyChannelLinkDelivery(userId, paymentId);

    return res.json({
      success: true,
      verification: result
    });

  } catch (error) {
    console.error('Error verifying channel link delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify channel link delivery',
      error: error.message
    });
  }
};

/**
 * Deliver missing channel links for a payment
 */
const deliverMissingChannelLinks = async (req, res) => {
  try {
    const { userId, paymentId } = req.params;
    const { duration, force } = req.body;

    if (!userId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Payment ID are required'
      });
    }

    const options = {};
    if (duration) options.duration = duration;
    if (force) options.force = force;

    const result = await channelLinkDeliveryService.deliverMissingChannelLinks(userId, paymentId, options);

    return res.json(result);

  } catch (error) {
    console.error('Error delivering missing channel links:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deliver missing channel links',
      error: error.message
    });
  }
};

/**
 * Get payments requiring link delivery verification (Admin)
 */
const getPaymentsRequiringVerification = async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 50 } = req.query;
    const adminId = req.admin?.id;

    const filters = {
      limit: parseInt(limit)
    };

    // Add admin filtering for tenant isolation
    if (adminId) {
      filters.adminId = adminId;
    }

    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const payments = await channelLinkDeliveryService.getPaymentsRequiringVerification(filters);

    // Format response for frontend
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      user: payment.userid ? {
        id: payment.userid._id,
        name: `${payment.userid.firstName || ''} ${payment.userid.lastName || ''}`.trim(),
        phone: payment.userid.phone,
        telegramUserId: payment.userid.telegramUserId
      } : null,
      channelBundle: payment.groupId ? {
        id: payment.groupId._id,
        name: payment.groupId.name,
        channelCount: payment.groupId.channels?.length || 0
      } : null,
      amount: payment.amount,
      planName: payment.plan_name,
      createdAt: payment.createdAt,
      expiryDate: payment.expiry_date,
      deliveryStatus: payment.delivery_status || 'pending',
      linkDelivered: payment.link_delivered || false,
      deliveryAttempts: payment.delivery_attempts || 0,
      lastDeliveryAttempt: payment.last_delivery_attempt,
      failureReason: payment.failure_reason
    }));

    return res.json({
      success: true,
      payments: formattedPayments,
      totalCount: formattedPayments.length
    });

  } catch (error) {
    console.error('Error getting payments requiring verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payments requiring verification',
      error: error.message
    });
  }
};

/**
 * Bulk verify and deliver channel links for multiple payments (Admin)
 */
const bulkVerifyAndDeliver = async (req, res) => {
  try {
    const { paymentIds, duration, delay = 500 } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment IDs array is required'
      });
    }

    if (paymentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 payments can be processed at once'
      });
    }

    const options = { delay: parseInt(delay) };
    if (duration) options.duration = duration;

    const result = await channelLinkDeliveryService.bulkVerifyAndDeliver(paymentIds, options);

    return res.json({
      success: true,
      message: `Bulk processing completed: ${result.completed} successful, ${result.failed} failed`,
      result: result
    });

  } catch (error) {
    console.error('Error in bulk verify and deliver:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk processing failed',
      error: error.message
    });
  }
};

/**
 * Get channel link delivery statistics (Admin Dashboard)
 */
const getDeliveryStatistics = async (req, res) => {
  try {
    const adminId = req.admin?.id;

    const stats = await channelLinkDeliveryService.getDeliveryStatistics(adminId);

    return res.json({
      success: true,
      statistics: stats
    });

  } catch (error) {
    console.error('Error getting delivery statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get delivery statistics',
      error: error.message
    });
  }
};

/**
 * Regenerate channel bundle links for user (User-facing)
 */
const regenerateUserChannelBundleLinks = async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    const { duration } = req.body;

    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Group ID are required'
      });
    }

    const options = {};
    if (duration) options.duration = duration;

    const result = await channelLinkDeliveryService.regenerateChannelBundleLinks(userId, groupId, options);

    if (result.code === 'NO_ACTIVE_SUBSCRIPTION') {
      return res.status(403).json(result);
    }

    return res.json(result);

  } catch (error) {
    console.error('Error regenerating user channel bundle links:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate channel bundle links',
      error: error.message
    });
  }
};

/**
 * Auto-verify and deliver links for recent successful payments
 */
const autoVerifyRecentPayments = async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const adminId = req.admin?.id;

    // Get recent successful payments
    const dateFrom = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    const payments = await channelLinkDeliveryService.getPaymentsRequiringVerification({
      adminId,
      dateFrom,
      limit: parseInt(limit)
    });

    if (payments.length === 0) {
      return res.json({
        success: true,
        message: 'No recent payments requiring verification',
        processed: 0
      });
    }

    // Extract payment IDs
    const paymentIds = payments.map(p => p._id);

    // Process them
    const result = await channelLinkDeliveryService.bulkVerifyAndDeliver(paymentIds, { delay: 200 });

    return res.json({
      success: true,
      message: `Auto-verification completed for ${paymentIds.length} recent payments`,
      result: result
    });

  } catch (error) {
    console.error('Error in auto-verify recent payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Auto-verification failed',
      error: error.message
    });
  }
};

module.exports = {
  verifyChannelLinkDelivery,
  deliverMissingChannelLinks,
  getPaymentsRequiringVerification,
  bulkVerifyAndDeliver,
  getDeliveryStatistics,
  regenerateUserChannelBundleLinks,
  autoVerifyRecentPayments
};