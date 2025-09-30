const express = require('express');
const router = express.Router();
const {
  getUserDashboard,
  createUserAccount,
  getUserByPhone,
  getUserSubscriptionOverlap,
  consolidateUserSubscriptions,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionDetails
} = require('../controllers/multiBundleUserController');

// Middleware for admin authentication
const authenticateAdmin = require('../middlewares/adminAuth');

// Public user routes
router.get('/dashboard/:userPhone', getUserDashboard);
router.post('/create-account', createUserAccount);
router.get('/by-phone/:phone', getUserByPhone);

// User subscription management routes
router.get('/subscription/:subscriptionId', getSubscriptionDetails);
router.post('/cancel-subscription/:subscriptionId', cancelSubscription);
router.post('/resume-subscription/:subscriptionId', resumeSubscription);

// Admin routes for user management
router.get('/admin/user-overlap/:userId', authenticateAdmin, getUserSubscriptionOverlap);
router.post('/admin/consolidate-subscriptions/:userId', authenticateAdmin, consolidateUserSubscriptions);

module.exports = router;