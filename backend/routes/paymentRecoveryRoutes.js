const express = require('express');
const router = express.Router();
const paymentRecoveryController = require('../controllers/paymentRecoveryController');
const { verifyAdmin } = require('../middlewares/adminAuth');

// Apply admin authentication to all routes
router.use(verifyAdmin);

// Get recovery statistics
router.get('/stats', paymentRecoveryController.getRecoveryStats);

// Get failed deliveries for admin dashboard
router.get('/failed-deliveries', paymentRecoveryController.getFailedDeliveries);

// Find all failed deliveries (diagnostic)
router.get('/find-failed', paymentRecoveryController.findFailedDeliveries);

// Manually trigger recovery for all failed deliveries
router.post('/process-failed', paymentRecoveryController.processFailedDeliveries);

// Recover specific payment
router.post('/recover/:paymentId', paymentRecoveryController.recoverSpecificPayment);

// Bulk recovery operations
router.post('/bulk-recovery', paymentRecoveryController.bulkRecovery);

// Test recovery system
router.get('/test-system', paymentRecoveryController.testRecoverySystem);

module.exports = router;