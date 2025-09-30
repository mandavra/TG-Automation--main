const cron = require('node-cron');
const { 
  sendWelcomeEmail, 
  sendTelegramJoiningLinkEmail, 
  sendRenewalReminderEmail, 
  sendSubscriptionExpiredEmail 
} = require('./emailService');
const User = require('../models/user.model');
const ChannelMember = require('../models/ChannelMember');

class SubscriptionEmailScheduler {
  constructor() {
    this.jobs = new Map();
    this.initializeCronJobs();
  }

  initializeCronJobs() {
    // Check for renewal reminders daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Running daily subscription reminder check...');
      this.checkAndSendRenewalReminders();
    });

    // Check for expired subscriptions daily at 10 AM
    cron.schedule('0 10 * * *', () => {
      console.log('Running daily subscription expiry check...');
      this.checkAndSendExpiryNotifications();
    });

    console.log('Subscription email scheduler initialized');
  }

  // Send welcome email immediately after successful subscription
  async sendWelcomeEmailOnSignup(userEmail, userDetails) {
    try {
      await sendWelcomeEmail(userEmail, userDetails);
      console.log(`Welcome email scheduled and sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  // Send Telegram link email separately after welcome
  async sendTelegramLinkEmail(userEmail, userDetails) {
    try {
      // Small delay to ensure welcome email is processed first
      setTimeout(async () => {
        await sendTelegramJoiningLinkEmail(userEmail, userDetails);
        console.log(`Telegram link email sent to ${userEmail}`);
      }, 2000);
    } catch (error) {
      console.error('Error sending Telegram link email:', error);
    }
  }

  // Check and send renewal reminders for 3, 2, 1 days before expiry and expiry day
  async checkAndSendRenewalReminders() {
    try {
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
      const twoDaysFromNow = new Date(today.getTime() + (2 * 24 * 60 * 60 * 1000));
      const oneDayFromNow = new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000));
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Find channel members expiring in 3, 2, 1 days and today
      const membersNeedingReminders = await ChannelMember.aggregate([
        {
          $match: {
            isActive: true,
            $or: [
              { 
                expiresAt: { 
                  $gte: new Date(threeDaysFromNow.getFullYear(), threeDaysFromNow.getMonth(), threeDaysFromNow.getDate()),
                  $lt: new Date(threeDaysFromNow.getFullYear(), threeDaysFromNow.getMonth(), threeDaysFromNow.getDate(), 23, 59, 59)
                }
              },
              { 
                expiresAt: { 
                  $gte: new Date(twoDaysFromNow.getFullYear(), twoDaysFromNow.getMonth(), twoDaysFromNow.getDate()),
                  $lt: new Date(twoDaysFromNow.getFullYear(), twoDaysFromNow.getMonth(), twoDaysFromNow.getDate(), 23, 59, 59)
                }
              },
              { 
                expiresAt: { 
                  $gte: new Date(oneDayFromNow.getFullYear(), oneDayFromNow.getMonth(), oneDayFromNow.getDate()),
                  $lt: new Date(oneDayFromNow.getFullYear(), oneDayFromNow.getMonth(), oneDayFromNow.getDate(), 23, 59, 59)
                }
              },
              { 
                expiresAt: { 
                  $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                  $lt: todayEnd
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'telegramUserId',
            foreignField: 'telegramUserId',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $match: {
            'userDetails.email': { $exists: true, $ne: null }
          }
        }
      ]);

      for (const member of membersNeedingReminders) {
        const daysUntilExpiry = Math.ceil((member.expiresAt - today) / (24 * 60 * 60 * 1000));
        const user = member.userDetails;
        
        // Check if reminder already sent
        const reminderKey = `${daysUntilExpiry}DayReminder`;
        if (daysUntilExpiry === 0) reminderKey = 'expiryDayReminder';
        
        if (user.emailNotifications && user.emailNotifications[reminderKey]) {
          continue; // Skip if already sent
        }

        const userDetails = {
          firstName: user.firstName || user.userInfo?.firstName || 'Valued Customer',
          planName: member.channelInfo?.bundleName || 'Premium Plan',
          expiryDate: member.expiresAt.toLocaleDateString(),
          renewalLink: `${process.env.FRONTEND_URL}/renew/${user._id}`
        };

        try {
          await sendRenewalReminderEmail(user.email, userDetails, daysUntilExpiry);
          
          // Mark reminder as sent
          const updateKey = `emailNotifications.${reminderKey}`;
          await User.findByIdAndUpdate(user._id, {
            $set: { [updateKey]: true }
          });

          console.log(`Renewal reminder sent to ${user.email} (${daysUntilExpiry} days)`);
        } catch (error) {
          console.error(`Error sending reminder to ${user.email}:`, error);
        }
      }

      console.log(`Processed ${membersNeedingReminders.length} renewal reminders`);
    } catch (error) {
      console.error('Error in renewal reminder check:', error);
    }
  }

  // Check and send expiry notifications for expired subscriptions
  async checkAndSendExpiryNotifications() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Find channel members who expired yesterday (grace period of 1 day)
      const expiredMembers = await ChannelMember.aggregate([
        {
          $match: {
            expiresAt: { $lt: startOfToday },
            isActive: true // Still marked as active but expired
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'telegramUserId',
            foreignField: 'telegramUserId',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $match: {
            'userDetails.email': { $exists: true, $ne: null },
            'userDetails.emailNotifications.expiredNotification': { $ne: true }
          }
        }
      ]);

      for (const member of expiredMembers) {
        const user = member.userDetails;
        const userDetails = {
          firstName: user.firstName || user.userInfo?.firstName || 'Valued Customer',
          planName: member.channelInfo?.bundleName || 'Premium Plan',
          expiryDate: member.expiresAt.toLocaleDateString(),
          renewalLink: `${process.env.FRONTEND_URL}/renew/${user._id}`
        };

        try {
          await sendSubscriptionExpiredEmail(user.email, userDetails);
          
          // Mark expiry notification as sent
          await User.findByIdAndUpdate(user._id, {
            $set: { 'emailNotifications.expiredNotification': true }
          });
          
          console.log(`Expiry notification sent to ${user.email}`);
        } catch (error) {
          console.error(`Error sending expiry notification to ${user.email}:`, error);
        }
      }

      console.log(`Processed ${expiredMembers.length} expiry notifications`);
    } catch (error) {
      console.error('Error in expiry notification check:', error);
    }
  }

  // Manually trigger welcome sequence for a new user
  async triggerWelcomeSequence(userEmail, userDetails) {
    try {
      console.log(`Triggering welcome sequence for ${userEmail}`);
      
      // Send welcome email immediately
      await this.sendWelcomeEmailOnSignup(userEmail, userDetails);
      
      // Send Telegram link email with slight delay
      await this.sendTelegramLinkEmail(userEmail, userDetails);
      
      console.log(`Welcome sequence completed for ${userEmail}`);
    } catch (error) {
      console.error(`Error in welcome sequence for ${userEmail}:`, error);
    }
  }

  // Reset email notifications for a user (useful for renewals)
  async resetEmailNotifications(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $unset: { 
          'emailNotifications.3DayReminder': '',
          'emailNotifications.2DayReminder': '',
          'emailNotifications.1DayReminder': '',
          'emailNotifications.expiryDayReminder': '',
          'emailNotifications.expiredNotification': ''
        }
      });
      console.log(`Email notifications reset for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting email notifications for user ${userId}:`, error);
    }
  }

  // Get email status for a user
  async getEmailStatus(userId) {
    try {
      const user = await User.findById(userId).select('emailNotifications expiryDate');
      if (!user) return null;

      const today = new Date();
      const daysUntilExpiry = Math.ceil((user.expiryDate - today) / (24 * 60 * 60 * 1000));

      return {
        daysUntilExpiry,
        emailNotifications: user.emailNotifications || {},
        expiryDate: user.expiryDate
      };
    } catch (error) {
      console.error(`Error getting email status for user ${userId}:`, error);
      return null;
    }
  }
}

// Create singleton instance
const emailScheduler = new SubscriptionEmailScheduler();

module.exports = emailScheduler;