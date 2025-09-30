const express = require('express');
const router = express.Router();
const emailIntegrationService = require('../services/emailIntegrationService');

// Get email status for a specific user (Admin only)
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await emailIntegrationService.getUserEmailStatus(userId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email status',
      error: error.message
    });
  }
});

// Get email statistics for admin dashboard
router.get('/statistics', async (req, res) => {
  try {
    const stats = await emailIntegrationService.getEmailStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting email statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email statistics',
      error: error.message
    });
  }
});

// Manually trigger welcome email for a user
router.post('/send-welcome/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await emailIntegrationService.sendWelcomeEmailOnly(userId);
    
    res.json({
      success: true,
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: error.message
    });
  }
});

// Manually trigger Telegram link email for a user
router.post('/send-telegram-link/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { inviteLink } = req.body;
    
    await emailIntegrationService.sendTelegramLinkEmailOnly(userId, inviteLink);
    
    res.json({
      success: true,
      message: 'Telegram link email sent successfully'
    });
  } catch (error) {
    console.error('Error sending Telegram link email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send Telegram link email',
      error: error.message
    });
  }
});

// Trigger subscription complete sequence
router.post('/subscription-complete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptionDetails = req.body;
    
    await emailIntegrationService.handleUserSubscriptionComplete(userId, subscriptionDetails);
    
    res.json({
      success: true,
      message: 'Subscription complete email sequence triggered'
    });
  } catch (error) {
    console.error('Error triggering subscription complete sequence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger subscription complete sequence',
      error: error.message
    });
  }
});

// Handle subscription renewal
router.post('/subscription-renewal/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await emailIntegrationService.handleSubscriptionRenewal(userId);
    
    res.json({
      success: true,
      message: 'Subscription renewal handled successfully'
    });
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle subscription renewal',
      error: error.message
    });
  }
});

// Manually trigger reminder check (Admin only)
router.post('/trigger-reminders', async (req, res) => {
  try {
    await emailIntegrationService.triggerBulkReminderCheck();
    
    res.json({
      success: true,
      message: 'Reminder check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering reminder check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger reminder check',
      error: error.message
    });
  }
});

// Audit and fix email notification structure
router.post('/audit-notifications', async (req, res) => {
  try {
    await emailIntegrationService.auditEmailNotifications();
    
    res.json({
      success: true,
      message: 'Email notification audit completed successfully'
    });
  } catch (error) {
    console.error('Error in email notification audit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to audit email notifications',
      error: error.message
    });
  }
});

module.exports = router;