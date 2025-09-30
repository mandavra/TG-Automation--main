const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const adminController = require('../controllers/adminController');

// Public
router.post('/login', adminController.login);

// Authenticated admin routes
router.get('/me', adminAuth, adminController.getProfile);
router.get('/list', adminAuth, requireRole('superadmin'), adminController.listAdmins);
router.put('/:id/email', adminAuth, requireRole('superadmin'), adminController.updateAdminEmail);
router.put('/:id/password', adminAuth, requireRole('superadmin'), adminController.updateAdminPassword);
router.delete('/:id', adminAuth, requireRole('superadmin'), adminController.deleteAdmin);
router.post('/create-admin', adminAuth, requireRole('superadmin'), adminController.createAdmin);
// Update permissions and platform fee (superadmin only)
router.put('/:id/permissions', adminAuth, requireRole('superadmin'), adminController.updatePermissionsAndFee);

// Super Admin Dashboard Routes
router.get('/dashboard/stats', adminAuth, requireRole('superadmin'), adminController.getDashboardStats);
router.get('/dashboard/admin/:adminId/stats', adminAuth, requireRole('superadmin'), adminController.getAdminStats);
router.post('/impersonate/:adminId', adminAuth, requireRole('superadmin'), adminController.impersonateAdmin);

// New Super Admin Power Features
router.get('/system/overview', adminAuth, requireRole('superadmin'), adminController.getSystemOverview);
router.post('/bulk/users', adminAuth, requireRole('superadmin'), adminController.bulkUserOperation);
router.get('/search/global', adminAuth, requireRole('superadmin'), adminController.globalSearch);
// Set platformFee for all admins (superadmin only)
router.put('/platform-fee/all', adminAuth, requireRole('superadmin'), adminController.setPlatformFeeForAll);

module.exports = router;


