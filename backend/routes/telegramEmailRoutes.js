const express = require('express');
const router = express.Router();
const telegramEmailController = require('../controllers/telegramEmailController');

/**
 * Routes for Telegram invite link email functionality
 */

// Send single channel invite link via email
router.post('/send-single-invite', async (req, res) => {
  await telegramEmailController.sendSingleChannelInvite(req, res);
});

// Send channel bundle invite links via email
router.post('/send-bundle-invite', async (req, res) => {
  await telegramEmailController.sendChannelBundleInvite(req, res);
});

// Send invite link with payment confirmation
router.post('/send-invite-with-payment', async (req, res) => {
  await telegramEmailController.sendInviteWithPaymentConfirmation(req, res);
});

// Resend invite link email
router.post('/resend-invite-email', async (req, res) => {
  await telegramEmailController.resendInviteEmail(req, res);
});

// Send reminder email for all active invite links
router.post('/send-reminder/:userId', async (req, res) => {
  await telegramEmailController.sendInviteReminderEmail(req, res);
});

module.exports = router;
