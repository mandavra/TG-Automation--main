const InviteLink = require('../models/InviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const { generateInviteLinksForChannelBundle } = require('./generateOneTimeInviteLink');

/**
 * Channel Link Delivery Verification and Recovery Service
 * Ensures users receive their paid channel access links
 */
class ChannelLinkDeliveryService {
  
  /**
   * Verify if user has received all expected channel links for a payment
   * @param {string} userId - User ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Verification result with delivery status
   */
  async verifyChannelLinkDelivery(userId, paymentId) {
    try {
      console.log(`🔍 Verifying channel link delivery for user ${userId}, payment ${paymentId}`);

      // Get payment details
      const payment = await PaymentLink.findById(paymentId).populate('groupId');
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
          deliveryStatus: 'payment_not_found'
        };
      }

      if (payment.status !== 'SUCCESS') {
        return {
          success: true,
          deliveryStatus: 'payment_not_successful',
          payment: payment,
          expectedLinks: 0,
          actualLinks: 0,
          message: 'Payment not successful, no links expected'
        };
      }

      // Get channel bundle details
      const channelBundle = payment.groupId;
      if (!channelBundle || !channelBundle.channels) {
        return {
          success: false,
          error: 'Channel bundle not found or has no channels',
          deliveryStatus: 'bundle_error',
          payment: payment
        };
      }

      const expectedChannelCount = channelBundle.channels.length;
      
      // Get existing invite links for this payment
      const existingLinks = await InviteLink.find({
        userId: userId,
        paymentLinkId: paymentId,
        groupId: channelBundle._id
      });

      // Count valid (non-expired, non-revoked) links
      const validLinks = existingLinks.filter(link => {
        const isExpired = link.expires_at && new Date(link.expires_at) <= new Date();
        return !isExpired;
      });

      const deliveryComplete = validLinks.length >= expectedChannelCount;
      
      console.log(`📊 Delivery verification result: Expected ${expectedChannelCount}, Valid ${validLinks.length}, Complete: ${deliveryComplete}`);

      return {
        success: true,
        deliveryStatus: deliveryComplete ? 'complete' : 'incomplete',
        payment: payment,
        channelBundle: channelBundle,
        expectedLinks: expectedChannelCount,
        actualLinks: validLinks.length,
        validLinks: validLinks,
        allLinks: existingLinks,
        deliveryComplete: deliveryComplete,
        missingLinks: expectedChannelCount - validLinks.length
      };

    } catch (error) {
      console.error('❌ Channel link delivery verification failed:', error);
      return {
        success: false,
        error: error.message,
        deliveryStatus: 'verification_error'
      };
    }
  }

  /**
   * Deliver missing channel links for a successful payment
   * @param {string} userId - User ID
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Delivery options
   * @returns {Promise<Object>} Delivery result
   */
  async deliverMissingChannelLinks(userId, paymentId, options = {}) {
    try {
      console.log(`🚀 Delivering missing channel links for user ${userId}, payment ${paymentId}`);

      // First verify current delivery status
      const verification = await this.verifyChannelLinkDelivery(userId, paymentId);
      
      if (!verification.success) {
        return verification;
      }

      if (verification.deliveryComplete) {
        return {
          success: true,
          message: 'All channel links already delivered',
          deliveryStatus: 'already_complete',
          links: verification.validLinks
        };
      }

      const { payment, channelBundle } = verification;

      // Update payment delivery status
      await PaymentLink.findByIdAndUpdate(paymentId, {
        link_delivered: false,
        delivery_status: 'in_progress',
        delivery_attempts: (payment.delivery_attempts || 0) + 1,
        last_delivery_attempt: new Date()
      });

      // Generate missing links
      console.log(`📦 Generating ${verification.missingLinks} missing channel links`);
      
      const linkGeneration = await generateInviteLinksForChannelBundle(
        userId,
        channelBundle._id,
        options.duration || payment.duration || 86400, // 24 hours default
        paymentId,
        payment.plan_id
      );

      if (linkGeneration.successCount > 0) {
        // Update payment as delivered
        await PaymentLink.findByIdAndUpdate(paymentId, {
          link_delivered: true,
          delivery_status: 'completed',
          delivered_at: new Date(),
          failure_reason: null
        });

        // Verify delivery again
        const finalVerification = await this.verifyChannelLinkDelivery(userId, paymentId);

        console.log(`✅ Successfully delivered ${linkGeneration.successCount} channel links`);
        
        return {
          success: true,
          message: `Successfully delivered ${linkGeneration.successCount} channel links`,
          deliveryStatus: 'completed',
          generatedLinks: linkGeneration.generatedLinks,
          verification: finalVerification,
          successCount: linkGeneration.successCount,
          errorCount: linkGeneration.errorCount
        };
      } else {
        // Update payment with failure reason
        await PaymentLink.findByIdAndUpdate(paymentId, {
          delivery_status: 'failed',
          failure_reason: `Link generation failed: ${linkGeneration.errors?.join(', ') || 'Unknown error'}`
        });

        return {
          success: false,
          message: 'Failed to generate channel links',
          deliveryStatus: 'failed',
          errors: linkGeneration.errors,
          errorCount: linkGeneration.errorCount
        };
      }

    } catch (error) {
      console.error('❌ Channel link delivery failed:', error);
      
      // Update payment with failure reason
      try {
        await PaymentLink.findByIdAndUpdate(paymentId, {
          delivery_status: 'failed',
          failure_reason: `Delivery error: ${error.message}`
        });
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
      }

      return {
        success: false,
        error: error.message,
        deliveryStatus: 'failed'
      };
    }
  }

  /**
   * Get all payments requiring link delivery verification
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of payments requiring attention
   */
  async getPaymentsRequiringVerification(filters = {}) {
    try {
      const query = {
        status: 'SUCCESS',
        $or: [
          { link_delivered: { $ne: true } },
          { delivery_status: { $in: ['pending', 'failed', 'in_progress'] } }
        ]
      };

      // Apply filters
      if (filters.adminId) {
        // Get groups belonging to this admin
        const adminGroups = await Group.find({ createdBy: filters.adminId });
        const adminGroupIds = adminGroups.map(group => group._id);
        query.groupId = { $in: adminGroupIds };
      }

      if (filters.dateFrom) {
        query.createdAt = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
      }

      const payments = await PaymentLink.find(query)
        .populate(['userid', 'groupId'])
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      console.log(`🔍 Found ${payments.length} payments requiring verification`);
      return payments;

    } catch (error) {
      console.error('❌ Failed to get payments requiring verification:', error);
      throw error;
    }
  }

  /**
   * Bulk verify and deliver channel links for multiple payments
   * @param {Array} paymentIds - Array of payment IDs to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Bulk processing result
   */
  async bulkVerifyAndDeliver(paymentIds, options = {}) {
    console.log(`🔄 Starting bulk verification and delivery for ${paymentIds.length} payments`);
    
    const results = {
      total: paymentIds.length,
      completed: 0,
      failed: 0,
      alreadyComplete: 0,
      details: []
    };

    for (const paymentId of paymentIds) {
      try {
        // Get payment and user details
        const payment = await PaymentLink.findById(paymentId).populate('userid');
        if (!payment || !payment.userid) {
          results.failed++;
          results.details.push({
            paymentId,
            status: 'failed',
            error: 'Payment or user not found'
          });
          continue;
        }

        const userId = payment.userid._id;
        
        // Attempt delivery
        const deliveryResult = await this.deliverMissingChannelLinks(userId, paymentId, options);
        
        if (deliveryResult.success) {
          if (deliveryResult.deliveryStatus === 'already_complete') {
            results.alreadyComplete++;
          } else {
            results.completed++;
          }
          results.details.push({
            paymentId,
            userId: userId,
            status: 'success',
            deliveryStatus: deliveryResult.deliveryStatus,
            successCount: deliveryResult.successCount || 0
          });
        } else {
          results.failed++;
          results.details.push({
            paymentId,
            userId: userId,
            status: 'failed',
            error: deliveryResult.error,
            deliveryStatus: deliveryResult.deliveryStatus
          });
        }

        // Add small delay to prevent overwhelming the system
        if (options.delay) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }

      } catch (error) {
        console.error(`❌ Bulk processing failed for payment ${paymentId}:`, error);
        results.failed++;
        results.details.push({
          paymentId,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk processing completed: ${results.completed} completed, ${results.failed} failed, ${results.alreadyComplete} already complete`);
    return results;
  }

  /**
   * Get delivery statistics for admin dashboard
   * @param {string} adminId - Admin ID (optional, for tenant filtering)
   * @returns {Promise<Object>} Delivery statistics
   */
  async getDeliveryStatistics(adminId = null) {
    try {
      let matchQuery = { status: 'SUCCESS' };
      
      if (adminId) {
        // Get groups belonging to this admin
        const adminGroups = await Group.find({ createdBy: adminId });
        const adminGroupIds = adminGroups.map(group => group._id);
        matchQuery.groupId = { $in: adminGroupIds };
      }

      const stats = await PaymentLink.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSuccessfulPayments: { $sum: 1 },
            deliveredPayments: {
              $sum: { $cond: [{ $eq: ['$link_delivered', true] }, 1, 0] }
            },
            failedDeliveries: {
              $sum: { $cond: [{ $eq: ['$delivery_status', 'failed'] }, 1, 0] }
            },
            pendingDeliveries: {
              $sum: { $cond: [{ $in: ['$delivery_status', ['pending', 'in_progress', null]] }, 1, 0] }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalSuccessfulPayments: 0,
        deliveredPayments: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0
      };

      result.deliveryRate = result.totalSuccessfulPayments > 0 
        ? ((result.deliveredPayments / result.totalSuccessfulPayments) * 100).toFixed(2)
        : '0.00';

      return result;

    } catch (error) {
      console.error('❌ Failed to get delivery statistics:', error);
      throw error;
    }
  }

  /**
   * Regenerate invite links for a specific channel bundle subscription
   * @param {string} userId - User ID
   * @param {string} groupId - Channel bundle ID
   * @param {Object} options - Regeneration options
   * @returns {Promise<Object>} Regeneration result
   */
  async regenerateChannelBundleLinks(userId, groupId, options = {}) {
    try {
      console.log(`🔄 Regenerating channel bundle links for user ${userId}, bundle ${groupId}`);

      // Find active payment for this user and channel bundle
      const activePayment = await PaymentLink.findOne({
        userid: userId,
        groupId: groupId,
        status: 'SUCCESS',
        expiry_date: { $gt: new Date() }
      });

      if (!activePayment) {
        return {
          success: false,
          error: 'No active subscription found for this channel bundle',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        };
      }

      // Expire existing unused links
      await InviteLink.updateMany(
        {
          userId: userId,
          groupId: groupId,
          is_used: false,
          expires_at: { $gt: new Date() }
        },
        {
          expires_at: new Date() // Expire immediately
        }
      );

      // Generate new links
      const result = await generateInviteLinksForChannelBundle(
        userId,
        groupId,
        options.duration || activePayment.duration || 86400,
        activePayment._id,
        activePayment.plan_id
      );

      if (result.successCount > 0) {
        // Update payment delivery status
        await PaymentLink.findByIdAndUpdate(activePayment._id, {
          link_delivered: true,
          delivery_status: 'completed',
          delivered_at: new Date()
        });

        return {
          success: true,
          message: `Successfully regenerated ${result.successCount} channel links`,
          generatedLinks: result.generatedLinks,
          successCount: result.successCount,
          errorCount: result.errorCount,
          channelBundle: result.channelBundle
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate new channel links',
          errors: result.errors,
          errorCount: result.errorCount
        };
      }

    } catch (error) {
      console.error('❌ Channel bundle link regeneration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ChannelLinkDeliveryService();