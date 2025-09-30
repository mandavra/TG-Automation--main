const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const analyticsController = require('../controllers/analyticsController');

// Admin authentication and tenant isolation required for all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(tenantMiddleware);
router.use(injectAdminContext);

// Analytics routes
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/export', analyticsController.exportAnalytics);
router.get('/user-growth', analyticsController.getUserGrowthAnalytics);

module.exports = router;