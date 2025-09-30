const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const InviteLink = require('../models/InviteLink');
const nodemailer = require('nodemailer'); // For email notifications
const { differenceInDays, differenceInHours, format } = require('date-fns');

/**
 * Subscription Expiry Management Service
 * Handles subscription expiry notifications and management
 */
class SubscriptionExpiryService {

  constructor() {
    // Initialize email transporter if needed
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter for notifications
   */
  initializeEmailTransporter() {
    try {
      // Configure your email service here
      // This is a basic example - adjust according to your email provider
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } catch (error) {
      console.log('📧 Email transporter not configured:', error.message);
    }
  }

  /**
   * Get subscriptions expiring within specified days
   * @param {number} days - Days until expiry to check
   * @param {string} adminId - Admin ID for tenant filtering
   * @returns {Promise<Array>} Array of expiring subscriptions
   */
  async getSubscriptionsExpiringIn(days = 7, adminId = null) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      const query = {
        status: 'SUCCESS',
        expiry_date: {
          $gte: new Date(), // Not already expired
          $lte: targetDate  // Expires within target days
        }
      };

      // Add admin filtering if provided
      if (adminId) {
        const adminGroups = await Group.find({ createdBy: adminId });
        const adminGroupIds = adminGroups.map(group => group._id);
        query.groupId = { $in: adminGroupIds };
      }

      const subscriptions = await PaymentLink.find(query)
        .populate(['userid', 'groupId'])
        .sort({ expiry_date: 1 });

      // Add expiry details
      const subscriptionsWithDetails = subscriptions.map(subscription => {
        const daysUntilExpiry = differenceInDays(new Date(subscription.expiry_date), new Date());
        const hoursUntilExpiry = differenceInHours(new Date(subscription.expiry_date), new Date());
        
        return {
          ...subscription.toObject(),
          daysUntilExpiry,
          hoursUntilExpiry,
          expiryCategory: this.getExpiryCategory(daysUntilExpiry),
          urgencyLevel: this.getUrgencyLevel(daysUntilExpiry)
        };
      });

      return subscriptionsWithDetails;

    } catch (error) {
      console.error('❌ Error getting expiring subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get expiry category based on days until expiry
   * @param {number} days - Days until expiry
   * @returns {string} Category name
   */
  getExpiryCategory(days) {
    if (days <= 1) return 'expires_today';
    if (days <= 3) return 'expires_soon';
    if (days <= 7) return 'expires_this_week';
    if (days <= 30) return 'expires_this_month';
    return 'expires_later';
  }

  /**
   * Get urgency level based on days until expiry
   * @param {number} days - Days until expiry
   * @returns {string} Urgency level
   */
  getUrgencyLevel(days) {
    if (days <= 1) return 'critical';
    if (days <= 3) return 'high';
    if (days <= 7) return 'medium';
    return 'low';
  }

  /**
   * Send expiry notification to user
   * @param {Object} subscription - Subscription object
   * @param {string} notificationType - Type of notification
   * @returns {Promise<boolean>} Success status
   */
  async sendExpiryNotification(subscription, notificationType = 'reminder') {
    try {
      const user = subscription.userid;
      const channelBundle = subscription.groupId;
      
      if (!user || !channelBundle) {
        console.log('⚠️ Missing user or channel bundle data for notification');
        return false;
      }

      // Prepare notification content
      const notificationData = {
        user: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          email: user.email,
          phone: user.phone
        },
        subscription: {
          planName: subscription.plan_name,
          amount: subscription.amount,
          expiryDate: format(new Date(subscription.expiry_date), 'MMM dd, yyyy HH:mm'),
          daysLeft: subscription.daysUntilExpiry
        },
        channelBundle: {
          name: channelBundle.name,
          description: channelBundle.description,
          channelCount: channelBundle.channels?.length || 0
        },
        notificationType
      };

      // Send email notification if email is available and transporter is configured
      let emailSent = false;
      if (user.email && this.emailTransporter) {
        emailSent = await this.sendEmailNotification(notificationData);
      }

      // Log notification (you could also integrate with SMS service, push notifications, etc.)
      console.log(`📧 Expiry notification sent to ${user.phone} (${user.email || 'no email'}) - ${notificationType} - Email: ${emailSent ? 'sent' : 'not sent'}`);

      // Store notification record (optional - you might want to track sent notifications)
      // await this.storeNotificationRecord(subscription._id, notificationType, emailSent);

      return true;

    } catch (error) {
      console.error('❌ Error sending expiry notification:', error);
      return false;
    }
  }

  /**
   * Send email notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<boolean>} Success status
   */
  async sendEmailNotification(notificationData) {
    if (!this.emailTransporter || !notificationData.user.email) {
      return false;
    }

    try {
      const subject = this.getEmailSubject(notificationData.notificationType, notificationData.subscription.daysLeft);
      const htmlContent = this.generateEmailContent(notificationData);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"TG Automation" <noreply@tgautomation.com>',
        to: notificationData.user.email,
        subject,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      return false;
    }
  }

  /**
   * Get email subject based on notification type
   * @param {string} type - Notification type
   * @param {number} daysLeft - Days until expiry
   * @returns {string} Email subject
   */
  getEmailSubject(type, daysLeft) {
    switch (type) {
      case 'reminder':
        if (daysLeft <= 1) return '⚠️ Your Channel Access Expires Today!';
        if (daysLeft <= 3) return '⚠️ Your Channel Access Expires Soon';
        return `📅 Reminder: Your Channel Access Expires in ${daysLeft} Days`;
      case 'final_notice':
        return '🚨 Final Notice: Your Channel Access Expires Tomorrow!';
      case 'expired':
        return '❌ Your Channel Access Has Expired';
      case 'renewal_offer':
        return '🔄 Renew Your Channel Access - Special Offer!';
      default:
        return '📢 Channel Access Update';
    }
  }

  /**
   * Generate HTML email content
   * @param {Object} data - Notification data
   * @returns {string} HTML content
   */
  generateEmailContent(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f8f9fa; }
            .highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
            .footer { background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Channel Access Notification</h1>
                <p>Important update about your subscription</p>
            </div>
            
            <div class="content">
                <h2>Hello ${data.user.name},</h2>
                
                <div class="highlight">
                    <h3>📱 ${data.channelBundle.name}</h3>
                    <p><strong>Plan:</strong> ${data.subscription.planName}</p>
                    <p><strong>Expires:</strong> ${data.subscription.expiryDate}</p>
                    <p><strong>Days Left:</strong> ${data.subscription.daysLeft}</p>
                </div>
                
                ${data.notificationType === 'reminder' ? 
                  `<p>Your channel access will expire in <strong>${data.subscription.daysLeft} days</strong>. To continue enjoying premium content, please renew your subscription.</p>` :
                  data.notificationType === 'expired' ?
                  `<p>Your channel access has expired. You can renew your subscription to regain access to premium content.</p>` :
                  `<p>This is a ${data.notificationType.replace('_', ' ')} about your upcoming expiry.</p>`
                }
                
                <a href="http://localhost:4000/dashboard?phone=${encodeURIComponent(data.user.phone)}" class="button">
                    Renew Subscription
                </a>
                
                <p>If you have any questions, please contact our support team.</p>
            </div>
            
            <div class="footer">
                <p>&copy; 2024 TG Automation. All rights reserved.</p>
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Process expiry notifications for all qualifying subscriptions
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processExpiryNotifications(options = {}) {
    const {
      daysAhead = [7, 3, 1], // Days before expiry to send notifications
      adminId = null,
      batchSize = 50,
      delay = 1000 // Delay between notifications in ms
    } = options;

    console.log(`🔄 Starting expiry notification processing...`);

    const results = {
      processed: 0,
      notificationsSent: 0,
      errors: 0,
      details: []
    };

    try {
      for (const days of daysAhead) {
        console.log(`📅 Processing subscriptions expiring in ${days} days...`);
        
        const expiringSubscriptions = await this.getSubscriptionsExpiringIn(days, adminId);
        
        for (const subscription of expiringSubscriptions) {
          try {
            results.processed++;

            // Check if we should send notification based on days until expiry
            let notificationType = 'reminder';
            if (subscription.daysUntilExpiry <= 1) {
              notificationType = 'final_notice';
            }

            const notificationSent = await this.sendExpiryNotification(subscription, notificationType);
            
            if (notificationSent) {
              results.notificationsSent++;
            }

            results.details.push({
              subscriptionId: subscription._id,
              userId: subscription.userid._id,
              userPhone: subscription.userid.phone,
              planName: subscription.plan_name,
              daysUntilExpiry: subscription.daysUntilExpiry,
              notificationType,
              notificationSent,
              status: 'success'
            });

            // Add delay to prevent overwhelming email services
            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }

          } catch (error) {
            console.error(`❌ Error processing subscription ${subscription._id}:`, error);
            results.errors++;
            results.details.push({
              subscriptionId: subscription._id,
              error: error.message,
              status: 'error'
            });
          }

          // Process in batches to avoid memory issues
          if (results.processed % batchSize === 0) {
            console.log(`📊 Processed ${results.processed} subscriptions so far...`);
          }
        }
      }

      console.log(`✅ Expiry notification processing completed: ${results.processed} processed, ${results.notificationsSent} notifications sent, ${results.errors} errors`);
      return results;

    } catch (error) {
      console.error('❌ Error in expiry notification processing:', error);
      results.errors++;
      return results;
    }
  }

  /**
   * Get expiry statistics for admin dashboard
   * @param {string} adminId - Admin ID for filtering
   * @returns {Promise<Object>} Expiry statistics
   */
  async getExpiryStatistics(adminId = null) {
    try {
      let baseQuery = { status: 'SUCCESS' };
      
      if (adminId) {
        const adminGroups = await Group.find({ createdBy: adminId });
        const adminGroupIds = adminGroups.map(group => group._id);
        baseQuery.groupId = { $in: adminGroupIds };
      }

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [
        expiresToday,
        expiresTomorrow,
        expiresThisWeek,
        expiresThisMonth,
        totalActive,
        alreadyExpired
      ] = await Promise.all([
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $gte: now, $lt: tomorrow }
        }),
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) }
        }),
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $gte: now, $lt: nextWeek }
        }),
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $gte: now, $lt: nextMonth }
        }),
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $gte: now }
        }),
        PaymentLink.countDocuments({
          ...baseQuery,
          expiry_date: { $lt: now }
        })
      ]);

      return {
        expiresToday,
        expiresTomorrow,
        expiresThisWeek,
        expiresThisMonth,
        totalActive,
        alreadyExpired,
        renewalOpportunities: expiresToday + expiresTomorrow
      };

    } catch (error) {
      console.error('❌ Error getting expiry statistics:', error);
      throw error;
    }
  }

  /**
   * Automatically extend subscription (for special cases or admin override)
   * @param {string} subscriptionId - Subscription ID
   * @param {number} additionalDays - Days to add
   * @param {string} reason - Reason for extension
   * @returns {Promise<Object>} Extension result
   */
  async extendSubscription(subscriptionId, additionalDays, reason = 'Admin extension') {
    try {
      const subscription = await PaymentLink.findById(subscriptionId);
      
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found'
        };
      }

      const newExpiryDate = new Date(subscription.expiry_date);
      newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);

      await PaymentLink.findByIdAndUpdate(subscriptionId, {
        expiry_date: newExpiryDate,
        extension_reason: reason,
        extended_at: new Date(),
        extended_days: additionalDays
      });

      // Also extend associated invite links
      await InviteLink.updateMany(
        { paymentLinkId: subscriptionId },
        {
          expires_at: new Date(Date.now() + (additionalDays * 24 * 60 * 60 * 1000))
        }
      );

      console.log(`✅ Extended subscription ${subscriptionId} by ${additionalDays} days. New expiry: ${newExpiryDate}`);

      return {
        success: true,
        newExpiryDate,
        additionalDays,
        reason
      };

    } catch (error) {
      console.error('❌ Error extending subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove expired users from telegram channels
   * @param {string} adminId - Admin ID for tenant filtering
   * @param {boolean} dryRun - If true, only log what would be removed
   * @returns {Promise<Object>} Results of removal process
   */
  async removeExpiredUsersFromChannels(adminId = null, dryRun = false) {
    console.log(`🚫 Starting expired user removal process... (dry run: ${dryRun})`);
    
    const results = {
      processed: 0,
      removed: 0,
      errors: 0,
      details: []
    };

    try {
      const currentDate = new Date();
      
      // Find all expired subscriptions
      let query = {
        status: 'SUCCESS',
        expiry_date: { $lt: currentDate }
      };
      
      if (adminId) {
        query.adminId = adminId;
      }
      
      const expiredSubscriptions = await PaymentLink.find(query)
        .populate('userid')
        .populate('groupId')
        .sort({ expiry_date: 1 });
      
      console.log(`📊 Found ${expiredSubscriptions.length} expired subscriptions`);
      
      for (const subscription of expiredSubscriptions) {
        try {
          results.processed++;
          
          if (!subscription.userid || !subscription.groupId) {
            console.warn(`⚠️ Skipping subscription ${subscription._id} - missing user or group data`);
            continue;
          }
          
          const user = subscription.userid;
          const group = subscription.groupId;
          
          // Check if user still has any active subscriptions for this group
          const activeSubscription = await PaymentLink.findOne({
            userid: user._id,
            groupId: group._id,
            status: 'SUCCESS',
            expiry_date: { $gt: currentDate }
          });
          
          if (activeSubscription) {
            console.log(`✅ User ${user.phone} has active subscription for ${group.name}, skipping removal`);
            continue;
          }
          
          // Find associated invite links
          const inviteLinks = await InviteLink.find({
            userId: user._id,
            groupId: group._id
          });
          
          const removalData = {
            subscriptionId: subscription._id,
            userId: user._id,
            userPhone: user.phone,
            groupId: group._id,
            groupName: group.name,
            expiredOn: subscription.expiry_date,
            daysExpired: Math.floor((currentDate - new Date(subscription.expiry_date)) / (1000 * 60 * 60 * 24)),
            inviteLinksCount: inviteLinks.length
          };
          
          if (!dryRun) {
            // Mark invite links as expired
            await InviteLink.updateMany(
              {
                userId: user._id,
                groupId: group._id
              },
              {
                status: 'expired',
                expired_at: currentDate,
                expired_reason: 'subscription_expired'
              }
            );
            
            // Add removal reason to subscription
            await PaymentLink.findByIdAndUpdate(subscription._id, {
              removal_processed: true,
              removal_processed_at: currentDate,
              removal_reason: 'expired_subscription'
            });
            
            results.removed++;
          }
          
          results.details.push({
            ...removalData,
            action: dryRun ? 'would_remove' : 'removed',
            status: 'success'
          });
          
          console.log(`${dryRun ? '🔍 Would remove' : '🚫 Removed'} user ${user.phone} from ${group.name} (expired ${removalData.daysExpired} days ago)`);
          
        } catch (error) {
          console.error(`❌ Error processing expired subscription ${subscription._id}:`, error);
          results.errors++;
          
          results.details.push({
            subscriptionId: subscription._id,
            userId: subscription.userid?._id,
            userPhone: subscription.userid?.phone,
            error: error.message,
            status: 'error'
          });
        }
      }
      
      console.log(`✅ Expired user removal completed. Processed: ${results.processed}, ${dryRun ? 'Would remove' : 'Removed'}: ${results.removed}, Errors: ${results.errors}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error in expired user removal process:', error);
      throw error;
    }
  }

  /**
   * Check if a user should be removed from channels based on subscription status
   * @param {string} userPhone - User phone number
   * @param {string} groupId - Group/bundle ID
   * @returns {Promise<Object>} Removal status and details
   */
  async checkUserRemovalStatus(userPhone, groupId = null) {
    try {
      const user = await User.findOne({ phone: userPhone });
      if (!user) {
        return { shouldRemove: true, reason: 'user_not_found' };
      }
      
      let query = {
        userid: user._id,
        status: 'SUCCESS'
      };
      
      if (groupId) {
        query.groupId = groupId;
      }
      
      const currentDate = new Date();
      const activeSubscription = await PaymentLink.findOne({
        ...query,
        expiry_date: { $gt: currentDate }
      }).sort({ expiry_date: -1 });
      
      if (activeSubscription) {
        const daysRemaining = Math.ceil((new Date(activeSubscription.expiry_date) - currentDate) / (1000 * 60 * 60 * 24));
        return {
          shouldRemove: false,
          reason: 'active_subscription',
          subscription: activeSubscription,
          daysRemaining,
          expiryDate: activeSubscription.expiry_date
        };
      }
      
      // Check for any expired subscriptions
      const expiredSubscription = await PaymentLink.findOne({
        ...query,
        expiry_date: { $lt: currentDate }
      }).sort({ expiry_date: -1 });
      
      if (expiredSubscription) {
        const daysExpired = Math.floor((currentDate - new Date(expiredSubscription.expiry_date)) / (1000 * 60 * 60 * 24));
        return {
          shouldRemove: true,
          reason: 'subscription_expired',
          subscription: expiredSubscription,
          daysExpired,
          expiredOn: expiredSubscription.expiry_date
        };
      }
      
      return {
        shouldRemove: true,
        reason: 'no_subscription'
      };
      
    } catch (error) {
      console.error('Error checking user removal status:', error);
      return {
        shouldRemove: true,
        reason: 'error',
        error: error.message
      };
    }
  }

  /**
   * Schedule automatic expiry checks and removals
   * @param {Object} options - Scheduling options
   */
  async scheduleExpiryJob(options = {}) {
    const {
      intervalHours = 24,
      adminId = null,
      enableRemoval = true,
      dryRun = false
    } = options;
    
    console.log(`⏰ Scheduling expiry job to run every ${intervalHours} hours`);
    
    const runExpiryCheck = async () => {
      console.log('🔄 Running scheduled expiry check...');
      
      try {
        // Process expiry notifications
        await this.processExpiryNotifications({ adminId });
        
        // Remove expired users if enabled
        if (enableRemoval) {
          await this.removeExpiredUsersFromChannels(adminId, dryRun);
        }
        
        console.log('✅ Scheduled expiry check completed');
        
      } catch (error) {
        console.error('❌ Error in scheduled expiry check:', error);
      }
    };
    
    // Run immediately
    await runExpiryCheck();
    
    // Schedule recurring runs
    const intervalMs = intervalHours * 60 * 60 * 1000;
    setInterval(runExpiryCheck, intervalMs);
    
    return {
      message: `Expiry job scheduled to run every ${intervalHours} hours`,
      nextRun: new Date(Date.now() + intervalMs),
      options: { intervalHours, adminId, enableRemoval, dryRun }
    };
  }
}

module.exports = new SubscriptionExpiryService();