const multiBundleUserService = require('../services/multiBundleUserService');

/**
 * Get comprehensive user dashboard data
 */
const getUserDashboard = async (req, res) => {
  try {
    const { userPhone } = req.params;

    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: 'User phone number is required'
      });
    }

    const dashboardData = await multiBundleUserService.getUserDashboardData(userPhone);

    if (!dashboardData.success) {
      if (dashboardData.code === 'USER_NOT_FOUND') {
        return res.status(404).json(dashboardData);
      }
      return res.status(500).json(dashboardData);
    }

    return res.json(dashboardData);

  } catch (error) {
    console.error('Error getting user dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load user dashboard',
      error: error.message
    });
  }
};

/**
 * Create user account automatically
 */
const createUserAccount = async (req, res) => {
  try {
    const { phone, firstName, lastName, email, telegramUserId, source } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const user = await multiBundleUserService.getUserByPhoneOrCreate(phone, {
      autoCreate: true,
      firstName,
      lastName,
      email,
      telegramUserId,
      source
    });

    if (!user) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    return res.json({
      success: true,
      message: 'User account created successfully',
      user: {
        id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error creating user account:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: error.message
    });
  }
};

/**
 * Get user by phone (with optional auto-creation)
 */
const getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { autoCreate } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const user = await multiBundleUserService.getUserByPhoneOrCreate(phone, {
      autoCreate: autoCreate === 'true'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        telegramUserId: user.telegramUserId
      }
    });

  } catch (error) {
    console.error('Error getting user by phone:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

/**
 * Get user's subscription overlap analysis
 */
const getUserSubscriptionOverlap = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const analysis = await multiBundleUserService.getUserSubscriptionOverlap(userId);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    return res.json({
      success: true,
      analysis: analysis.analysis
    });

  } catch (error) {
    console.error('Error analyzing user subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze subscriptions',
      error: error.message
    });
  }
};

/**
 * Consolidate user's duplicate subscriptions (Admin only)
 */
const consolidateUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dryRun = false, keepLatest = true, extendExpiry = true, mergeInviteLinks = true } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify admin permissions (adjust based on your auth middleware)
    const adminRole = req.admin?.role;
    if (adminRole !== 'superadmin' && adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await multiBundleUserService.consolidateUserSubscriptions(userId, {
      dryRun: dryRun === true,
      keepLatest,
      extendExpiry,
      mergeInviteLinks
    });

    return res.json(result);

  } catch (error) {
    console.error('Error consolidating user subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to consolidate subscriptions',
      error: error.message
    });
  }
};

/**
 * Cancel user subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { phone } = req.body;

    if (!subscriptionId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and phone number are required'
      });
    }

    // Get user by phone
    const user = await multiBundleUserService.getUserByPhoneOrCreate(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and verify subscription belongs to user
    const PaymentLink = require('../models/paymentLinkModel');
    const subscription = await PaymentLink.findOne({
      _id: subscriptionId,
      userid: user._id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or does not belong to user'
      });
    }

    if (subscription.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    // Cancel the subscription
    await PaymentLink.findByIdAndUpdate(subscriptionId, {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancelled_by: 'user'
    });

    // Expire associated invite links
    const InviteLink = require('../models/InviteLink');
    await InviteLink.updateMany(
      { paymentLinkId: subscriptionId },
      { expires_at: new Date() }
    );

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

/**
 * Resume user subscription
 */
const resumeSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { phone } = req.body;

    if (!subscriptionId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and phone number are required'
      });
    }

    // Get user by phone
    const user = await multiBundleUserService.getUserByPhoneOrCreate(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find subscription
    const PaymentLink = require('../models/paymentLinkModel');
    const subscription = await PaymentLink.findOne({
      _id: subscriptionId,
      userid: user._id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Handle different subscription states
    if (subscription.status === 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already active'
      });
    }

    if (subscription.status === 'PENDING') {
      // For pending payments, user should complete the payment
      return res.json({
        success: true,
        message: 'Please complete the payment',
        action: 'complete_payment',
        paymentLink: subscription.link_url
      });
    }

    // For cancelled or failed subscriptions, allow reactivation
    await PaymentLink.findByIdAndUpdate(subscriptionId, {
      status: 'SUCCESS',
      resumed_at: new Date(),
      resumed_by: 'user'
    });

    return res.json({
      success: true,
      message: 'Subscription resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: error.message
    });
  }
};

/**
 * Get specific subscription details
 */
const getSubscriptionDetails = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    const PaymentLink = require('../models/paymentLinkModel');
    const subscription = await PaymentLink.findById(subscriptionId)
      .populate(['userid', 'groupId']);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Get invite links
    const InviteLink = require('../models/InviteLink');
    const inviteLinks = await InviteLink.find({
      paymentLinkId: subscriptionId
    });

    return res.json({
      success: true,
      data: {
        subscription: {
          id: subscription._id,
          planName: subscription.plan_name,
          amount: subscription.amount,
          status: subscription.status,
          createdAt: subscription.createdAt,
          expiryDate: subscription.expiry_date,
          linkUrl: subscription.link_url
        },
        user: subscription.userid ? {
          id: subscription.userid._id,
          phone: subscription.userid.phone,
          name: `${subscription.userid.firstName || ''} ${subscription.userid.lastName || ''}`.trim()
        } : null,
        channelBundle: subscription.groupId ? {
          id: subscription.groupId._id,
          name: subscription.groupId.name,
          description: subscription.groupId.description
        } : null,
        inviteLinks: inviteLinks.map(link => ({
          id: link._id,
          link: link.link,
          channelTitle: link.channelTitle,
          isUsed: link.is_used,
          expiresAt: link.expires_at
        }))
      }
    });

  } catch (error) {
    console.error('Error getting subscription details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get subscription details',
      error: error.message
    });
  }
};

module.exports = {
  getUserDashboard,
  createUserAccount,
  getUserByPhone,
  getUserSubscriptionOverlap,
  consolidateUserSubscriptions,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionDetails
};