const UserActivity = require('../models/userActivity.model');
const User = require('../models/user.model');
const geoip = require('geoip-lite');

class UserActivityService {
  constructor() {
    this.activityQueue = [];
    this.isProcessing = false;
    this.startBatchProcessor();
  }

  // Log user activity with comprehensive data
  async logActivity(activityData, req = null) {
    try {
      // Extract request information if available
      const requestInfo = this.extractRequestInfo(req);
      
      // Prepare activity record
      const activity = {
        ...activityData,
        ...requestInfo,
        timestamp: new Date(),
        isSystemGenerated: !req, // If no request, it's system generated
        sessionId: req?.sessionID || this.generateSessionId()
      };

      // Add to queue for batch processing
      this.activityQueue.push(activity);
      
      // Process immediately for critical activities
      if (this.isCriticalActivity(activity.activityType)) {
        return await this.processActivity(activity);
      }

      return true;
    } catch (error) {
      console.error('Error logging user activity:', error);
      throw error;
    }
  }

  // Extract request information for activity logging
  extractRequestInfo(req) {
    if (!req) return {};

    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection?.remoteAddress || '';
    
    // Get geographic location from IP
    const geo = geoip.lookup(ipAddress);
    
    return {
      activityData: {
        ipAddress,
        userAgent,
        deviceType: this.detectDeviceType(userAgent),
        platform: this.detectPlatform(userAgent),
        browserInfo: this.extractBrowserInfo(userAgent)
      },
      location: geo ? {
        country: geo.country,
        state: geo.region,
        city: geo.city,
        coordinates: {
          lat: geo.ll[0],
          lng: geo.ll[1]
        }
      } : null
    };
  }

  // Detect device type from user agent
  detectDeviceType(userAgent) {
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  // Detect platform from user agent
  detectPlatform(userAgent) {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  // Extract browser information
  extractBrowserInfo(userAgent) {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  // Check if activity is critical and needs immediate processing
  isCriticalActivity(activityType) {
    const criticalActivities = [
      'payment_success',
      'payment_failed',
      'kyc_approved',
      'kyc_rejected',
      'esign_completed',
      'esign_failed',
      'channel_links_failed',
      'error_occurred'
    ];
    
    return criticalActivities.includes(activityType);
  }

  // Process individual activity
  async processActivity(activity) {
    try {
      return await UserActivity.logActivity(activity);
    } catch (error) {
      console.error('Error processing activity:', error);
      throw error;
    }
  }

  // Batch processor for non-critical activities
  startBatchProcessor() {
    setInterval(async () => {
      if (this.activityQueue.length > 0 && !this.isProcessing) {
        this.isProcessing = true;
        
        try {
          const activitiesToProcess = [...this.activityQueue];
          this.activityQueue = [];
          
          // Process in batches of 10
          const batchSize = 10;
          for (let i = 0; i < activitiesToProcess.length; i += batchSize) {
            const batch = activitiesToProcess.slice(i, i + batchSize);
            await UserActivity.insertMany(batch);
          }
          
          console.log(`✅ Processed ${activitiesToProcess.length} user activities`);
        } catch (error) {
          console.error('Error in batch activity processing:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, 5000); // Process every 5 seconds
  }

  // Generate session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Specific activity loggers for common actions

  // Authentication activities
  async logUserRegistration(userId, userData, req) {
    return await this.logActivity({
      userId,
      activityType: 'user_registered',
      activityTitle: 'User Registered',
      activityDescription: `New user registered with phone ${userData.phone}`,
      currentStage: 'registration',
      status: 'success',
      priority: 'medium',
      activityData: {
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    }, req);
  }

  async logUserLogin(userId, req) {
    return await this.logActivity({
      userId,
      activityType: 'user_login',
      activityTitle: 'User Logged In',
      activityDescription: 'User successfully logged into the system',
      status: 'success',
      priority: 'low'
    }, req);
  }

  async logUserLogout(userId, req) {
    return await this.logActivity({
      userId,
      activityType: 'user_logout',
      activityTitle: 'User Logged Out',
      activityDescription: 'User logged out of the system',
      status: 'success',
      priority: 'low'
    }, req);
  }

  // OTP activities
  async logOTPRequested(userId, phone, req) {
    return await this.logActivity({
      userId,
      activityType: 'otp_requested',
      activityTitle: 'OTP Requested',
      activityDescription: `OTP requested for phone verification`,
      currentStage: 'phone_verification',
      status: 'pending',
      priority: 'medium',
      activityData: {
        phone
      }
    }, req);
  }

  async logOTPVerified(userId, req) {
    return await this.logActivity({
      userId,
      activityType: 'otp_verified',
      activityTitle: 'OTP Verified',
      activityDescription: 'Phone number successfully verified with OTP',
      currentStage: 'profile_setup',
      status: 'success',
      priority: 'medium'
    }, req);
  }

  // KYC activities
  async logKYCStarted(userId, req) {
    return await this.logActivity({
      userId,
      activityType: 'kyc_started',
      activityTitle: 'KYC Process Started',
      activityDescription: 'User initiated KYC verification process',
      currentStage: 'kyc_process',
      status: 'pending',
      priority: 'medium'
    }, req);
  }

  async logKYCSubmitted(userId, kycData, req) {
    return await this.logActivity({
      userId,
      activityType: 'kyc_submitted',
      activityTitle: 'KYC Documents Submitted',
      activityDescription: 'KYC documents submitted for verification',
      currentStage: 'kyc_process',
      status: 'pending',
      priority: 'high',
      activityData: {
        documentType: kycData.documentType,
        kycStatus: 'submitted'
      },
      relatedRecords: {
        kycRecordId: kycData._id
      }
    }, req);
  }

  async logKYCApproved(userId, kycData, adminId) {
    return await this.logActivity({
      userId,
      activityType: 'kyc_approved',
      activityTitle: 'KYC Approved',
      activityDescription: 'KYC documents approved by admin',
      currentStage: 'esign_process',
      status: 'success',
      priority: 'high',
      performedBy: adminId,
      activityData: {
        kycStatus: 'approved'
      },
      relatedRecords: {
        kycRecordId: kycData._id
      }
    });
  }

  async logKYCRejected(userId, kycData, reason, adminId) {
    return await this.logActivity({
      userId,
      activityType: 'kyc_rejected',
      activityTitle: 'KYC Rejected',
      activityDescription: `KYC documents rejected: ${reason}`,
      currentStage: 'kyc_process',
      status: 'failed',
      priority: 'critical',
      performedBy: adminId,
      activityData: {
        kycStatus: 'rejected',
        rejectionReason: reason
      },
      relatedRecords: {
        kycRecordId: kycData._id
      }
    });
  }

  // E-Sign activities
  async logESignInitiated(userId, documentId, req) {
    return await this.logActivity({
      userId,
      activityType: 'esign_initiated',
      activityTitle: 'E-Sign Initiated',
      activityDescription: 'Digital signature process started',
      currentStage: 'esign_process',
      status: 'pending',
      priority: 'medium',
      activityData: {
        esignDocumentId: documentId,
        esignStatus: 'initiated'
      }
    }, req);
  }

  async logESignCompleted(userId, documentId, req) {
    return await this.logActivity({
      userId,
      activityType: 'esign_completed',
      activityTitle: 'E-Sign Completed',
      activityDescription: 'Document digitally signed successfully',
      currentStage: 'plan_selection',
      status: 'success',
      priority: 'high',
      activityData: {
        esignDocumentId: documentId,
        esignStatus: 'completed'
      }
    }, req);
  }

  // Payment activities
  async logPaymentInitiated(userId, paymentData, req) {
    return await this.logActivity({
      userId,
      activityType: 'payment_initiated',
      activityTitle: 'Payment Initiated',
      activityDescription: `Payment initiated for ${paymentData.planName}`,
      currentStage: 'payment_process',
      status: 'pending',
      priority: 'high',
      activityData: {
        paymentId: paymentData.link_id,
        paymentAmount: paymentData.amount,
        planId: paymentData.plan_id,
        planName: paymentData.plan_name
      },
      relatedRecords: {
        paymentLinkId: paymentData._id
      }
    }, req);
  }

  async logPaymentSuccess(userId, paymentData) {
    return await this.logActivity({
      userId,
      activityType: 'payment_success',
      activityTitle: 'Payment Successful',
      activityDescription: `Payment completed successfully for ${paymentData.plan_name}`,
      currentStage: 'channel_access',
      status: 'success',
      priority: 'critical',
      activityData: {
        paymentId: paymentData.link_id,
        paymentAmount: paymentData.amount,
        paymentStatus: 'success',
        planName: paymentData.plan_name
      },
      relatedRecords: {
        paymentLinkId: paymentData._id
      }
    });
  }

  async logChannelLinksDelivered(userId, paymentData, channelCount) {
    return await this.logActivity({
      userId,
      activityType: 'channel_links_delivered',
      activityTitle: 'Channel Links Delivered',
      activityDescription: `${channelCount} channel links delivered successfully`,
      currentStage: 'active_user',
      status: 'success',
      priority: 'high',
      activityData: {
        paymentId: paymentData.link_id,
        planName: paymentData.plan_name,
        channelCount
      }
    });
  }

  // Get user journey timeline
  async getUserJourneyTimeline(userId, options = {}) {
    try {
      return await UserActivity.getUserJourneyTimeline(userId, options);
    } catch (error) {
      console.error('Error getting user journey timeline:', error);
      throw error;
    }
  }

  // Get user current stage and progress
  async getUserProgress(userId) {
    try {
      const [currentStage, stageProgress] = await Promise.all([
        UserActivity.getUserCurrentStage(userId),
        UserActivity.getUserStageProgress(userId)
      ]);

      return {
        currentStage,
        stageProgress,
        completionPercentage: this.calculateCompletionPercentage(stageProgress)
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  // Calculate completion percentage
  calculateCompletionPercentage(stageProgress) {
    const stages = Object.keys(stageProgress);
    const completedStages = Object.values(stageProgress).filter(Boolean).length;
    return Math.round((completedStages / stages.length) * 100);
  }

  // Get user activity summary
  async getUserActivitySummary(userId) {
    try {
      const pipeline = [
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' },
            status: { $last: '$status' }
          }
        }
      ];

      const summary = await UserActivity.aggregate(pipeline);
      
      return {
        totalActivities: summary.reduce((sum, item) => sum + item.count, 0),
        activityBreakdown: summary,
        lastActivity: Math.max(...summary.map(s => new Date(s.lastActivity)))
      };
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      throw error;
    }
  }

  // Admin action logging
  async logAdminAction(userId, adminId, action, description, data = {}) {
    return await this.logActivity({
      userId,
      activityType: 'admin_action_taken',
      activityTitle: `Admin Action: ${action}`,
      activityDescription: description,
      status: 'success',
      priority: 'high',
      performedBy: adminId,
      activityData: data,
      isSystemGenerated: false
    });
  }

  // Error logging
  async logError(userId, errorCode, errorMessage, additionalData = {}) {
    return await this.logActivity({
      userId,
      activityType: 'error_occurred',
      activityTitle: 'System Error',
      activityDescription: errorMessage,
      status: 'failed',
      priority: 'critical',
      activityData: {
        errorCode,
        errorMessage,
        ...additionalData
      }
    });
  }
}

module.exports = new UserActivityService();