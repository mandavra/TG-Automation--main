const mongoose = require('mongoose');

const channelMemberSchema = new mongoose.Schema({
  // User identification
  telegramUserId: {
    type: String,
    required: true,
    index: true
  },
  
  // Channel identification
  channelId: {
    type: String,
    required: true,
    index: true
  },
  
  // Join details
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Individual expiry time (calculated from actual join time + duration)
  expiresAt: {
    type: Date,
    required: true,
    index: true // For efficient expiry queries
  },
  
  // Membership status
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  
  // Link that was used to join
  inviteLinkUsed: {
    type: String,
    required: true
  },
  
  // Tracking info
  kickedAt: {
    type: Date,
    default: null
  },
  
  kickReason: {
    type: String,
    default: null
  },
  
  // Additional metadata
  userInfo: {
    firstName: String,
    lastName: String,
    username: String
  },
  
  channelInfo: {
    title: String,
    bundleName: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true  // Index for efficient tenant filtering
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for efficient lookups
channelMemberSchema.index({ telegramUserId: 1, channelId: 1 }, { unique: true });

// Index for expiry checks
channelMemberSchema.index({ expiresAt: 1, isActive: 1 });

// Index for channel-specific queries
channelMemberSchema.index({ channelId: 1, isActive: 1 });

// Methods
channelMemberSchema.methods.isExpired = function() {
  return this.isActive && new Date() > this.expiresAt;
};

channelMemberSchema.methods.getRemainingTime = function() {
  if (!this.isActive) return 0;
  const remaining = this.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000)); // Return seconds
};

// Static methods for queries
channelMemberSchema.statics.findExpiredMembers = function() {
  return this.find({
    isActive: true,
    expiresAt: { $lt: new Date() }
  });
};

channelMemberSchema.statics.findMembersExpiringIn = function(minutes) {
  const cutoffTime = new Date(Date.now() + (minutes * 60 * 1000));
  return this.find({
    isActive: true,
    expiresAt: { $lt: cutoffTime, $gt: new Date() }
  });
};

module.exports = mongoose.model('ChannelMember', channelMemberSchema);
