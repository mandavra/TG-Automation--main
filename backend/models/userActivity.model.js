const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Activity identification
  activityType: {
    type: String,
    required: true,
    enum: [
      // Authentication activities
      'user_registered',
      'user_login',
      'user_logout',
      'otp_requested',
      'otp_verified',
      'otp_failed',
      
      // Profile activities
      'profile_updated',
      'phone_verified',
      'telegram_connected',
      'telegram_disconnected',
      
      // KYC activities
      'kyc_started',
      'kyc_document_uploaded',
      'kyc_submitted',
      'kyc_approved',
      'kyc_rejected',
      'kyc_pending_review',
      
      // E-Sign activities
      'esign_initiated',
      'esign_document_viewed',
      'esign_completed',
      'esign_failed',
      'esign_cancelled',
      
      // Payment activities
      'payment_initiated',
      'payment_link_generated',
      'payment_gateway_redirect',
      'payment_success',
      'payment_failed',
      'payment_cancelled',
      'payment_webhook_received',
      'channel_links_delivered',
      'channel_links_failed',
      
      // Channel activities
      'channel_access_granted',
      'channel_joined',
      'channel_left',
      'channel_kicked',
      'channel_expired',
      
      // Plan activities
      'plan_selected',
      'plan_purchased',
      'plan_activated',
      'plan_expired',
      'plan_renewed',
      
      // Admin activities
      'admin_action_taken',
      'manual_intervention',
      'support_contact',
      
      // System activities
      'system_notification_sent',
      'error_occurred',
      'session_expired'
    ]
  },
  
  // Activity details
  activityTitle: {
    type: String,
    required: true
  },
  
  activityDescription: {
    type: String
  },
  
  // Status and stage tracking
  currentStage: {
    type: String,
    enum: [
      'registration',
      'phone_verification', 
      'profile_setup',
      'kyc_process',
      'esign_process',
      'plan_selection',
      'payment_process',
      'channel_access',
      'active_user',
      'expired_user',
      'suspended_user'
    ]
  },
  
  // Detailed activity data
  activityData: {
    // Payment related data
    paymentId: String,
    paymentAmount: Number,
    paymentStatus: String,
    paymentMethod: String,
    planId: String,
    planName: String,
    
    // KYC related data
    kycStatus: String,
    documentType: String,
    documentId: String,
    rejectionReason: String,
    
    // E-Sign related data
    esignDocumentId: String,
    esignStatus: String,
    esignURL: String,
    
    // Channel related data
    channelId: String,
    channelName: String,
    inviteLink: String,
    
    // Error data
    errorCode: String,
    errorMessage: String,
    
    // Additional metadata
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    platform: String,
    browserInfo: String
  },
  
  // Status flags
  status: {
    type: String,
    enum: ['success', 'failed', 'pending', 'cancelled', 'expired'],
    default: 'success'
  },
  
  // Priority for timeline display
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Associated records
  relatedRecords: {
    paymentLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentLink'
    },
    kycRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KYC'
    },
    esignRecordId: String,
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    }
  },
  
  // Timeline positioning
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Duration tracking
  duration: {
    type: Number, // in milliseconds
    default: 0
  },
  
  // Admin visibility
  isVisibleToAdmin: {
    type: Boolean,
    default: true
  },
  
  // System flags
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  
  isAutomated: {
    type: Boolean,
    default: false
  },
  
  // Session tracking
  sessionId: String,
  
  // Geographic data
  location: {
    country: String,
    state: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Admin who performed action (if applicable)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ activityType: 1, timestamp: -1 });
userActivitySchema.index({ currentStage: 1 });
userActivitySchema.index({ status: 1 });
userActivitySchema.index({ timestamp: -1 });

// Virtual for user details
userActivitySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for admin details
userActivitySchema.virtual('admin', {
  ref: 'Admin',
  localField: 'performedBy',
  foreignField: '_id',
  justOne: true
});

// Methods
userActivitySchema.methods.getTimeAgo = function() {
  const now = new Date();
  const diffMs = now - this.timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

userActivitySchema.methods.getDurationFormatted = function() {
  if (!this.duration || this.duration === 0) return null;
  
  const seconds = Math.floor(this.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Static methods
userActivitySchema.statics.getUserJourneyTimeline = async function(userId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate = null,
    endDate = null,
    activityTypes = null,
    stages = null
  } = options;
  
  const query = { userId, isVisibleToAdmin: true };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (activityTypes && activityTypes.length > 0) {
    query.activityType = { $in: activityTypes };
  }
  
  if (stages && stages.length > 0) {
    query.currentStage = { $in: stages };
  }
  
  return await this.find(query)
    .populate('user', 'firstName lastName phone email telegramId')
    .populate('admin', 'firstName lastName email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

userActivitySchema.statics.getUserCurrentStage = async function(userId) {
  const latestActivity = await this.findOne({ 
    userId, 
    currentStage: { $exists: true, $ne: null } 
  }).sort({ timestamp: -1 });
  
  return latestActivity?.currentStage || 'registration';
};

userActivitySchema.statics.getUserStageProgress = async function(userId) {
  const stages = [
    'registration',
    'phone_verification',
    'profile_setup', 
    'kyc_process',
    'esign_process',
    'plan_selection',
    'payment_process',
    'channel_access',
    'active_user'
  ];
  
  const completedStages = await this.distinct('currentStage', { 
    userId, 
    status: 'success' 
  });
  
  const progress = {};
  stages.forEach(stage => {
    progress[stage] = completedStages.includes(stage);
  });
  
  return progress;
};

userActivitySchema.statics.logActivity = async function(activityData) {
  try {
    const activity = new this(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging user activity:', error);
    throw error;
  }
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivity;