const mongoose = require('mongoose');

const digioErrorSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'service', 'general'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['unresolved', 'resolved'],
    default: 'unresolved'
  }
}, { timestamps: true });

module.exports = mongoose.model('DigioError', digioErrorSchema); 