const express = require('express');
const router = express.Router();
const {
  verifyChannelLinkDelivery,
  deliverMissingChannelLinks,
  getPaymentsRequiringVerification,
  bulkVerifyAndDeliver,
  getDeliveryStatistics,
  regenerateUserChannelBundleLinks,
  autoVerifyRecentPayments
} = require('../controllers/channelLinkDeliveryController');

// Middleware to check admin authentication (you may need to adjust this)
const authenticateAdmin = require('../middlewares/adminAuth'); // Adjust path as needed

// Admin Routes - Channel Link Delivery Management
router.get('/admin/payments/requiring-verification', authenticateAdmin, getPaymentsRequiringVerification);
router.get('/admin/statistics', authenticateAdmin, getDeliveryStatistics);
router.post('/admin/bulk-verify-deliver', authenticateAdmin, bulkVerifyAndDeliver);
router.post('/admin/auto-verify-recent', authenticateAdmin, autoVerifyRecentPayments);

// Admin Routes - Individual Payment Management
router.get('/admin/verify/:userId/:paymentId', authenticateAdmin, verifyChannelLinkDelivery);
router.post('/admin/deliver/:userId/:paymentId', authenticateAdmin, deliverMissingChannelLinks);

// User Routes - Channel Bundle Management
router.post('/user/:userId/bundle/:groupId/regenerate', regenerateUserChannelBundleLinks);

// Public/Internal Routes - For system use
router.get('/verify/:userId/:paymentId', verifyChannelLinkDelivery);
router.post('/deliver/:userId/:paymentId', deliverMissingChannelLinks);

module.exports = router;