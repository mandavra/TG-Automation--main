  const mongoose = require("mongoose");

  const inviteLinkSchema = new mongoose.Schema({
    link: {
      type: String,
      required: true,
      unique: true
    },
    link_id: {
      type: String,
      required: false,
      unique: true
    },
    telegramUserId: { 
      type: String,
      required: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    // Channel Bundle Support
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: false // For backward compatibility with existing records
    },
    channelId: {
      type: String,
      required: false // Telegram channel ID (chatId)
    },
    channelTitle: {
      type: String,
      required: false // Telegram channel title for reference
    },
    // Payment and Plan Association
    paymentLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentLink',
      required: false
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: false
    },
    is_used: { 
      type: Boolean, 
      default: false 
    },
    used_by: {
      type: String,
      default: null
    },
    used_at: {
      type: Date,
      default: null
    },
    expires_at: {
      type: Date,
      required: false,
      default: null
    },
    duration: {
      type: Number,
      default: 86400 // 24 hours in seconds
    },
    created_at: { 
      type: Date, 
      default: Date.now 
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true  // Index for efficient tenant filtering
    }
  }, {
    timestamps: true
  });

  // Index for better query performance
  inviteLinkSchema.index({ telegramUserId: 1, is_used: 1 });
  inviteLinkSchema.index({ expires_at: 1 });
  inviteLinkSchema.index({ created_at: -1 });

  module.exports = mongoose.model("InviteLink", inviteLinkSchema);
  