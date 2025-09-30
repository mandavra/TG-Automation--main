const { string } = require('joi');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String },
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  email: { type: String },
  panNumber: { type: String },
  dob: { type: String },
  City: { type: String },
  State: { type: String },
  stateCode: { type: Number },
  phone: { type: String, unique: true },
  telegramUserId: { type: String, unique: true, sparse: true },
  telegramJoinStatus: { 
    type: String, 
    enum: ['pending', 'joined', 'kicked', 'expired'], 
    default: 'pending' 
  },
  telegramJoinedAt: { type: Date },
  transactionId: { type: String },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true  // Index for efficient tenant filtering
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  // KYC completion tracking
  kycCompleted: { type: Boolean, default: false },
  kycCompletedAt: { type: Date },
  // E-Sign completion tracking
  esignCompleted: { type: Boolean, default: false },
  esignCompletedAt: { type: Date },
  // Email notification tracking
  emailNotifications: {
    welcomeSent: { type: Boolean, default: false },
    telegramLinkSent: { type: Boolean, default: false },
    '3DayReminder': { type: Boolean, default: false },
    '2DayReminder': { type: Boolean, default: false },
    '1DayReminder': { type: Boolean, default: false },
    'expiryDayReminder': { type: Boolean, default: false },
    'expiredNotification': { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

