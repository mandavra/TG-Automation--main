const express = require('express');
const router = express.Router();

const { sendOtpController, verifyOtpController, resetOtpController } = require('../controllers/otpController');

router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/reset-otp', resetOtpController);

module.exports = router;
