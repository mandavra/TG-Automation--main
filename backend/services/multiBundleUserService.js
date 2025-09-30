const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const InviteLink = require('../models/InviteLink');
const { differenceInDays, format } = require('date-fns');

/**
 * Multi-Bundle User Management Service
 * Handles users with multiple channel bundle subscriptions
 */
class MultiBundleUserService {

  /**
   * Get comprehensive user dashboard data with all bundles
   * @param {string} userPhone - User's phone number
   * @returns {Promise<Object>} Complete user dashboard data
   */
  async getUserDashboardData(userPhone) {
    try {
      console.log(`🔍 Loading dashboard data for user: ${userPhone}`);

      // Find user by phone
      const user = await User.findOne({ phone: userPhone });
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Get all user payments
      const allPayments = await PaymentLink.find({ userid: user._id })
        .populate(['groupId'])
        .sort({ createdAt: -1 });

      // Categorize subscriptions
      const now = new Date();
      const subscriptions = {
        active: [],
        pending: [],
        expired: []
      };

      for (const payment of allPayments) {
        const expiryDate = new Date(payment.expiry_date);
        const isExpired = expiryDate < now;
        const isSuccessful = payment.status === 'SUCCESS';

        // Get invite links for this subscription
        const inviteLinks = await InviteLink.find({
          paymentLinkId: payment._id,
          userId: user._id
        });

        // Format invite links
        const formattedLinks = inviteLinks.map(link => ({
          id: link._id,
          link: link.link,
          channelId: link.channelId,
          channelTitle: link.channelTitle,
          expiresAt: link.expires_at,
          isUsed: link.is_used,
          usedAt: link.used_at
        }));

        // Determine subscription status
        let status;
        if (!isSuccessful) {
          status = payment.status === 'PENDING' ? 'payment_pending' : 'payment_failed';
        } else if (isExpired) {
          status = 'expired';
        } else {
          // Check if user has joined any channels
          const hasJoinedAny = formattedLinks.some(link => link.isUsed);
          status = hasJoinedAny ? 'active' : 'paid_not_joined';
        }

        const subscriptionData = {
          id: payment._id,
          userId: user._id,
          planName: payment.plan_name,
          amount: payment.amount,
          status: status,
          purchaseDate: payment.createdAt,
          expiresAt: payment.expiry_date,
          isActive: !isExpired && isSuccessful,
          channelBundle: payment.groupId ? {
            _id: payment.groupId._id,
            id: payment.groupId._id,
            name: payment.groupId.name,
            description: payment.groupId.description,
            image: payment.groupId.image,
            channelCount: payment.groupId.channels?.length || 0,
            channels: payment.groupId.channels || []
          } : null,
          inviteLinks: formattedLinks,
          timeLeftDays: isExpired ? 0 : differenceInDays(expiryDate, now),
          timeLeftHuman: this.formatTimeLeft(expiryDate, now)
        };

        // Categorize subscription
        if (status === 'active' || status === 'paid_not_joined') {
          subscriptions.active.push(subscriptionData);
        } else if (status === 'payment_pending') {
          subscriptions.pending.push(subscriptionData);
        } else {
          subscriptions.expired.push(subscriptionData);
        }
      }

      // Calculate summary statistics
      const summary = {
        activeCount: subscriptions.active.length,
        pendingCount: subscriptions.pending.length,
        expiredCount: subscriptions.expired.length,
        totalSubscriptions: allPayments.length,
        totalSpent: allPayments
          .filter(p => p.status === 'SUCCESS')
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      };

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            telegramUserId: user.telegramUserId
          },
          subscriptions,
          summary
        }
      };

    } catch (error) {
      console.error('❌ Error loading user dashboard data:', error);
      return {
        success: false,
        error: error.message,
        code: 'DASHBOARD_ERROR'
      };
    }
  }

  /**
   * Format time left in human-readable format
   * @param {Date} expiryDate - Expiry date
   * @param {Date} now - Current date
   * @returns {string} Human-readable time left
   */
  formatTimeLeft(expiryDate, now) {
    const diff = expiryDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  }

  /**
   * Get user's active channel bundles for API
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of active channel bundles
   */
  async getUserActiveChannelBundles(userId) {
    try {
      console.log(`🔍 Fetching active channel bundles for user: ${userId}`);

      const activePayments = await PaymentLink.find({
        userid: userId,
        status: 'SUCCESS',
        expiry_date: { $gt: new Date() }
      })
        .populate(['groupId'])
        .sort({ expiry_date: -1 });

      const channelBundles = [];

      for (const payment of activePayments) {
        if (!payment.groupId) continue;

        // Get invite links for this bundle
        const inviteLinks = await InviteLink.find({
          paymentLinkId: payment._id,
          userId: userId
        });

        channelBundles.push({
          paymentId: payment._id,
          channelBundle: {
            id: payment.groupId._id,
            name: payment.groupId.name,
            description: payment.groupId.description,
            image: payment.groupId.image,
            channelCount: payment.groupId.channels?.length || 0,
            channels: payment.groupId.channels?.map(channel => ({
              chatId: channel.chatId,
              chatTitle: channel.chatTitle,
              isActive: channel.isActive
            })) || []
          },
          inviteLinks: inviteLinks.map(link => ({
            id: link._id,
            link: link.link,
            channelId: link.channelId,
            channelTitle: link.channelTitle,
            expiresAt: link.expires_at,
            isUsed: link.is_used
          })),
          expiryDate: payment.expiry_date,
          isActive: new Date(payment.expiry_date) > new Date()
        });
      }

      console.log(`✅ Found ${channelBundles.length} active channel bundles for user`);
      return channelBundles;

    } catch (error) {
      console.error('❌ Error fetching user channel bundles:', error);
      throw error;
    }
  }

  /**
   * Get user by phone number with account creation if needed
   * @param {string} phone - Phone number
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} User data
   */
  async getUserByPhoneOrCreate(phone, options = {}) {
    try {
      let user = await User.findOne({ phone: phone });

      if (!user && options.autoCreate) {
        console.log(`📝 Auto-creating user account for phone: ${phone}`);
        
        user = new User({
          phone: phone,
          firstName: options.firstName || 'User',
          lastName: options.lastName || '',
          email: options.email || null,
          telegramUserId: options.telegramUserId || null,
          createdVia: options.source || 'dashboard_access',
          autoCreated: true
        });

        await user.save();
        console.log(`✅ Auto-created user account: ${user._id}`);
      }

      return user;

    } catch (error) {
      console.error('❌ Error getting/creating user by phone:', error);
      throw error;
    }
  }

  /**
   * Get user's subscription overlap analysis
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Overlap analysis
   */
  async getUserSubscriptionOverlap(userId) {
    try {
      const activePayments = await PaymentLink.find({
        userid: userId,
        status: 'SUCCESS'
      })
        .populate(['groupId'])
        .sort({ createdAt: -1 });

      const analysis = {
        totalSubscriptions: activePayments.length,
        uniqueBundles: new Set(),
        duplicateSubscriptions: [],
        overlappingChannels: new Map(),
        currentlyActive: 0,
        totalSpent: 0
      };

      const bundleSubscriptions = new Map();

      for (const payment of activePayments) {
        if (!payment.groupId) continue;

        const bundleId = payment.groupId._id.toString();
        const isActive = new Date(payment.expiry_date) > new Date();

        analysis.uniqueBundles.add(bundleId);
        analysis.totalSpent += payment.amount || 0;
        
        if (isActive) {
          analysis.currentlyActive++;
        }

        // Track multiple subscriptions to same bundle
        if (!bundleSubscriptions.has(bundleId)) {
          bundleSubscriptions.set(bundleId, []);
        }
        bundleSubscriptions.get(bundleId).push(payment);

        // Track channel overlaps
        if (payment.groupId.channels) {
          payment.groupId.channels.forEach(channel => {
            const channelId = channel.chatId;
            if (!analysis.overlappingChannels.has(channelId)) {
              analysis.overlappingChannels.set(channelId, {
                channelTitle: channel.chatTitle,
                subscriptions: []
              });
            }
            analysis.overlappingChannels.get(channelId).subscriptions.push({
              bundleId,
              bundleName: payment.groupId.name,
              paymentId: payment._id,
              expiryDate: payment.expiry_date,
              isActive
            });
          });
        }
      }

      // Identify duplicate subscriptions
      bundleSubscriptions.forEach((subscriptions, bundleId) => {
        if (subscriptions.length > 1) {
          analysis.duplicateSubscriptions.push({
            bundleId,
            bundleName: subscriptions[0].groupId.name,
            count: subscriptions.length,
            subscriptions: subscriptions.map(s => ({
              paymentId: s._id,
              amount: s.amount,
              expiryDate: s.expiry_date,
              isActive: new Date(s.expiry_date) > new Date()
            }))
          });
        }
      });

      // Convert overlapping channels map to array and filter for actual overlaps
      const overlappingChannelsArray = Array.from(analysis.overlappingChannels.entries())
        .filter(([_, data]) => data.subscriptions.length > 1)
        .map(([channelId, data]) => ({
          channelId,
          channelTitle: data.channelTitle,
          subscriptionCount: data.subscriptions.length,
          subscriptions: data.subscriptions
        }));

      return {
        success: true,
        analysis: {
          ...analysis,
          uniqueBundles: analysis.uniqueBundles.size,
          overlappingChannels: overlappingChannelsArray,
          hasOverlaps: analysis.duplicateSubscriptions.length > 0 || overlappingChannelsArray.length > 0
        }
      };

    } catch (error) {
      console.error('❌ Error analyzing subscription overlap:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Consolidate user's duplicate subscriptions (admin function)
   * @param {string} userId - User ID
   * @param {Object} options - Consolidation options
   * @returns {Promise<Object>} Consolidation result
   */
  async consolidateUserSubscriptions(userId, options = {}) {
    try {
      const {
        dryRun = false,
        keepLatest = true,
        extendExpiry = true,
        mergeInviteLinks = true
      } = options;

      console.log(`🔄 ${dryRun ? 'Simulating' : 'Performing'} subscription consolidation for user: ${userId}`);

      const overlapAnalysis = await this.getUserSubscriptionOverlap(userId);
      
      if (!overlapAnalysis.success || !overlapAnalysis.analysis.hasOverlaps) {
        return {
          success: true,
          message: 'No duplicate subscriptions found',
          consolidations: []
        };
      }

      const consolidations = [];

      for (const duplicate of overlapAnalysis.analysis.duplicateSubscriptions) {
        const subscriptions = duplicate.subscriptions;
        
        // Find the subscription to keep (latest or longest expiry)
        let keepSubscription = subscriptions[0];
        const removeSubscriptions = [];

        if (keepLatest) {
          // Keep the most recent subscription
          keepSubscription = subscriptions.reduce((latest, current) => 
            new Date(current.paymentId) > new Date(latest.paymentId) ? current : latest
          );
        } else {
          // Keep the one with longest expiry
          keepSubscription = subscriptions.reduce((longest, current) => 
            new Date(current.expiryDate) > new Date(longest.expiryDate) ? current : longest
          );
        }

        // Mark others for removal
        subscriptions.forEach(sub => {
          if (sub.paymentId !== keepSubscription.paymentId) {
            removeSubscriptions.push(sub);
          }
        });

        if (removeSubscriptions.length === 0) continue;

        const consolidation = {
          bundleId: duplicate.bundleId,
          bundleName: duplicate.bundleName,
          keepSubscription: keepSubscription.paymentId,
          removeSubscriptions: removeSubscriptions.map(s => s.paymentId),
          actions: []
        };

        if (!dryRun) {
          // Extend expiry if requested
          if (extendExpiry) {
            const additionalDays = removeSubscriptions.reduce((total, sub) => {
              const remainingDays = Math.max(0, differenceInDays(new Date(sub.expiryDate), new Date()));
              return total + remainingDays;
            }, 0);

            if (additionalDays > 0) {
              const newExpiryDate = new Date(keepSubscription.expiryDate);
              newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);

              await PaymentLink.findByIdAndUpdate(keepSubscription.paymentId, {
                expiry_date: newExpiryDate,
                consolidation_extended_days: additionalDays,
                consolidated_at: new Date()
              });

              consolidation.actions.push(`Extended expiry by ${additionalDays} days`);
            }
          }

          // Merge invite links if requested
          if (mergeInviteLinks) {
            for (const removeSub of removeSubscriptions) {
              await InviteLink.updateMany(
                { paymentLinkId: removeSub.paymentId },
                { paymentLinkId: keepSubscription.paymentId }
              );
            }
            consolidation.actions.push('Merged invite links');
          }

          // Mark removed subscriptions as consolidated
          await PaymentLink.updateMany(
            { _id: { $in: removeSubscriptions.map(s => s.paymentId) } },
            {
              status: 'CONSOLIDATED',
              consolidated_into: keepSubscription.paymentId,
              consolidated_at: new Date()
            }
          );

          consolidation.actions.push('Marked duplicates as consolidated');
        }

        consolidations.push(consolidation);
      }

      console.log(`✅ Consolidation ${dryRun ? 'simulation' : 'completion'}: ${consolidations.length} bundles processed`);

      return {
        success: true,
        message: `${dryRun ? 'Simulated' : 'Completed'} consolidation of ${consolidations.length} duplicate bundle subscriptions`,
        consolidations,
        dryRun
      };

    } catch (error) {
      console.error('❌ Error consolidating subscriptions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MultiBundleUserService();