const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const InviteLink = require('../models/InviteLink');
const ChannelMember = require('../models/ChannelMember');

// Get user dashboard data by phone number
// GET /api/user/dashboard/:phone
router.get('/dashboard/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`📱 Loading dashboard for phone: ${phone}`);

    // Find ALL users with this phone number (to handle duplicate accounts)
    const phoneFormats = [phone];
    if (phone.startsWith('+')) {
      phoneFormats.push(phone.substring(1));
    } else {
      phoneFormats.push('+' + phone);
    }
    
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Found ${allUsers.length} users for dashboard with phone formats:`, phoneFormats);
    
    if (allUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        data: null
      });
    }

    // Get the most recent user (primary account)
    const user = allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const allUserIds = allUsers.map(u => u._id);

    // Get all payments across ALL user accounts with this phone
    const payments = await PaymentLink.find({ 
      userid: { $in: allUserIds }
    })
    .populate('groupId')
    .sort({ createdAt: -1 });

    // Get all invite links across ALL user accounts
    const inviteLinks = await InviteLink.find({
      userId: { $in: allUserIds }
    }).sort({ createdAt: -1 });

    // Get user's channel memberships
    const channelMemberships = await ChannelMember.find({
      telegramUserId: user.telegramUserId
    }).sort({ createdAt: -1 });

    // Process subscriptions data
    const subscriptions = payments.map(payment => {
      // Find matching invite links
      const matchingLinks = inviteLinks.filter(link => 
        link.paymentLinkId && link.paymentLinkId.toString() === payment._id.toString()
      );

      // Find matching channel memberships
      const matchingMemberships = channelMemberships.filter(membership =>
        matchingLinks.some(link => link.link === membership.inviteLinkUsed)
      );

      const now = new Date();
      let status = 'expired';
      let expiresAt = null;
      let timeLeft = 0;

      if (payment.status === 'SUCCESS') {
        // Check if any channel membership is still active
        const activeMembership = matchingMemberships.find(m => 
          m.isActive && m.expiresAt > now
        );

        if (activeMembership) {
          status = 'active';
          expiresAt = activeMembership.expiresAt;
          timeLeft = Math.max(0, Math.floor((activeMembership.expiresAt - now) / 1000));
        } else if (payment.expiry_date > now && matchingLinks.length > 0 && !matchingLinks[0].is_used) {
          status = 'paid_not_joined';
          expiresAt = payment.expiry_date;
        }
      } else if (payment.status === 'PENDING') {
        status = 'payment_pending';
      } else if (payment.status === 'FAILED') {
        status = 'payment_failed';
      }

      return {
        id: payment._id,
        planName: payment.plan_name || 'Subscription',
        amount: payment.amount,
        status: status,
        paymentStatus: payment.status,
        purchaseDate: payment.createdAt,
        expiresAt: expiresAt,
        timeLeftSeconds: timeLeft,
        timeLeftHuman: timeLeft > 0 ? formatTimeLeft(timeLeft) : null,
        channelBundle: payment.groupId ? {
          _id: payment.groupId._id,
          id: payment.groupId._id,
          name: payment.groupId.name,
          channels: payment.groupId.channels || [],
          route: payment.groupId.route,
          slug: payment.groupId.slug,
          publicRoute: payment.groupId.publicRoute,
          description: payment.groupId.description,
          price: payment.groupId.price,
          duration: payment.groupId.duration
        } : null,
        inviteLinks: matchingLinks.map(link => ({
          id: link._id,
          link: link.link,
          isUsed: link.is_used,
          usedAt: link.used_at,
          channelId: link.channelId,
          channelTitle: link.channelTitle
        })),
        channelMemberships: matchingMemberships.map(membership => ({
          id: membership._id,
          channelId: membership.channelId,
          joinedAt: membership.joinedAt,
          expiresAt: membership.expiresAt,
          isActive: membership.isActive,
          kickedAt: membership.kickedAt,
          kickReason: membership.kickReason
        }))
      };
    });

    // Separate active and inactive subscriptions
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.status === 'active' || sub.status === 'paid_not_joined'
    );
    const expiredSubscriptions = subscriptions.filter(sub => 
      sub.status === 'expired'
    );
    const pendingSubscriptions = subscriptions.filter(sub => 
      sub.status === 'payment_pending' || sub.status === 'payment_failed'
    );

    console.log(`✅ Dashboard loaded: ${activeSubscriptions.length} active, ${expiredSubscriptions.length} expired, ${pendingSubscriptions.length} pending`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          telegramUserId: user.telegramUserId,
          telegramJoinStatus: user.telegramJoinStatus
        },
        subscriptions: {
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          pending: pendingSubscriptions,
          total: subscriptions.length
        },
        summary: {
          totalSubscriptions: subscriptions.length,
          activeCount: activeSubscriptions.length,
          expiredCount: expiredSubscriptions.length,
          pendingCount: pendingSubscriptions.length,
          totalSpent: payments
            .filter(p => p.status === 'SUCCESS')
            .reduce((sum, p) => sum + p.amount, 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard',
      error: error.message
    });
  }
});

// Get specific subscription details
// GET /api/user/subscription/:subscriptionId
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const payment = await PaymentLink.findById(subscriptionId)
      .populate('groupId')
      .populate('userid');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Get related invite links
    const inviteLinks = await InviteLink.find({
      paymentLinkId: payment._id
    });

    // Get related channel memberships
    const channelMemberships = await ChannelMember.find({
      telegramUserId: payment.userid.telegramUserId,
      inviteLinkUsed: { $in: inviteLinks.map(l => l.link) }
    });

    res.json({
      success: true,
      data: {
        subscription: payment,
        inviteLinks: inviteLinks,
        channelMemberships: channelMemberships
      }
    });

  } catch (error) {
    console.error('❌ Subscription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading subscription details',
      error: error.message
    });
  }
});

// Resume/Login with phone number
// POST /api/user/resume
router.post('/resume', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log(`📱 User attempting to resume session: ${phone}`);

    // Find user by phone
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number. Please register first.',
        action: 'register'
      });
    }

    // Check if user has any active subscriptions
    const activePayments = await PaymentLink.countDocuments({
      userid: user._id,
      status: 'SUCCESS',
      expiry_date: { $gt: new Date() }
    });

    console.log(`✅ User found: ${user.firstName} ${user.lastName} with ${activePayments} active subscriptions`);

    res.json({
      success: true,
      message: 'Welcome back!',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          hasActiveSubscriptions: activePayments > 0
        },
        action: 'dashboard'
      }
    });

  } catch (error) {
    console.error('❌ Resume session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming session',
      error: error.message
    });
  }
});

// Utility function to format time left
function formatTimeLeft(seconds) {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Check if user has already purchased a specific bundle
// GET /api/user/check-purchase/:phone/:bundleId
router.get('/check-purchase/:phone/:bundleId', async (req, res) => {
  try {
    const { phone, bundleId } = req.params;
    console.log(`🔍 Checking purchase for phone: ${phone}, bundle: ${bundleId}`);

    // Find ALL users with this phone number (to handle duplicate accounts)
    const phoneFormats = [phone];
    if (phone.startsWith('+')) {
      phoneFormats.push(phone.substring(1));
    } else {
      phoneFormats.push('+' + phone);
    }
    
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Found ${allUsers.length} users with phone formats:`, phoneFormats);
    
    if (allUsers.length === 0) {
      console.log(`❌ No users found for phone: ${phone}`);
      return res.json({
        success: true,
        hasPurchased: false,
        message: 'User not found',
        debug: {
          searchedPhone: phone,
          searchedFormats: phoneFormats
        }
      });
    }

    // Check for successful payments across ALL users with this phone number
    const allUserIds = allUsers.map(u => u._id);
    const successfulPayment = await PaymentLink.findOne({
      userid: { $in: allUserIds },
      groupId: bundleId,
      status: 'SUCCESS'
    }).sort({ createdAt: -1 });
    
    // Get the user associated with the payment (if found)
    const user = successfulPayment ? allUsers.find(u => u._id.toString() === successfulPayment.userid.toString()) : allUsers[0];

    if (successfulPayment) {
      // Check if subscription is still active
      const now = new Date();
      const isActive = successfulPayment.expiry_date > now;
      
      // Get related invite links to check completion status
      const inviteLinks = await InviteLink.find({
        paymentLinkId: successfulPayment._id
      });
      
      // Get channel memberships to check if user has joined channels
      const channelMemberships = await ChannelMember.find({
        telegramUserId: user.telegramUserId
      });
      
      // Determine if user has completed the full flow
      const hasJoinedChannels = channelMemberships.length > 0;
      const hasInviteLinks = inviteLinks.length > 0;
      
      let completionStatus = 'payment_only';
      if (hasJoinedChannels) {
        completionStatus = 'fully_completed';
      } else if (hasInviteLinks) {
        completionStatus = 'paid_not_joined';
      }
      
      return res.json({
        success: true,
        hasPurchased: true,
        isActive: isActive,
        completionStatus: completionStatus,
        canContinueFlow: completionStatus !== 'fully_completed' && isActive,
        subscription: {
          id: successfulPayment._id,
          planName: successfulPayment.plan_name,
          amount: successfulPayment.amount,
          purchaseDate: successfulPayment.createdAt,
          expiryDate: successfulPayment.expiry_date,
          status: isActive ? 'active' : 'expired'
        },
        flowStatus: {
          paymentCompleted: true,
          hasInviteLinks: hasInviteLinks,
          hasJoinedChannels: hasJoinedChannels,
          inviteLinkCount: inviteLinks.length,
          channelMembershipCount: channelMemberships.length
        },
        inviteLinks: inviteLinks.map(link => ({
          id: link._id,
          link: link.link,
          status: link.status,
          expires_at: link.expires_at,
          is_used: link.is_used,
          used_at: link.used_at
        })),
        channelMemberships: channelMemberships.map(membership => ({
          id: membership._id,
          channelId: membership.channelId,
          channelName: membership.channelName,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
          expiresAt: membership.expiresAt
        }))
      });
    }

    res.json({
      success: true,
      hasPurchased: false,
      message: 'No purchase found for this bundle'
    });

  } catch (error) {
    console.error('❌ Check purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking purchase status',
      error: error.message
    });
  }
});

// Create user account (used by dashboard when account doesn't exist)
// POST /api/user/create-account
router.post('/create-account', async (req, res) => {
  try {
    const { phone, autoCreated = false, source = 'manual' } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone: phone });
    if (existingUser) {
      return res.json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      });
    }

    // Create new user
    const newUser = new User({
      phone: phone,
      firstName: 'User',
      lastName: '',
      telegramJoinStatus: 'pending'
    });

    const savedUser = await newUser.save();
    console.log(`✅ Auto-created user account for phone: ${phone}`);

    res.json({
      success: true,
      user: savedUser,
      message: 'User account created successfully'
    });

  } catch (error) {
    console.error('❌ User creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account',
      error: error.message
    });
  }
});

module.exports = router;
