const express = require('express');
const router = express.Router();
const adminPanelCustomizationController = require('../controllers/adminPanelCustomizationController');
const { verifyAdmin } = require('../middlewares/adminAuth');

// Apply admin auth middleware to all routes
router.use(verifyAdmin);

// Get current admin's own panel configuration
router.get('/my-config', adminPanelCustomizationController.getMyPanelConfig);

// Get specific admin's panel configuration
router.get('/:adminId/config', adminPanelCustomizationController.getAdminPanelConfig);

// Update admin panel configuration (Super admin only)
router.put('/:adminId/config', adminPanelCustomizationController.updateAdminPanelConfig);

// Create default configuration for admin
router.post('/:adminId/default-config', adminPanelCustomizationController.createDefaultConfig);

// Get all admin configurations (Super admin only)
router.get('/all-configs', adminPanelCustomizationController.getAllAdminConfigs);

// Bulk update configurations (Super admin only)
router.patch('/bulk-update', adminPanelCustomizationController.bulkUpdateConfigs);

// Clone configuration from another admin (Super admin only)
router.post('/clone', adminPanelCustomizationController.cloneConfiguration);

// Validate current admin's access
router.get('/validate-access', adminPanelCustomizationController.validateAdminAccess);

// Get page permissions for current admin
router.get('/permissions/:pageId', adminPanelCustomizationController.getPagePermissions);

// Reset configuration to default (Super admin only)
router.post('/:adminId/reset', adminPanelCustomizationController.resetToDefault);

// Template management routes
router.post('/templates', adminPanelCustomizationController.createTemplate);
router.get('/templates', adminPanelCustomizationController.getTemplates);
router.post('/templates/apply', adminPanelCustomizationController.applyTemplate);

// Export/Import configuration
router.get('/:adminId/export', adminPanelCustomizationController.exportConfiguration);
router.post('/:adminId/import', adminPanelCustomizationController.importConfiguration);

module.exports = router;