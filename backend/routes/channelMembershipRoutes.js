const express = require('express');
const router = express.Router();
const {
  recordChannelLeave,
  handleRejoinRequest,
  getUserMembershipStatus,
  getMembershipAnalytics,
  bulkCheckMembership,
  generateRecoveryLink,
  getRecentChannelLeavers,
  getUserRejoinOptions
} = require('../controllers/channelMembershipController');

// Middleware for admin authentication
const authenticateAdmin = require('../middlewares/adminAuth');

// Public/Bot Routes - Called by Telegram bot
router.post('/record-leave', recordChannelLeave);

// User Routes - For user dashboard and rejoin functionality
router.get('/user/:phone/rejoin-options', getUserRejoinOptions);
router.post('/user/:userId/rejoin/:channelId', handleRejoinRequest);
router.get('/user/:userId/status', getUserMembershipStatus);

// Admin Routes - Channel membership management
router.get('/admin/analytics', authenticateAdmin, getMembershipAnalytics);
router.get('/admin/recent-leavers', authenticateAdmin, getRecentChannelLeavers);
router.post('/admin/bulk-check', authenticateAdmin, bulkCheckMembership);
router.post('/admin/generate-recovery/:userId/:channelId', authenticateAdmin, generateRecoveryLink);

module.exports = router;