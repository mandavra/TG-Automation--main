const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');

// Public endpoint for getting plans (used by frontend)
router.get('/get', planController.getPlans);
router.get('/:id', planController.getSinglePlan);

// Admin endpoints for getting their own plans
router.get('/admin/get', adminAuth, requireRole('admin'), tenantMiddleware, planController.getPlans);
router.get('/admin/:id', adminAuth, requireRole('admin'), tenantMiddleware, planController.getSinglePlan);

// Admin-only endpoints with tenant isolation
router.post('/add', adminAuth, requireRole('admin'), tenantMiddleware, injectAdminContext, planController.addPlan);
router.post('/reorder', adminAuth, requireRole('admin'), tenantMiddleware, planController.reorderPlans);
router.put('/edit/:id', adminAuth, requireRole('admin'), tenantMiddleware, planController.editPlan);
router.delete('/delete/:id', adminAuth, requireRole('admin'), tenantMiddleware, planController.deletePlan);

module.exports = router;
