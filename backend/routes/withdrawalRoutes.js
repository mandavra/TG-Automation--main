const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const withdrawalController = require('../controllers/withdrawalController');

// Admin routes - require authentication and tenant isolation
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(tenantMiddleware);
router.use(injectAdminContext);

// Admin-specific routes
router.get('/balance', withdrawalController.getAdminBalance);
router.post('/request', withdrawalController.createWithdrawalRequest);
router.get('/my-requests', withdrawalController.getMyWithdrawalRequests);

// Super admin routes - require super admin role
router.get('/admin/dashboard', requireRole('superadmin'), withdrawalController.getSuperAdminDashboard);
router.get('/admin/all-requests', requireRole('superadmin'), withdrawalController.getAllWithdrawalRequests);
router.put('/admin/process/:requestId', requireRole('superadmin'), withdrawalController.processWithdrawalRequest);
router.post('/admin/direct-withdrawal', requireRole('superadmin'), withdrawalController.directWithdrawal);
router.get('/admin/statistics', requireRole('superadmin'), withdrawalController.getWithdrawalStatistics);
router.get('/admin/:adminId/profile', requireRole('superadmin'), withdrawalController.getAdminWithdrawalProfile);

module.exports = router;