const emailScheduler = require('./subscriptionEmailScheduler');
const User = require('../models/user.model');
const ChannelMember = require('../models/ChannelMember');

class EmailIntegrationService {
  
  // Call this when user completes all steps (payment + document signing)
  async handleUserSubscriptionComplete(userId, subscriptionDetails = {}) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        console.log(`No email found for user ${userId}, skipping email notifications`);
        return;
      }

      const userDetails = {
        firstName: user.firstName || 'Valued Customer',
        planName: subscriptionDetails.planName || 'Premium Plan',
        documentId: subscriptionDetails.documentId || `DOC_${Date.now()}`,
        inviteLink: subscriptionDetails.inviteLink || '#'
      };

      // Trigger welcome email sequence
      await emailScheduler.triggerWelcomeSequence(user.email, userDetails);

      // Mark welcome emails as sent
      await User.findByIdAndUpdate(userId, {
        $set: {
          'emailNotifications.welcomeSent': true,
          'emailNotifications.telegramLinkSent': true
        }
      });

      console.log(`Subscription complete email sequence triggered for user ${userId}`);
    } catch (error) {
      console.error(`Error handling subscription completion for user ${userId}:`, error);
    }
  }

  // Call this when a user renews their subscription
  async handleSubscriptionRenewal(userId) {
    try {
      // Reset email notification flags for the renewal period
      await emailScheduler.resetEmailNotifications(userId);
      console.log(`Email notifications reset for renewed user ${userId}`);
    } catch (error) {
      console.error(`Error handling subscription renewal for user ${userId}:`, error);
    }
  }

  // Manual trigger for welcome email only
  async sendWelcomeEmailOnly(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        throw new Error('User not found or no email available');
      }

      const userDetails = {
        firstName: user.firstName || 'Valued Customer'
      };

      await emailScheduler.sendWelcomeEmailOnSignup(user.email, userDetails);
      
      await User.findByIdAndUpdate(userId, {
        $set: { 'emailNotifications.welcomeSent': true }
      });

      console.log(`Welcome email sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending welcome email to user ${userId}:`, error);
      throw error;
    }
  }

  // Manual trigger for Telegram link email only
  async sendTelegramLinkEmailOnly(userId, inviteLink) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        throw new Error('User not found or no email available');
      }

      const userDetails = {
        firstName: user.firstName || 'Valued Customer',
        inviteLink: inviteLink || '#'
      };

      await emailScheduler.sendTelegramLinkEmail(user.email, userDetails);
      
      await User.findByIdAndUpdate(userId, {
        $set: { 'emailNotifications.telegramLinkSent': true }
      });

      console.log(`Telegram link email sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending Telegram link email to user ${userId}:`, error);
      throw error;
    }
  }

  // Get email status for admin panel
  async getUserEmailStatus(userId) {
    try {
      const user = await User.findById(userId).select('emailNotifications email firstName');
      if (!user) return null;

      // Get subscription details from ChannelMember
      const memberDetails = await ChannelMember.findOne({ 
        telegramUserId: user.telegramUserId,
        isActive: true 
      }).sort({ expiresAt: -1 }); // Get latest membership

      const emailStatus = await emailScheduler.getEmailStatus(userId);

      return {
        email: user.email,
        firstName: user.firstName,
        hasEmail: !!user.email,
        emailNotifications: user.emailNotifications || {},
        subscription: memberDetails ? {
          expiresAt: memberDetails.expiresAt,
          isActive: memberDetails.isActive,
          channelInfo: memberDetails.channelInfo,
          daysUntilExpiry: emailStatus?.daysUntilExpiry
        } : null
      };
    } catch (error) {
      console.error(`Error getting email status for user ${userId}:`, error);
      return null;
    }
  }

  // Bulk operation to send reminders manually (for admin use)
  async triggerBulkReminderCheck() {
    try {
      console.log('Manually triggering bulk reminder check...');
      await emailScheduler.checkAndSendRenewalReminders();
      await emailScheduler.checkAndSendExpiryNotifications();
      console.log('Bulk reminder check completed');
    } catch (error) {
      console.error('Error in bulk reminder check:', error);
      throw error;
    }
  }

  // Get statistics for admin dashboard
  async getEmailStatistics() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            usersWithEmail: { 
              $sum: { 
                $cond: [{ $ne: ['$email', null] }, 1, 0] 
              }
            },
            welcomeEmailsSent: { 
              $sum: { 
                $cond: ['$emailNotifications.welcomeSent', 1, 0] 
              }
            },
            telegramLinkEmailsSent: { 
              $sum: { 
                $cond: ['$emailNotifications.telegramLinkSent', 1, 0] 
              }
            },
            remindersSent: {
              $sum: {
                $add: [
                  { $cond: ['$emailNotifications.3DayReminder', 1, 0] },
                  { $cond: ['$emailNotifications.2DayReminder', 1, 0] },
                  { $cond: ['$emailNotifications.1DayReminder', 1, 0] },
                  { $cond: ['$emailNotifications.expiryDayReminder', 1, 0] }
                ]
              }
            },
            expiredNotificationsSent: { 
              $sum: { 
                $cond: ['$emailNotifications.expiredNotification', 1, 0] 
              }
            }
          }
        }
      ]);

      return stats[0] || {
        totalUsers: 0,
        usersWithEmail: 0,
        welcomeEmailsSent: 0,
        telegramLinkEmailsSent: 0,
        remindersSent: 0,
        expiredNotificationsSent: 0
      };
    } catch (error) {
      console.error('Error getting email statistics:', error);
      return null;
    }
  }

  // Check and fix any missing email notifications for existing users
  async auditEmailNotifications() {
    try {
      console.log('Starting email notification audit...');
      
      // Find users without email notification structure
      const usersNeedingUpdate = await User.find({
        emailNotifications: { $exists: false }
      });

      for (const user of usersNeedingUpdate) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            emailNotifications: {
              welcomeSent: false,
              telegramLinkSent: false,
              '3DayReminder': false,
              '2DayReminder': false,
              '1DayReminder': false,
              'expiryDayReminder': false,
              'expiredNotification': false
            }
          }
        });
      }

      console.log(`Updated email notification structure for ${usersNeedingUpdate.length} users`);
    } catch (error) {
      console.error('Error in email notification audit:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailIntegrationService = new EmailIntegrationService();

module.exports = emailIntegrationService;