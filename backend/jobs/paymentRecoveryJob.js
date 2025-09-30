const cron = require('node-cron');
const paymentRecoveryService = require('../services/paymentRecoveryService');
const logger = require('../utils/logger');

class PaymentRecoveryJob {
  constructor() {
    this.job = null;
    this.isRunning = false;
    this.schedule = process.env.PAYMENT_RECOVERY_SCHEDULE || '*/15 * * * *'; // Every 15 minutes by default
  }

  async start() {
    if (this.job) {
      logger.info('Payment recovery job is already running');
      return;
    }

    logger.info(`Starting payment recovery job with schedule: ${this.schedule}`);
    
    this.job = cron.schedule(this.schedule, async () => {
      if (this.isRunning) {
        logger.info('Payment recovery job is already in progress, skipping...');
        return;
      }

      this.isRunning = true;
      const startTime = Date.now();
      
      try {
        logger.info('🔄 Starting payment recovery job...');
        const result = await paymentRecoveryService.processFailedDeliveries();
        
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`✅ Payment recovery job completed in ${duration.toFixed(2)}s`, {
          success: result.success,
          processed: result.processed,
          failed: result.failed
        });
      } catch (error) {
        logger.error('❌ Payment recovery job failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
  }

  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('Stopped payment recovery job');
    }
  }

  async runOnce() {
    if (this.isRunning) {
      throw new Error('Payment recovery job is already running');
    }

    this.isRunning = true;
    try {
      logger.info('🚀 Running payment recovery job once...');
      return await paymentRecoveryService.processFailedDeliveries();
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new PaymentRecoveryJob();
