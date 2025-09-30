const PaymentLink = require('../models/paymentLinkModel');
const paymentRecoveryService = require('../services/paymentRecoveryService');

// Middleware to automatically mark payment as delivered when webhook is successful
const markPaymentDelivered = async (req, res, next) => {
  try {
    // Store original res.json function
    const originalJson = res.json;
    
    // Override res.json to catch successful responses
    res.json = function(data) {
      // Check if this is a successful payment webhook response
      if (data && data.success && req.body && req.body.link_id) {
        // Mark payment as delivered in the background
        markAsDelivered(req.body.link_id).catch(error => {
          console.error('Error marking payment as delivered:', error);
        });
      }
      
      // Call the original json function
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in payment recovery middleware:', error);
    next();
  }
};

// Function to mark payment as successfully delivered
const markAsDelivered = async (linkId) => {
  try {
    await PaymentLink.findOneAndUpdate(
      { link_id: linkId, status: 'SUCCESS' },
      {
        link_delivered: true,
        delivery_status: 'success',
        delivery_attempts: 1,
        last_delivery_attempt: new Date()
      }
    );
    console.log(`✅ Payment ${linkId} marked as delivered`);
  } catch (error) {
    console.error(`Error marking payment ${linkId} as delivered:`, error);
  }
};

// Middleware to track payment webhook failures
const trackPaymentFailure = async (req, res, next) => {
  try {
    // Store original error handling
    const originalStatus = res.status;
    
    res.status = function(code) {
      // If this is an error status and we have payment data
      if (code >= 400 && req.body && req.body.link_id) {
        // Mark payment delivery as failed in the background
        markAsDeliveryFailed(req.body.link_id, code).catch(error => {
          console.error('Error marking payment delivery as failed:', error);
        });
      }
      
      return originalStatus.call(this, code);
    };
    
    next();
  } catch (error) {
    console.error('Error in payment failure tracking middleware:', error);
    next();
  }
};

// Function to mark payment delivery as failed
const markAsDeliveryFailed = async (linkId, statusCode) => {
  try {
    await PaymentLink.findOneAndUpdate(
      { link_id: linkId, status: 'SUCCESS' },
      {
        delivery_status: 'failed',
        $inc: { delivery_attempts: 1 },
        last_delivery_attempt: new Date(),
        failure_reason: `Webhook failed with status ${statusCode}`
      }
    );
    console.log(`❌ Payment ${linkId} marked as delivery failed (status: ${statusCode})`);
  } catch (error) {
    console.error(`Error marking payment ${linkId} as delivery failed:`, error);
  }
};

// Middleware to automatically trigger recovery for failed payments
const autoTriggerRecovery = async (req, res, next) => {
  try {
    // If this is a payment status update to SUCCESS
    if (req.body && req.body.status === 'SUCCESS' && req.body.link_id) {
      // Set a timeout to check delivery status after 2 minutes
      setTimeout(async () => {
        try {
          const payment = await PaymentLink.findOne({ 
            link_id: req.body.link_id,
            status: 'SUCCESS',
            link_delivered: { $ne: true }
          });
          
          if (payment) {
            console.log(`🔄 Auto-triggering recovery for payment ${req.body.link_id}`);
            await paymentRecoveryService.retryPaymentDelivery(payment);
          }
        } catch (error) {
          console.error('Error in auto recovery trigger:', error);
        }
      }, 2 * 60 * 1000); // 2 minutes
    }
    
    next();
  } catch (error) {
    console.error('Error in auto recovery trigger middleware:', error);
    next();
  }
};

module.exports = {
  markPaymentDelivered,
  trackPaymentFailure,
  autoTriggerRecovery
};