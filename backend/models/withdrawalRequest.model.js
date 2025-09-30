const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  },
  adminNotes: {
    type: String
  },
  processingNotes: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'wallet'],
    default: 'wallet' // Changed default to 'wallet'
  },
  // bankDetails: {
  //   accountNumber: String,
  //   ifscCode: String,
  //   bankName: String,
  //   accountHolderName: String,
  //   upiId: String
  // },
  transactionId: String, // For tracking actual bank transfer
  availableBalance: {
    type: Number,
    default: 0
  },
  
  // Type of withdrawal
  type: {
    type: String,
    enum: ['request', 'direct'], // 'request' = admin requested, 'direct' = super admin initiated
    default: 'request'
  }
}, {
  timestamps: true
});

// Index for faster queries
withdrawalRequestSchema.index({ adminId: 1, status: 1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ processedBy: 1, processedAt: -1 });

// Methods
withdrawalRequestSchema.methods.canBeProcessed = function() {
  return this.status === 'pending';
};

withdrawalRequestSchema.methods.approve = function(superAdminId, notes = '', transactionId = '') {
  if (!this.canBeProcessed()) {
    throw new Error('Request cannot be processed in current status');
  }
  
  this.status = 'approved';
  this.processedBy = superAdminId;
  this.processedAt = new Date();
  this.processingNotes = notes;
  if (transactionId) {
    this.transactionId = transactionId;
  }
  
  return this.save();
};

withdrawalRequestSchema.methods.reject = function(superAdminId, notes = '') {
  if (!this.canBeProcessed()) {
    throw new Error('Request cannot be processed in current status');
  }
  
  this.status = 'rejected';
  this.processedBy = superAdminId;
  this.processedAt = new Date();
  this.processingNotes = notes;
  
  return this.save();
};

// Static methods for super admin
withdrawalRequestSchema.statics.getPendingRequests = function() {
  return this.find({ status: 'pending' })
    .populate('adminId', 'email')
    .sort({ createdAt: -1 });
};

withdrawalRequestSchema.statics.getAdminRequests = function(adminId, status = null) {
  const query = { adminId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('processedBy', 'email')
    .sort({ createdAt: -1 });
};

withdrawalRequestSchema.statics.getRequestStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);