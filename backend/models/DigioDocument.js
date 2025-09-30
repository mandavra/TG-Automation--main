const mongoose = require('mongoose');

const digioDocumentSchema = new mongoose.Schema({
  // Document identification
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Document details
  fileName: {
    type: String,
    required: true
  },
  
  originalFileName: {
    type: String
  },
  
  documentType: {
    type: String,
    enum: ['agreement', 'contract', 'kyc_document', 'subscription_agreement', 'other'],
    default: 'agreement'
  },
  
  // Digio specific data
  digioResponse: mongoose.Schema.Types.Mixed, // Store full Digio API response
  
  // Signing information
  signerData: {
    email: String,
    name: String,
    phone: String,
    identifier: String
  },
  
  // Document status tracking
  status: {
    type: String,
    enum: ['uploaded', 'sent_for_signing', 'signed', 'completed', 'failed', 'expired'],
    default: 'uploaded',
    index: true
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  sentForSigningAt: {
    type: Date
  },
  
  signedAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  },
  
  // File paths
  originalFilePath: {
    type: String // Path to original unsigned document
  },
  
  signedFilePath: {
    type: String // Path to signed document
  },
  
  // Download URLs (from Digio)
  downloadUrl: {
    type: String
  },
  
  signedDownloadUrl: {
    type: String
  },
  
  // Expiry information
  expiresAt: {
    type: Date
  },
  
  // Additional metadata
  metadata: {
    fileSize: Number,
    mimeType: String,
    pages: Number,
    ipAddress: String,
    userAgent: String
  },
  
  // Tenant isolation
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Related entities
  paymentLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentLink'
  },
  
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  
  // Error tracking
  errors: [{
    type: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Webhook data
  webhookEvents: [{
    event: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, { 
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Indexes for efficient queries
digioDocumentSchema.index({ userId: 1, adminId: 1 });
digioDocumentSchema.index({ status: 1, adminId: 1 });
digioDocumentSchema.index({ documentType: 1, adminId: 1 });
digioDocumentSchema.index({ createdAt: -1, adminId: 1 });
digioDocumentSchema.index({ signedAt: -1, adminId: 1 });

// Instance methods
digioDocumentSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

digioDocumentSchema.methods.canBeDownloaded = function() {
  return this.status === 'signed' || this.status === 'completed';
};

digioDocumentSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  
  const now = new Date();
  switch (newStatus) {
    case 'sent_for_signing':
      this.sentForSigningAt = now;
      break;
    case 'signed':
      this.signedAt = now;
      if (additionalData.signerData) {
        this.signerData = { ...this.signerData, ...additionalData.signerData };
      }
      break;
    case 'completed':
      this.completedAt = now;
      if (additionalData.signedFilePath) {
        this.signedFilePath = additionalData.signedFilePath;
      }
      if (additionalData.signedDownloadUrl) {
        this.signedDownloadUrl = additionalData.signedDownloadUrl;
      }
      break;
  }
  
  return this.save();
};

digioDocumentSchema.methods.addError = function(type, message) {
  this.errors.push({ type, message });
  return this.save();
};

digioDocumentSchema.methods.addWebhookEvent = function(event, data) {
  this.webhookEvents.push({ event, data });
  return this.save();
};

// Static methods
digioDocumentSchema.statics.findByDocumentId = function(documentId, adminId = null) {
  const query = { documentId };
  if (adminId) {
    query.adminId = adminId;
  }
  return this.findOne(query);
};

digioDocumentSchema.statics.findByUserId = function(userId, adminId) {
  return this.find({ userId, adminId }).sort({ createdAt: -1 });
};

digioDocumentSchema.statics.getStatsByStatus = function(adminId) {
  return this.aggregate([
    { $match: { adminId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSize: { $sum: '$metadata.fileSize' }
      }
    }
  ]);
};

digioDocumentSchema.statics.getRecentDocuments = function(adminId, limit = 10) {
  return this.find({ adminId })
    .populate('userId', 'firstName lastName email phone')
    .populate('paymentLinkId', 'amount plan_name status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('DigioDocument', digioDocumentSchema);