const express = require('express');
const notificationService = require('../services/notificationService');
const adminAuth = require('../middlewares/adminAuth');
const router = express.Router();

// Get notification history for admin
router.get('/history', adminAuth, (req, res) => {
  try {
    const adminId = req.admin?.id || req.user?.id;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    const history = notificationService.getNotificationHistory(adminId, limit);
    
    res.json({
      success: true,
      data: {
        notifications: history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
});

// Send custom notification (admin only)
router.post('/send', adminAuth, (req, res) => {
  try {
    const { targetAdminId, title, message, type, data } = req.body;
    const senderAdminId = req.admin?.id || req.user?.id;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Add sender info to notification data
    const notificationData = {
      ...data,
      senderAdminId: senderAdminId,
      senderName: req.admin?.name || req.user?.name || 'Admin'
    };

    notificationService.sendCustomNotification(
      targetAdminId || 'all',
      title,
      message,
      type || 'custom',
      notificationData
    );

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// Get notification service stats (super admin only)
router.get('/stats', adminAuth, (req, res) => {
  try {
    // Check if user has appropriate permissions (you may want to add role-based auth here)
    const stats = notificationService.getConnectionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats',
      error: error.message
    });
  }
});

// Test notification endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', adminAuth, (req, res) => {
    try {
      const adminId = req.admin?.id || req.user?.id;
      const { type = 'test' } = req.body;
      
      let notification;
      
      switch (type) {
        case 'payment_success':
          notification = {
            link_id: 'TEST-' + Date.now(),
            amount: 999,
            customer_id: 'test_customer',
            plan_name: 'Test Plan',
            adminId: adminId
          };
          notificationService.notifyPaymentSuccess(notification);
          break;
          
        case 'payment_failed':
          notification = {
            link_id: 'TEST-' + Date.now(),
            amount: 999,
            customer_id: 'test_customer',
            plan_name: 'Test Plan',
            adminId: adminId
          };
          notificationService.notifyPaymentFailed(notification);
          break;
          
        default:
          notificationService.sendCustomNotification(
            adminId,
            '🧪 Test Notification',
            'This is a test notification from the notification service.',
            'test',
            { testId: Date.now() }
          );
      }
      
      res.json({
        success: true,
        message: `Test ${type} notification sent`
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  });
}

// Mark notification as read
router.post('/mark-read', adminAuth, (req, res) => {
  try {
    const { notificationId } = req.body;
    const adminId = req.admin?.id || req.user?.id;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    // In a production app, you might want to store read status in a database
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Clear all notifications for admin
router.post('/clear', adminAuth, (req, res) => {
  try {
    const adminId = req.admin?.id || req.user?.id;
    
    // Clear notification history for the admin
    notificationService.notificationHistory.delete(adminId);
    
    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
});

module.exports = router;