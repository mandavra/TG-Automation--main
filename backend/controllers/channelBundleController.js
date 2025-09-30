const { 
  getUserChannelBundles, 
  getInviteLinksByChannelBundle,
  generateInviteLinksForChannelBundle 
} = require('../services/generateOneTimeInviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const Group = require('../models/group.model');
const InviteLink = require('../models/InviteLink');
const User = require('../models/user.model');

// Get user's active channel bundles with invite links
const getUserActiveChannelBundles = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`🔍 Fetching active channel bundles for user: ${userId}`);

    const channelBundles = await getUserChannelBundles(userId);
    
    // Format response for frontend
    const formattedBundles = channelBundles.map(bundle => ({
      paymentId: bundle.paymentId,
      channelBundle: {
        id: bundle.channelBundle._id,
        name: bundle.channelBundle.name,
        description: bundle.channelBundle.description,
        image: bundle.channelBundle.image,
        channelCount: bundle.channelBundle.channels.length,
        channels: bundle.channelBundle.channels.map(channel => ({
          chatId: channel.chatId,
          chatTitle: channel.chatTitle,
          isActive: channel.isActive
        }))
      },
      inviteLinks: bundle.inviteLinks.map(link => ({
        id: link._id,
        link: link.link,
        channelId: link.channelId,
        channelTitle: link.channelTitle,
        expiresAt: link.expires_at,
        isUsed: link.is_used
      })),
      expiryDate: bundle.expiryDate,
      isActive: new Date(bundle.expiryDate) > new Date()
    }));

    console.log(`✅ Found ${formattedBundles.length} active channel bundles for user`);

    return res.json({
      success: true,
      channelBundles: formattedBundles,
      totalBundles: formattedBundles.length
    });

  } catch (error) {
    console.error('Error fetching user channel bundles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch channel bundles',
      error: error.message
    });
  }
};

// Get invite links for a specific channel bundle
const getChannelBundleInviteLinks = async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    
    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Group ID are required'
      });
    }

    console.log(`🔍 Fetching invite links for user ${userId} in channel bundle ${groupId}`);

    const inviteLinks = await getInviteLinksByChannelBundle(userId, groupId);
    
    // Get channel bundle info
    const channelBundle = await Group.findById(groupId);
    
    if (!channelBundle) {
      return res.status(404).json({
        success: false,
        message: 'Channel bundle not found'
      });
    }

    const formattedLinks = inviteLinks.map(link => ({
      id: link._id,
      link: link.link,
      channelId: link.channelId,
      channelTitle: link.channelTitle,
      expiresAt: link.expires_at,
      duration: link.duration,
      isUsed: link.is_used,
      createdAt: link.createdAt
    }));

    console.log(`✅ Found ${formattedLinks.length} invite links for channel bundle`);

    return res.json({
      success: true,
      channelBundle: {
        id: channelBundle._id,
        name: channelBundle.name,
        description: channelBundle.description
      },
      inviteLinks: formattedLinks,
      totalLinks: formattedLinks.length
    });

  } catch (error) {
    console.error('Error fetching channel bundle invite links:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invite links',
      error: error.message
    });
  }
};

// Regenerate invite links for a channel bundle (admin only)
const regenerateChannelBundleLinks = async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    const { duration } = req.body;
    
    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Group ID are required'
      });
    }

    // Check if user has active subscription for this channel bundle
    const activePayment = await PaymentLink.findOne({
      userid: userId,
      groupId: groupId,
      status: 'SUCCESS',
      expiry_date: { $gt: new Date() }
    });

    if (!activePayment) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found for this channel bundle'
      });
    }

    console.log(`🔄 Regenerating invite links for user ${userId} in channel bundle ${groupId}`);

    // Revoke existing unused links for this channel bundle
    await InviteLink.updateMany(
      {
        userId: userId,
        groupId: groupId,
        is_used: false
      },
      {
        expires_at: new Date() // Expire them immediately
      }
    );

    // Generate new invite links
    const result = await generateInviteLinksForChannelBundle(
      userId,
      groupId,
      duration || activePayment.duration || 86400,
      activePayment._id,
      activePayment.plan_id
    );

    console.log(`✅ Regenerated ${result.successCount} invite links`);

    return res.json({
      success: true,
      message: 'Invite links regenerated successfully',
      result: {
        channelBundle: result.channelBundle,
        generatedLinks: result.generatedLinks,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error regenerating channel bundle links:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate invite links',
      error: error.message
    });
  }
};

// Get user subscription status with channel bundles
const getUserSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all user payments (active and expired)
    const payments = await PaymentLink.find({ userid: userId })
      .populate('groupId')
      .sort({ expiry_date: -1 });

    const activeSubscriptions = payments.filter(payment => 
      payment.status === 'SUCCESS' && new Date(payment.expiry_date) > new Date()
    );

    const subscriptionSummary = {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        telegramUserId: user.telegramUserId
      },
      hasActiveSubscription: activeSubscriptions.length > 0,
      activeSubscriptions: activeSubscriptions.map(payment => ({
        paymentId: payment._id,
        planName: payment.plan_name,
        amount: payment.amount,
        expiryDate: payment.expiry_date,
        channelBundle: payment.groupId ? {
          id: payment.groupId._id,
          name: payment.groupId.name,
          description: payment.groupId.description,
          channelCount: payment.groupId.channels.length
        } : null
      })),
      totalPayments: payments.length,
      totalActiveSubscriptions: activeSubscriptions.length
    };

    return res.json({
      success: true,
      ...subscriptionSummary
    });

  } catch (error) {
    console.error('Error fetching user subscription status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: error.message
    });
  }
};

// Get user's invite link summary (for dashboard)
const getUserInviteLinkSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get all invite links for this user
    const allLinks = await InviteLink.find({ userId: userId })
      .populate(['groupId', 'paymentLinkId'])
      .sort({ createdAt: -1 });

    const activeLinks = allLinks.filter(link => 
      !link.is_used && new Date(link.expires_at) > new Date()
    );

    const usedLinks = allLinks.filter(link => link.is_used);
    const expiredLinks = allLinks.filter(link => 
      !link.is_used && new Date(link.expires_at) <= new Date()
    );

    // Group by channel bundles
    const linksByBundle = {};
    activeLinks.forEach(link => {
      const bundleId = link.groupId?._id?.toString() || 'default';
      const bundleName = link.groupId?.name || 'Default Channel';
      
      if (!linksByBundle[bundleId]) {
        linksByBundle[bundleId] = {
          bundleName: bundleName,
          bundleId: bundleId,
          links: []
        };
      }
      
      linksByBundle[bundleId].links.push({
        id: link._id,
        link: link.link,
        channelTitle: link.channelTitle,
        channelId: link.channelId,
        expiresAt: link.expires_at
      });
    });

    const summary = {
      totalLinks: allLinks.length,
      activeLinks: activeLinks.length,
      usedLinks: usedLinks.length,
      expiredLinks: expiredLinks.length,
      linksByBundle: Object.values(linksByBundle),
      totalChannelBundles: Object.keys(linksByBundle).length
    };

    return res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching user invite link summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invite link summary',
      error: error.message
    });
  }
};

module.exports = {
  getUserActiveChannelBundles,
  getChannelBundleInviteLinks,
  regenerateChannelBundleLinks,
  getUserSubscriptionStatus,
  getUserInviteLinkSummary
};
