const express = require('express');
const {
  getUserActiveChannelBundles,
  getChannelBundleInviteLinks,
  regenerateChannelBundleLinks,
  getUserSubscriptionStatus,
  getUserInviteLinkSummary
} = require('../controllers/channelBundleController');

const router = express.Router();

// Get user's active channel bundles with invite links
router.get('/user/:userId/channel-bundles', getUserActiveChannelBundles);

// Get invite links for a specific channel bundle
router.get('/user/:userId/channel-bundle/:groupId/invite-links', getChannelBundleInviteLinks);

// Regenerate invite links for a channel bundle
router.post('/user/:userId/channel-bundle/:groupId/regenerate-links', regenerateChannelBundleLinks);

// Get user subscription status with channel bundles
router.get('/user/:userId/subscription-status', getUserSubscriptionStatus);

// Get user's invite link summary (for dashboard)
router.get('/user/:userId/invite-links/summary', getUserInviteLinkSummary);

module.exports = router;
