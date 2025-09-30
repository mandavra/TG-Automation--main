const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // auto delete after 5 mins
});

module.exports = mongoose.model('OtpRequest', otpRequestSchema);
