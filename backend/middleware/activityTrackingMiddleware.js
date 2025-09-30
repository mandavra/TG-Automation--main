const userActivityService = require('../services/userActivityService');

// Middleware to track user login
const trackUserLogin = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // If login was successful
    if (data && data.success && data.token && req.body.phone) {
      // Extract user ID from response or request
      const userId = data.user?._id || data.userId;
      if (userId) {
        userActivityService.logUserLogin(userId, req).catch(error => {
          console.error('Error logging user login:', error);
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track OTP activities
const trackOTPActivity = (req, res, next) => {
  const originalJson = res.json;
  const isOTPRequest = req.path.includes('/send-otp');
  const isOTPVerify = req.path.includes('/verify-otp');
  
  res.json = function(data) {
    if (data && req.body.phone) {
      if (isOTPRequest) {
        // Find user by phone to get userId
        const User = require('../models/user.model');
        User.findOne({ phone: req.body.phone }).then(user => {
          if (user) {
            userActivityService.logOTPRequested(user._id, req.body.phone, req).catch(error => {
              console.error('Error logging OTP request:', error);
            });
          }
        });
      } else if (isOTPVerify && data.success) {
        // Find user by phone to get userId
        const User = require('../models/user.model');
        User.findOne({ phone: req.body.phone }).then(user => {
          if (user) {
            userActivityService.logOTPVerified(user._id, req).catch(error => {
              console.error('Error logging OTP verification:', error);
            });
          }
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track payment activities
const trackPaymentActivity = (req, res, next) => {
  const originalJson = res.json;
  const isPaymentWebhook = req.path.includes('/payment/webhook');
  
  res.json = function(data) {
    if (isPaymentWebhook && req.body) {
      // Track payment status changes
      const PaymentLink = require('../models/paymentLinkModel');
      const linkId = req.body.link_id;
      
      if (linkId) {
        PaymentLink.findOne({ link_id: linkId }).populate('userid').then(payment => {
          if (payment && payment.userid) {
            const userId = payment.userid._id;
            
            if (req.body.status === 'SUCCESS') {
              userActivityService.logPaymentSuccess(userId, payment).catch(error => {
                console.error('Error logging payment success:', error);
              });
            } else if (req.body.status === 'FAILED') {
              userActivityService.logActivity({
                userId,
                activityType: 'payment_failed',
                activityTitle: 'Payment Failed',
                activityDescription: `Payment failed for ${payment.plan_name}`,
                currentStage: 'payment_process',
                status: 'failed',
                priority: 'high',
                activityData: {
                  paymentId: payment.link_id,
                  paymentAmount: payment.amount,
                  planName: payment.plan_name,
                  failureReason: req.body.failure_reason || 'Unknown'
                }
              }, req).catch(error => {
                console.error('Error logging payment failure:', error);
              });
            }
          }
        }).catch(error => {
          console.error('Error finding payment for activity tracking:', error);
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track KYC activities
const trackKYCActivity = (req, res, next) => {
  const originalJson = res.json;
  const isKYCSubmission = req.path.includes('/kyc/submit');
  const isKYCApproval = req.path.includes('/kyc/approve') || req.path.includes('/kyc/reject');
  
  res.json = function(data) {
    if (data && data.success) {
      if (isKYCSubmission && req.body.userId) {
        userActivityService.logKYCSubmitted(req.body.userId, {
          documentType: req.body.documentType,
          _id: data.kycId
        }, req).catch(error => {
          console.error('Error logging KYC submission:', error);
        });
      } else if (isKYCApproval && req.body.userId) {
        const isApproval = req.path.includes('/approve');
        const adminId = req.admin?._id;
        
        if (isApproval) {
          userActivityService.logKYCApproved(req.body.userId, {
            _id: req.params.kycId
          }, adminId).catch(error => {
            console.error('Error logging KYC approval:', error);
          });
        } else {
          userActivityService.logKYCRejected(req.body.userId, {
            _id: req.params.kycId
          }, req.body.reason, adminId).catch(error => {
            console.error('Error logging KYC rejection:', error);
          });
        }
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track E-Sign activities
const trackESignActivity = (req, res, next) => {
  const originalJson = res.json;
  const isESignInitiate = req.path.includes('/esign/initiate');
  const isESignComplete = req.path.includes('/esign/complete');
  
  res.json = function(data) {
    if (data && data.success && req.body.userId) {
      if (isESignInitiate) {
        userActivityService.logESignInitiated(req.body.userId, data.documentId, req).catch(error => {
          console.error('Error logging E-Sign initiation:', error);
        });
      } else if (isESignComplete) {
        userActivityService.logESignCompleted(req.body.userId, req.body.documentId, req).catch(error => {
          console.error('Error logging E-Sign completion:', error);
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track user registration
const trackUserRegistration = (req, res, next) => {
  const originalJson = res.json;
  const isRegistration = req.path.includes('/register') || req.path.includes('/signup');
  
  res.json = function(data) {
    if (isRegistration && data && data.success && data.user) {
      userActivityService.logUserRegistration(data.user._id, {
        phone: data.user.phone,
        firstName: data.user.firstName,
        lastName: data.user.lastName
      }, req).catch(error => {
        console.error('Error logging user registration:', error);
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to track admin actions
const trackAdminAction = (actionType) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && data.success && req.admin) {
        const userId = req.params.userId || req.body.userId;
        
        if (userId) {
          userActivityService.logAdminAction(
            userId,
            req.admin._id,
            actionType,
            `Admin ${actionType} action performed`,
            {
              adminName: `${req.admin.firstName} ${req.admin.lastName}`,
              actionData: req.body
            }
          ).catch(error => {
            console.error('Error logging admin action:', error);
          });
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Generic activity tracker for custom activities
const trackCustomActivity = (activityType, getActivityData) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && data.success) {
        try {
          const activityData = getActivityData(req, res, data);
          if (activityData) {
            userActivityService.logActivity(activityData, req).catch(error => {
              console.error(`Error logging ${activityType} activity:`, error);
            });
          }
        } catch (error) {
          console.error(`Error preparing ${activityType} activity data:`, error);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Error tracking middleware
const trackErrors = (err, req, res, next) => {
  // Log the error as user activity if we can identify the user
  const userId = req.user?._id || req.body?.userId || req.params?.userId;
  
  if (userId && err) {
    userActivityService.logError(userId, err.code || 'UNKNOWN_ERROR', err.message, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body
    }).catch(error => {
      console.error('Error logging error activity:', error);
    });
  }
  
  next(err);
};

module.exports = {
  trackUserLogin,
  trackOTPActivity,
  trackPaymentActivity,
  trackKYCActivity,
  trackESignActivity,
  trackUserRegistration,
  trackAdminAction,
  trackCustomActivity,
  trackErrors
};