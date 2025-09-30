const paymentRecoveryService = require('../services/paymentRecoveryService');

class PaymentRecoveryController {
  // Get recovery statistics
  async getRecoveryStats(req, res) {
    try {
      const stats = await paymentRecoveryService.getRecoveryStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting recovery stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get recovery statistics'
      });
    }
  }

  // Get failed deliveries for admin dashboard
  async getFailedDeliveries(req, res) {
    try {
      const failedDeliveries = await paymentRecoveryService.getFailedDeliveriesForAdmin();
      
      res.json({
        success: true,
        data: failedDeliveries
      });
    } catch (error) {
      console.error('Error getting failed deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get failed deliveries'
      });
    }
  }

  // Manually trigger recovery for all failed deliveries
  async processFailedDeliveries(req, res) {
    try {
      const result = await paymentRecoveryService.processFailedDeliveries();
      
      res.json({
        success: true,
        data: result,
        message: `Recovery completed - ${result.success} successful, ${result.failed} failed`
      });
    } catch (error) {
      console.error('Error processing failed deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process failed deliveries'
      });
    }
  }

  // Recover specific payment
  async recoverSpecificPayment(req, res) {
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await paymentRecoveryService.recoverSpecificPayment(paymentId);
      
      res.json({
        success: true,
        data: result,
        message: result.success ? 'Payment recovered successfully' : 'Payment recovery failed'
      });
    } catch (error) {
      console.error('Error recovering specific payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to recover payment'
      });
    }
  }

  // Find all failed deliveries (diagnostic endpoint)
  async findFailedDeliveries(req, res) {
    try {
      const failedPayments = await paymentRecoveryService.findFailedDeliveries();
      
      res.json({
        success: true,
        data: {
          count: failedPayments.length,
          payments: failedPayments.map(payment => ({
            _id: payment._id,
            user: {
              name: `${payment.userid?.firstName} ${payment.userid?.lastName}`,
              telegramId: payment.userid?.telegramId
            },
            planName: payment.plan_name,
            amount: payment.amount,
            paymentDate: payment.purchase_datetime,
            deliveredStatus: payment.link_delivered,
            deliveryStatus: payment.delivery_status,
            deliveryAttempts: payment.delivery_attempts || 0
          }))
        }
      });
    } catch (error) {
      console.error('Error finding failed deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to find failed deliveries'
      });
    }
  }

  // Test recovery system (for development/testing)
  async testRecoverySystem(req, res) {
    try {
      // This endpoint can be used to test the recovery system
      const stats = await paymentRecoveryService.getRecoveryStats();
      const failedDeliveries = await paymentRecoveryService.findFailedDeliveries();
      
      res.json({
        success: true,
        data: {
          recoveryStats: stats,
          failedDeliveriesCount: failedDeliveries.length,
          systemStatus: 'operational',
          lastCheck: new Date().toISOString()
        },
        message: 'Recovery system test completed'
      });
    } catch (error) {
      console.error('Error testing recovery system:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Recovery system test failed'
      });
    }
  }

  // Bulk recovery operations
  async bulkRecovery(req, res) {
    try {
      const { paymentIds } = req.body;
      
      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Payment IDs array is required'
        });
      }

      const results = {
        success: 0,
        failed: 0,
        details: []
      };

      for (const paymentId of paymentIds) {
        try {
          const result = await paymentRecoveryService.recoverSpecificPayment(paymentId);
          
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
          
          results.details.push({
            paymentId,
            ...result
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            paymentId,
            success: false,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: `Bulk recovery completed - ${results.success} successful, ${results.failed} failed`
      });
    } catch (error) {
      console.error('Error in bulk recovery:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Bulk recovery failed'
      });
    }
  }
}

module.exports = new PaymentRecoveryController();