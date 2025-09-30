const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const PaymentLink = require('../models/paymentLinkModel');

class RecoveryMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      lastRecoveryTime: null,
      recoveryDurations: [],
      errors: []
    };
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.on('recovery_started', (paymentId) => {
      this.metrics.totalRecoveryAttempts++;
      logger.info(`Recovery started for payment: ${paymentId}`);
    });

    this.on('recovery_success', (paymentId, duration) => {
      this.metrics.successfulRecoveries++;
      this.metrics.lastRecoveryTime = new Date();
      this.metrics.recoveryDurations.push(duration);
      
      // Keep only last 100 durations for average calculation
      if (this.metrics.recoveryDurations.length > 100) {
        this.metrics.recoveryDurations.shift();
      }
      
      logger.info(`Recovery successful for payment: ${paymentId} (${duration}ms)`);
    });

    this.on('recovery_failed', (paymentId, error) => {
      this.metrics.failedRecoveries++;
      this.metrics.errors.push({
        timestamp: new Date(),
        paymentId,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      // Keep only last 100 errors
      if (this.metrics.errors.length > 100) {
        this.metrics.errors.shift();
      }
      
      logger.error(`Recovery failed for payment: ${paymentId}`, { error });
    });
  }

  async getRecoveryMetrics() {
    // Get recovery stats from database
    const stats = await PaymentLink.aggregate([
      {
        $group: {
          _id: '$delivery_status',
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          totalAmount: { $sum: '$amount' },
          lastAttempt: { $max: '$last_delivery_attempt' },
          firstAttempt: { $min: '$purchase_datetime' }
        }
      }
    ]);

    // Calculate success rate
    const totalRecovered = this.metrics.successfulRecoveries;
    const totalAttempts = this.metrics.totalRecoveryAttempts;
    const successRate = totalAttempts > 0 ? (totalRecovered / totalAttempts) * 100 : 0;

    // Calculate average duration
    const avgDuration = this.metrics.recoveryDurations.length > 0
      ? this.metrics.recoveryDurations.reduce((a, b) => a + b, 0) / this.metrics.recoveryDurations.length
      : 0;

    return {
      ...this.metrics,
      stats,
      successRate: successRate.toFixed(2),
      averageRecoveryTime: avgDuration.toFixed(2),
      lastUpdated: new Date()
    };
  }

  async getFailedRecoveries(limit = 50) {
    return PaymentLink.find({
      $or: [
        { delivery_status: 'failed' },
        { link_delivered: false }
      ]
    })
    .sort({ last_delivery_attempt: -1 })
    .limit(limit)
    .populate('userid', 'firstName lastName email phone')
    .lean();
  }

  async getRecoveryTimeline(paymentId) {
    return PaymentLink.findById(paymentId)
      .select('purchase_datetime delivery_attempts last_delivery_attempt delivery_status')
      .lean();
  }

  async getErrorReport() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const errorStats = await PaymentLink.aggregate([
      {
        $match: {
          delivery_status: 'failed',
          last_delivery_attempt: { $gte: last24h }
        }
      },
      {
        $group: {
          _id: '$failure_reason',
          count: { $sum: 1 },
          lastOccurred: { $max: '$last_delivery_attempt' },
          paymentIds: { $push: '$_id' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return {
      period: '24h',
      totalErrors: errorStats.reduce((sum, stat) => sum + stat.count, 0),
      errorTypes: errorStats,
      timestamp: new Date()
    };
  }
}

module.exports = new RecoveryMonitoringService();
