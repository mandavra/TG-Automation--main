const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const upload = require('../middlewares/upload'); // Import the Multer upload middleware

// Public routes (no authentication required) - Most specific routes first
router.get('/by-route/:route', groupController.getPublicGroupByRoute); // Public API for frontend
router.get('/route/:route', groupController.getGroupByRoute); // Dynamic group pages
router.get('/active', groupController.getActiveGroups); // For Telegram bot integration
router.post('/check-route', groupController.checkRouteAvailability); // Route availability check

// Apply admin authentication and tenant isolation to protected routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(tenantMiddleware);
router.use(injectAdminContext);

// Group CRUD operations
router.post('/create', upload, groupController.createGroup); // Add upload middleware
router.get('/all', groupController.getAllGroups);
// Specific routes before parameterized routes
router.get('/search', groupController.searchGroups);
router.get('/default', groupController.getDefaultGroup);
// Parameterized routes
router.get('/:id', groupController.getGroupById);
router.put('/:id', upload, groupController.updateGroup); // Add upload middleware
router.delete('/:id', groupController.deleteGroup);

// Telegram integration
router.post('/:id/link-telegram', groupController.linkTelegramGroup);
router.post('/:id/test-connection', groupController.testBotConnection);

// Group management
router.get('/:id/stats', groupController.getGroupStats);
router.put('/:id/stats', groupController.updateGroupStats);
router.post('/:id/set-default', groupController.setDefaultGroup);

// Channel management for groups
router.get('/:id/channels', groupController.getGroupChannels);
router.post('/:id/channels', groupController.addChannelToGroup);
router.delete('/:id/channels/:channelId', groupController.removeChannelFromGroup);
router.post('/:id/channels/:channelId/generate-link', groupController.generateChannelJoinLink);

// Plan management for groups
router.get('/:id/plans', groupController.getGroupPlans);
router.post('/:id/plans', groupController.addPlanToGroup);
router.put('/:id/plans/reorder', groupController.reorderGroupPlans);
router.put('/:id/plans/:planId', groupController.updateGroupPlan);
router.delete('/:id/plans/:planId', groupController.removePlanFromGroup);

// Page content management for groups
router.put('/:id/page-content', groupController.updateGroupPageContent);

// These routes are now moved above to avoid conflicts with /:id route

module.exports = router;
