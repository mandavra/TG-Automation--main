const PaymentLink = require('../models/paymentLinkModel');
const cron = require('node-cron');

class PaymentCleanupService {
  constructor() {
    this.cleanupIntervalMinutes = 30; // Auto-expire payments older than 30 minutes
    this.cronJob = null;
    this.isRunning = false;
    this.stats = {
      totalCleanups: 0,
      totalExpired: 0,
      lastCleanup: null,
      errors: []
    };
  }

  /**
   * Start the automatic cleanup service
   * Runs every 15 minutes to check for stale payments
   */
  startAutoCleanup() {
    if (this.isRunning) {
      console.log('⚠️ Payment cleanup service is already running');
      return;
    }

    console.log('🧹 Starting payment cleanup service...');
    
    // Run every 15 minutes: "*/15 * * * *"
    // For testing, you can use "*/2 * * * *" (every 2 minutes)
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.performCleanup();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust timezone as needed
    });

    this.isRunning = true;
    console.log('✅ Payment cleanup service started - running every 15 minutes');

    // Perform initial cleanup after 30 seconds
    setTimeout(async () => {
      await this.performCleanup('initial');
    }, 30000);
  }

  /**
   * Stop the automatic cleanup service
   */
  stopAutoCleanup() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 Payment cleanup service stopped');
    }
  }

  /**
   * Perform cleanup of stale pending payments
   * @param {string} type - Type of cleanup (scheduled, manual, initial)
   */
  async performCleanup(type = 'scheduled') {
    try {
      const startTime = Date.now();
      console.log(`🧹 Starting ${type} payment cleanup...`);

      const currentTime = new Date();
      const cutoffTime = new Date(currentTime - this.cleanupIntervalMinutes * 60 * 1000);

      // Find stale pending payments
      const stalePayments = await PaymentLink.find({
        status: 'PENDING',
        createdAt: { $lt: cutoffTime }
      });

      if (stalePayments.length === 0) {
        console.log('✅ No stale payments found');
        this.stats.lastCleanup = currentTime;
        return { expiredCount: 0, message: 'No stale payments found' };
      }

      console.log(`🔍 Found ${stalePayments.length} stale pending payments`);

      // Group by phone for better logging
      const paymentsByPhone = {};
      stalePayments.forEach(payment => {
        const phone = payment.phone;
        if (!paymentsByPhone[phone]) {
          paymentsByPhone[phone] = [];
        }
        paymentsByPhone[phone].push({
          id: payment._id,
          planName: payment.plan_name,
          amount: payment.amount,
          age: Math.floor((currentTime - payment.createdAt) / (60 * 1000))
        });
      });

      // Log details for monitoring
      Object.entries(paymentsByPhone).forEach(([phone, payments]) => {
        console.log(`📱 ${phone}: ${payments.length} stale payments`, 
          payments.map(p => `${p.planName}(₹${p.amount}, ${p.age}min old)`).join(', '));
      });

      // Update stale payments to EXPIRED
      const result = await PaymentLink.updateMany(
        {
          status: 'PENDING',
          createdAt: { $lt: cutoffTime }
        },
        {
          status: 'EXPIRED',
          statusReason: `Auto-expired after ${this.cleanupIntervalMinutes} minutes of inactivity`,
          expiredAt: currentTime,
          cleanupType: type
        }
      );

      const duration = Date.now() - startTime;
      
      // Update stats
      this.stats.totalCleanups++;
      this.stats.totalExpired += result.modifiedCount;
      this.stats.lastCleanup = currentTime;

      console.log(`✅ Cleanup completed in ${duration}ms:`);
      console.log(`   - Expired: ${result.modifiedCount} payments`);
      console.log(`   - Affected users: ${Object.keys(paymentsByPhone).length}`);
      console.log(`   - Total cleanups: ${this.stats.totalCleanups}`);
      console.log(`   - Total expired: ${this.stats.totalExpired}`);

      // Send notification to admins about significant cleanups
      if (result.modifiedCount > 10) {
        await this.notifyAdminsAboutCleanup({
          expiredCount: result.modifiedCount,
          affectedUsers: Object.keys(paymentsByPhone).length,
          type: type,
          duration: duration
        });
      }

      return {
        expiredCount: result.modifiedCount,
        affectedUsers: Object.keys(paymentsByPhone).length,
        duration: duration,
        message: `Successfully expired ${result.modifiedCount} stale payments`
      };

    } catch (error) {
      console.error('❌ Payment cleanup error:', error);
      this.stats.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: type
      });
      
      // Keep only last 10 errors
      if (this.stats.errors.length > 10) {
        this.stats.errors = this.stats.errors.slice(-10);
      }

      throw error;
    }
  }

  /**
   * Cleanup stale payments for a specific user
   * @param {string} phone - User's phone number
   */
  async cleanupForUser(phone) {
    try {
      console.log(`🧹 Starting targeted cleanup for phone: ${phone}`);

      const currentTime = new Date();
      const cutoffTime = new Date(currentTime - this.cleanupIntervalMinutes * 60 * 1000);

      const result = await PaymentLink.updateMany(
        {
          phone: phone,
          status: 'PENDING',
          createdAt: { $lt: cutoffTime }
        },
        {
          status: 'EXPIRED',
          statusReason: 'Auto-expired during targeted cleanup',
          expiredAt: currentTime,
          cleanupType: 'targeted'
        }
      );

      console.log(`✅ Targeted cleanup for ${phone}: ${result.modifiedCount} payments expired`);

      return {
        expiredCount: result.modifiedCount,
        message: `Expired ${result.modifiedCount} stale payments for user`
      };

    } catch (error) {
      console.error(`❌ Targeted cleanup error for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed statistics about cleanup operations
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      cleanupIntervalMinutes: this.cleanupIntervalMinutes,
      nextScheduledCleanup: this.isRunning ? 'Every 15 minutes' : 'Not scheduled'
    };
  }

  /**
   * Get current pending payments summary
   */
  async getPendingPaymentsSummary() {
    try {
      const currentTime = new Date();
      const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);

      const [total, stale, byStatus] = await Promise.all([
        PaymentLink.countDocuments({ status: 'PENDING' }),
        PaymentLink.countDocuments({ 
          status: 'PENDING', 
          createdAt: { $lt: thirtyMinutesAgo } 
        }),
        PaymentLink.aggregate([
          { $match: { status: 'PENDING' } },
          { 
            $group: {
              _id: {
                $cond: [
                  { $lt: ['$createdAt', thirtyMinutesAgo] },
                  'stale',
                  'active'
                ]
              },
              count: { $sum: 1 },
              oldestPayment: { $min: '$createdAt' },
              newestPayment: { $max: '$createdAt' }
            }
          }
        ])
      ]);

      const summary = {
        total,
        stale,
        active: total - stale,
        details: byStatus.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            oldestPayment: item.oldestPayment,
            newestPayment: item.newestPayment,
            ageRange: item._id === 'stale' ? 
              `${Math.floor((currentTime - item.newestPayment) / (60 * 1000))} - ${Math.floor((currentTime - item.oldestPayment) / (60 * 1000))} minutes` :
              `0 - ${Math.floor((currentTime - item.oldestPayment) / (60 * 1000))} minutes`
          };
          return acc;
        }, {})
      };

      return summary;
    } catch (error) {
      console.error('❌ Error getting pending payments summary:', error);
      throw error;
    }
  }

  /**
   * Force cleanup all stale payments (manual trigger)
   */
  async forceCleanup() {
    return await this.performCleanup('manual_force');
  }

  /**
   * Notify admins about significant cleanup operations
   * @param {Object} cleanupInfo - Information about the cleanup
   */
  async notifyAdminsAboutCleanup(cleanupInfo) {
    try {
      const notificationService = require('./notificationService');
      await notificationService.sendNotificationToAdmins({
        title: 'Large Payment Cleanup Completed',
        message: `Payment cleanup expired ${cleanupInfo.expiredCount} stale payments affecting ${cleanupInfo.affectedUsers} users (${cleanupInfo.type} cleanup completed in ${cleanupInfo.duration}ms)`,
        type: 'payment_cleanup',
        urgency: cleanupInfo.expiredCount > 50 ? 'high' : 'medium',
        metadata: cleanupInfo
      });
    } catch (error) {
      console.error('❌ Failed to notify admins about cleanup:', error);
      // Don't throw - notification failure shouldn't stop cleanup
    }
  }

  /**
   * Health check for the cleanup service
   */
  healthCheck() {
    const lastCleanup = this.stats.lastCleanup;
    const timeSinceLastCleanup = lastCleanup ? Date.now() - lastCleanup.getTime() : null;
    const isHealthy = this.isRunning && (!lastCleanup || timeSinceLastCleanup < 20 * 60 * 1000); // Healthy if last cleanup was within 20 minutes

    return {
      isRunning: this.isRunning,
      isHealthy,
      lastCleanup,
      timeSinceLastCleanupMinutes: timeSinceLastCleanup ? Math.floor(timeSinceLastCleanup / (60 * 1000)) : null,
      recentErrors: this.stats.errors.slice(-3), // Last 3 errors
      stats: this.getStats()
    };
  }
}

// Create singleton instance
const paymentCleanupService = new PaymentCleanupService();

module.exports = paymentCleanupService;