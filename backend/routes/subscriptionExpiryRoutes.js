const express = require('express');
const router = express.Router();
const {
  getExpiringSubscriptions,
  sendExpiryNotification,
  processExpiryNotifications,
  getExpiryStatistics,
  extendSubscription,
  bulkExtendSubscriptions,
  getRenewalRecommendations
} = require('../controllers/subscriptionExpiryController');

// Middleware to check admin authentication
const authenticateAdmin = require('../middlewares/adminAuth'); // Adjust path as needed

// Admin Routes - Subscription Expiry Management
router.get('/admin/expiring', authenticateAdmin, getExpiringSubscriptions);
router.get('/admin/statistics', authenticateAdmin, getExpiryStatistics);
router.get('/admin/renewal-recommendations', authenticateAdmin, getRenewalRecommendations);

// Admin Routes - Notification Management
router.post('/admin/send-notification/:subscriptionId', authenticateAdmin, sendExpiryNotification);
router.post('/admin/process-notifications', authenticateAdmin, processExpiryNotifications);

// Admin Routes - Subscription Extension
router.post('/admin/extend/:subscriptionId', authenticateAdmin, extendSubscription);
router.post('/admin/bulk-extend', authenticateAdmin, bulkExtendSubscriptions);

module.exports = router;