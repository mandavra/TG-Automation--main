const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const notificationService = require('./notificationService');
const axios = require('axios');

class PaymentRecoveryService {
  constructor() {
    this.retryAttempts = 5;
    this.retryDelay = 5000; // 5 seconds
    this.maxRetryDelay = 300000; // 5 minutes
    this.isProcessing = false;
  }

  // Find payments that succeeded but user didn't receive channel links
  async findFailedDeliveries() {
    try {
      const failedPayments = await PaymentLink.find({
        status: 'SUCCESS',
        $or: [
          { link_delivered: { $ne: true } },
          { link_delivered: { $exists: false } },
          { delivery_status: 'failed' },
          { 
            updatedAt: { 
              $lt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
            },
            link_delivered: { $ne: true }
          }
        ]
      })
      .populate('userid', 'telegramUserId firstName lastName phone')
      .populate('plan_id', 'planName channelList')
      .sort({ purchase_datetime: -1 });

      return failedPayments;
    } catch (error) {
      console.error('Error finding failed deliveries:', error);
      throw error;
    }
  }

  // Process failed payment deliveries with retry mechanism
  async processFailedDeliveries() {
    if (this.isProcessing) {
      console.log('Payment recovery already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting payment recovery process...');

    try {
      const failedPayments = await this.findFailedDeliveries();
      
      if (failedPayments.length === 0) {
        console.log('✅ No failed deliveries found');
        return { success: true, processed: 0 };
      }

      console.log(`📋 Found ${failedPayments.length} failed deliveries to process`);

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        details: []
      };

      for (const payment of failedPayments) {
        try {
          const result = await this.retryPaymentDelivery(payment);
          
          if (result.success) {
            results.success++;
            console.log(`✅ Successfully recovered payment ${payment._id}`);
          } else {
            results.failed++;
            console.log(`❌ Failed to recover payment ${payment._id}: ${result.error}`);
          }
          
          results.details.push({
            paymentId: payment._id,
            userId: payment.userid?._id,
            userName: `${payment.userid?.firstName} ${payment.userid?.lastName}`,
            planName: payment.plan_name,
            ...result
          });

          // Small delay between processing
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error processing payment ${payment._id}:`, error);
          results.failed++;
          results.details.push({
            paymentId: payment._id,
            success: false,
            error: error.message
          });
        }
      }

      // Notify admins about recovery results
      await this.notifyAdminsAboutRecovery(results);

      return results;
    } catch (error) {
      console.error('Error in payment recovery process:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Retry delivery for a specific payment with exponential backoff
  async retryPaymentDelivery(payment, attemptCount = 0) {
    const maxAttempts = this.retryAttempts;
    
    try {
      // Validate payment data
      if (!payment.userid?.telegramUserId) {
        console.log(`⚠️ Payment ${payment._id}: User ${payment.userid?._id} has no telegramUserId (phone: ${payment.userid?.phone}, name: ${payment.userid?.firstName} ${payment.userid?.lastName})`);
        
        // Mark payment as needing Telegram account linking
        await PaymentLink.findByIdAndUpdate(payment._id, {
          delivery_status: 'pending_telegram_link',
          failure_reason: 'User needs to connect Telegram account',
          telegram_link_required: true,
          last_delivery_attempt: new Date()
        });

        // Send notification to user if email is available
        if (payment.userid?.email) {
          await this.sendTelegramLinkNotification(payment.userid);
        }
        
        return {
          success: false,
          error: 'User telegram ID not found - user needs to connect Telegram account',
          skipped: true,
          needsTelegramLink: true
        };
      }

      if (!payment.plan_id?.channelList || payment.plan_id.channelList.length === 0) {
        return {
          success: false,
          error: 'No channels found in plan',
          skipped: true
        };
      }

      console.log(`🔄 Attempting delivery retry ${attemptCount + 1}/${maxAttempts} for payment ${payment._id}`);

      // Try to deliver the channel links
      const deliveryResult = await this.deliverChannelLinks(payment);
      
      if (deliveryResult.success) {
        // Mark as successfully delivered
        await PaymentLink.findByIdAndUpdate(payment._id, {
          link_delivered: true,
          delivery_status: 'success',
          delivery_attempts: (payment.delivery_attempts || 0) + 1,
          last_delivery_attempt: new Date(),
          recovery_completed: true
        });

        return {
          success: true,
          message: 'Channel links delivered successfully',
          attemptCount: attemptCount + 1
        };
      } else {
        // If delivery failed and we have attempts left, retry with exponential backoff
        if (attemptCount < maxAttempts - 1) {
          const delay = Math.min(this.retryDelay * Math.pow(2, attemptCount), this.maxRetryDelay);
          console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return await this.retryPaymentDelivery(payment, attemptCount + 1);
        } else {
          // Mark as failed after max attempts
          await PaymentLink.findByIdAndUpdate(payment._id, {
            delivery_status: 'failed',
            delivery_attempts: (payment.delivery_attempts || 0) + 1,
            last_delivery_attempt: new Date(),
            failure_reason: deliveryResult.error
          });

          return {
            success: false,
            error: deliveryResult.error,
            attemptCount: attemptCount + 1
          };
        }
      }
    } catch (error) {
      console.error(`Error in retry attempt ${attemptCount + 1}:`, error);
      
      if (attemptCount < maxAttempts - 1) {
        const delay = Math.min(this.retryDelay * Math.pow(2, attemptCount), this.maxRetryDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.retryPaymentDelivery(payment, attemptCount + 1);
      } else {
        await PaymentLink.findByIdAndUpdate(payment._id, {
          delivery_status: 'failed',
          delivery_attempts: (payment.delivery_attempts || 0) + 1,
          last_delivery_attempt: new Date(),
          failure_reason: error.message
        });

        return {
          success: false,
          error: error.message,
          attemptCount: attemptCount + 1
        };
      }
    }
  }

  // Deliver channel links to user
  async deliverChannelLinks(payment) {
    try {
      const { userid: user, plan_id: plan, plan_name } = payment;
      
      if (!user?.telegramUserId) {
        throw new Error(`User telegram ID not found - User: ${user?._id || 'null'}, Phone: ${user?.phone || 'none'}`);  
      }

      // Get channel links from the plan
      const channels = plan.channelList || [];
      if (channels.length === 0) {
        throw new Error('No channels found in plan');
      }

      // Format message with channel links
      const channelLinks = channels
        .filter(channel => channel.channelLink)
        .map((channel, index) => `${index + 1}. ${channel.channelLink}`)
        .join('\n');

      if (!channelLinks) {
        throw new Error('No valid channel links found');
      }

      const message = `🎉 *Payment Successful!*

Thank you for your purchase of *${plan_name}*!

Here are your exclusive channel links:

${channelLinks}

💡 *Important:*
• These links are exclusive to you
• Save them for future access
• Contact support if you face any issues

Thank you for choosing our service! 🚀`;

      // Send message via Telegram Bot API
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!telegramToken) {
        throw new Error('Telegram bot token not configured');
      }

      const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      
      const response = await axios.post(telegramApiUrl, {
        chat_id: user.telegramUserId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.ok) {
        console.log(`✅ Successfully sent channel links to user ${user.telegramUserId}`);
        return {
          success: true,
          messageId: response.data.result.message_id
        };
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error) {
      console.error('Error delivering channel links:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment recovery statistics
  async getRecoveryStats() {
    try {
      const stats = await PaymentLink.aggregate([
        {
          $match: {
            status: 'SUCCESS'
          }
        },
        {
          $group: {
            _id: null,
            totalSuccessfulPayments: { $sum: 1 },
            deliveredPayments: {
              $sum: {
                $cond: [{ $eq: ['$link_delivered', true] }, 1, 0]
              }
            },
            failedDeliveries: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $ne: ['$link_delivered', true] },
                      { $eq: ['$delivery_status', 'failed'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            recoveredPayments: {
              $sum: {
                $cond: [{ $eq: ['$recovery_completed', true] }, 1, 0]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalSuccessfulPayments: 0,
        deliveredPayments: 0,
        failedDeliveries: 0,
        recoveredPayments: 0
      };

      return {
        ...result,
        deliverySuccessRate: result.totalSuccessfulPayments > 0 
          ? ((result.deliveredPayments / result.totalSuccessfulPayments) * 100).toFixed(2)
          : 0,
        recoverySuccessRate: result.failedDeliveries > 0
          ? ((result.recoveredPayments / result.failedDeliveries) * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('Error getting recovery stats:', error);
      throw error;
    }
  }

  // Manually trigger recovery for specific payment
  async recoverSpecificPayment(paymentId) {
    try {
      const payment = await PaymentLink.findById(paymentId)
        .populate('userid', 'telegramUserId firstName lastName phone')
        .populate('plan_id', 'planName channelList');

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'SUCCESS') {
        throw new Error('Payment is not successful');
      }

      const result = await this.retryPaymentDelivery(payment);
      
      // Notify admin about manual recovery
      if (result.success) {
        await notificationService.sendNotificationToAdmins({
          title: 'Manual Payment Recovery Successful',
          message: `Payment ${paymentId} has been manually recovered and links delivered to user.`,
          type: 'payment_recovery',
          urgency: 'medium'
        });
      }

      return result;
    } catch (error) {
      console.error('Error in manual payment recovery:', error);
      throw error;
    }
  }

  // Notify admins about recovery results
  async notifyAdminsAboutRecovery(results) {
    try {
      if (results.failed > 0 || results.success > 0) {
        const message = `📊 Payment Recovery Report:

✅ Successfully recovered: ${results.success}
❌ Failed to recover: ${results.failed}
⏭️ Skipped: ${results.skipped}

${results.failed > 0 ? '⚠️ Manual intervention may be required for failed recoveries.' : ''}`;

        await notificationService.sendNotificationToAdmins({
          title: 'Payment Recovery Report',
          message,
          type: 'payment_recovery',
          urgency: results.failed > 0 ? 'high' : 'medium',
          data: results
        });
      }
    } catch (error) {
      console.error('Error notifying admins about recovery:', error);
    }
  }

  // Start automatic recovery process (to be called periodically)
  startAutoRecovery() {
    console.log('🚀 Starting automatic payment recovery service...');
    
    // Run immediately
    this.processFailedDeliveries().catch(error => {
      console.error('Error in initial payment recovery:', error);
    });

    // Then run every 5 minutes
    setInterval(async () => {
      try {
        await this.processFailedDeliveries();
      } catch (error) {
        console.error('Error in scheduled payment recovery:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Get detailed failed deliveries for admin dashboard
  async getFailedDeliveriesForAdmin() {
    try {
      const failedPayments = await PaymentLink.find({
        status: 'SUCCESS',
        $or: [
          { link_delivered: { $ne: true } },
          { delivery_status: 'failed' },
          { delivery_status: 'pending_telegram_link' }
        ]
      })
      .populate('userid', 'firstName lastName phone telegramUserId email')
      .populate('plan_id', 'planName')
      .sort({ purchase_datetime: -1 })
      .limit(100);

      return failedPayments.map(payment => ({
        _id: payment._id,
        user: {
          name: `${payment.userid?.firstName} ${payment.userid?.lastName}`,
          phone: payment.userid?.phone,
          email: payment.userid?.email,
          telegramId: payment.userid?.telegramUserId
        },
        planName: payment.plan_name,
        amount: payment.amount,
        paymentDate: payment.purchase_datetime,
        deliveryAttempts: payment.delivery_attempts || 0,
        lastAttempt: payment.last_delivery_attempt,
        failureReason: payment.failure_reason,
        deliveryStatus: payment.delivery_status,
        needsTelegramLink: payment.telegram_link_required || false
      }));
    } catch (error) {
      console.error('Error getting failed deliveries for admin:', error);
      throw error;
    }
  }

  // Send notification to user about linking Telegram account
  async sendTelegramLinkNotification(user) {
    try {
      // This would typically send an email or SMS to the user
      // For now, we'll just log and could integrate with notification service
      console.log(`📧 Should send Telegram link notification to user ${user.firstName} ${user.lastName} (${user.phone}) at ${user.email}`);
      
      // If you have an email service, you could send an email here:
      const linkingUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/link-telegram`;
      
      const emailContent = `
Dear ${user.firstName || 'User'},

Your recent purchase was successful, but we couldn't deliver your channel links because your Telegram account isn't linked to your account.

To receive your channel links, please link your Telegram account:
${linkingUrl}

Your Phone: ${user.phone}

If you have any questions, please contact our support team.

Best regards,
Support Team
      `;

      // You could integrate with your email service here
      // await emailService.send({
      //   to: user.email,
      //   subject: 'Link Your Telegram Account to Receive Channel Access',
      //   body: emailContent
      // });

      return true;
    } catch (error) {
      console.error('Error sending Telegram link notification:', error);
      return false;
    }
  }

  // Retry payments that were pending Telegram link after user links account
  async retryPendingTelegramLinkPayments(userId) {
    try {
      console.log(`🔄 Checking for pending payments for user ${userId}...`);
      
      // Find payments that were pending Telegram link for this user
      const pendingPayments = await PaymentLink.find({
        userid: userId,
        status: 'SUCCESS',
        delivery_status: 'pending_telegram_link',
        telegram_link_required: true
      })
      .populate('userid', 'telegramUserId firstName lastName phone')
      .populate('plan_id', 'planName channelList');

      if (pendingPayments.length === 0) {
        console.log(`✅ No pending payments found for user ${userId}`);
        return { success: true, processed: 0 };
      }

      console.log(`📋 Found ${pendingPayments.length} pending payments to retry for user ${userId}`);

      let successful = 0;
      let failed = 0;

      for (const payment of pendingPayments) {
        try {
          // Clear the telegram link requirement flags
          await PaymentLink.findByIdAndUpdate(payment._id, {
            $unset: { telegram_link_required: 1 },
            delivery_status: 'retrying'
          });

          const result = await this.retryPaymentDelivery(payment);
          if (result.success) {
            successful++;
            console.log(`✅ Successfully delivered payment ${payment._id} after Telegram linking`);
          } else {
            failed++;
            console.log(`❌ Failed to deliver payment ${payment._id} even after Telegram linking: ${result.error}`);
          }
        } catch (error) {
          failed++;
          console.error(`Error retrying payment ${payment._id}:`, error);
        }
      }

      console.log(`🎯 Telegram link retry results: ${successful} successful, ${failed} failed`);
      
      return {
        success: true,
        processed: pendingPayments.length,
        successful,
        failed
      };

    } catch (error) {
      console.error('Error retrying pending Telegram link payments:', error);
      throw error;
    }
  }
}

module.exports = new PaymentRecoveryService();