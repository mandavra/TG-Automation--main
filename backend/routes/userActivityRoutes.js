const express = require('express');
const router = express.Router();
const userActivityController = require('../controllers/userActivityController');
const { verifyAdmin } = require('../middlewares/adminAuth');

// Apply admin authentication to all routes
router.use(verifyAdmin);

// Get user journey timeline
router.get('/:userId/journey-timeline', userActivityController.getUserJourneyTimeline);

// Get user progress and current stage
router.get('/:userId/progress', userActivityController.getUserProgress);

// Get user activity summary
router.get('/:userId/activity-summary', userActivityController.getUserActivitySummary);

// Log admin action on user
router.post('/:userId/admin-action', userActivityController.logAdminAction);

// Get multiple users' journey data (for admin dashboard)
router.post('/multiple-users-journey', userActivityController.getMultipleUsersJourney);

// Get user stage statistics (for dashboard analytics)
router.get('/stage-statistics', userActivityController.getUserStageStatistics);

// Get recent activities across all users
router.get('/recent-activities', userActivityController.getRecentActivities);

// Get activity analytics (for charts and graphs)
router.get('/analytics', userActivityController.getActivityAnalytics);

module.exports = router;