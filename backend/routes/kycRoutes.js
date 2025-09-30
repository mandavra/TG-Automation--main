const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const injectAdminContext = require('../middlewares/injectAdminContext');
const userController = require('../controllers/kycController');

// Public endpoints for user registration (from frontend)
router.post('/add', userController.createUser); // Legacy email-based
router.post('/register', userController.createUserByPhone); // New phone-based
router.post('/check', userController.checkUserByPhone); // Check if user exists
router.post('/complete', userController.completeKYC); // Mark KYC as completed

// Admin-only endpoints (require authentication and admin context)
router.get('/all', adminAuth, injectAdminContext, userController.getAllUsers);
router.get('/today', adminAuth, injectAdminContext, userController.getTodayUsers);
router.get('/:id', adminAuth, injectAdminContext, userController.getUserById);
router.put('/:id', adminAuth, injectAdminContext, userController.updateUserById);
router.delete('/:id', adminAuth, injectAdminContext, userController.deleteUserById);

module.exports = router;
