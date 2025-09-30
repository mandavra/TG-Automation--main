const EventEmitter = require('events');
const WebSocket = require('ws');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.adminConnections = new Map(); // adminId -> WebSocket connections
    this.notificationHistory = new Map(); // Store recent notifications for each admin
    this.maxHistorySize = 100;
    
    console.log('🔔 Notification Service initialized');
  }

  // Initialize WebSocket server
  initializeWebSocketServer(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/api/notifications/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('📡 New WebSocket connection established');
      
      // Handle connection authentication and admin identification
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'authenticate') {
            const { adminId, token } = data;
            
            // In a real application, you'd verify the token here
            if (adminId && token) {
              this.registerAdminConnection(adminId, ws);
              
              // Send recent notifications to newly connected admin
              this.sendRecentNotifications(adminId, ws);
              
              ws.send(JSON.stringify({
                type: 'authentication_success',
                message: 'Connected to notification service'
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'authentication_failed',
                message: 'Invalid credentials'
              }));
              ws.close();
            }
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('📡 WebSocket connection closed');
        this.removeAdminConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.removeAdminConnection(ws);
      });
    });

    console.log('🚀 WebSocket server initialized for notifications');
  }

  // Register admin WebSocket connection
  registerAdminConnection(adminId, ws) {
    if (!this.adminConnections.has(adminId)) {
      this.adminConnections.set(adminId, new Set());
    }
    
    this.adminConnections.get(adminId).add(ws);
    ws.adminId = adminId; // Store adminId on the WebSocket for cleanup
    
    console.log(`👤 Admin ${adminId} connected for notifications`);
  }

  // Remove admin WebSocket connection
  removeAdminConnection(ws) {
    if (ws.adminId) {
      const connections = this.adminConnections.get(ws.adminId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.adminConnections.delete(ws.adminId);
        }
      }
      console.log(`👤 Admin ${ws.adminId} disconnected from notifications`);
    }
  }

  // Send notification to specific admin(s)
  sendNotificationToAdmin(adminId, notification) {
    const connections = this.adminConnections.get(adminId);
    if (connections && connections.size > 0) {
      const message = JSON.stringify({
        type: 'notification',
        data: notification
      });
      
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
      
      console.log(`📤 Notification sent to admin ${adminId}:`, notification.title);
    }
    
    // Store in history
    this.storeNotificationInHistory(adminId, notification);
  }

  // Send notification to all connected admins
  broadcastToAllAdmins(notification) {
    this.adminConnections.forEach((connections, adminId) => {
      this.sendNotificationToAdmin(adminId, notification);
    });
  }

  // Store notification in history
  storeNotificationInHistory(adminId, notification) {
    if (!this.notificationHistory.has(adminId)) {
      this.notificationHistory.set(adminId, []);
    }
    
    const history = this.notificationHistory.get(adminId);
    history.unshift({
      ...notification,
      timestamp: new Date(),
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Keep only recent notifications
    if (history.length > this.maxHistorySize) {
      history.splice(this.maxHistorySize);
    }
  }

  // Send recent notifications to newly connected admin
  sendRecentNotifications(adminId, ws) {
    const history = this.notificationHistory.get(adminId);
    if (history && history.length > 0) {
      const recentNotifications = history.slice(0, 10); // Send last 10 notifications
      
      ws.send(JSON.stringify({
        type: 'notification_history',
        data: recentNotifications
      }));
    }
  }

  // Get notification history for admin
  getNotificationHistory(adminId, limit = 50) {
    const history = this.notificationHistory.get(adminId) || [];
    return history.slice(0, limit);
  }

  // Payment notification methods
  notifyPaymentSuccess(paymentData) {
    const notification = {
      type: 'payment_success',
      title: '💰 Payment Received!',
      message: `New payment of ₹${paymentData.amount} received from ${paymentData.customer_id || paymentData.phone}`,
      data: {
        orderId: paymentData.link_id,
        amount: paymentData.amount,
        customer: paymentData.customer_id || paymentData.phone,
        planName: paymentData.plan_name,
        timestamp: new Date()
      },
      priority: 'high',
      sound: 'success',
      actions: [
        {
          action: 'view_details',
          title: 'View Details',
          icon: '👁️'
        },
        {
          action: 'view_customer',
          title: 'View Customer',
          icon: '👤'
        }
      ]
    };

    // Send to specific admin if available, otherwise broadcast
    if (paymentData.adminId) {
      this.sendNotificationToAdmin(paymentData.adminId, notification);
    } else {
      this.broadcastToAllAdmins(notification);
    }

    console.log(`🔔 Payment success notification sent for order ${paymentData.link_id}`);
  }

  notifyPaymentFailed(paymentData) {
    const notification = {
      type: 'payment_failed',
      title: '❌ Payment Failed',
      message: `Payment attempt failed for ₹${paymentData.amount} from ${paymentData.customer_id || paymentData.phone}`,
      data: {
        orderId: paymentData.link_id,
        amount: paymentData.amount,
        customer: paymentData.customer_id || paymentData.phone,
        planName: paymentData.plan_name,
        timestamp: new Date()
      },
      priority: 'medium',
      sound: 'error'
    };

    if (paymentData.adminId) {
      this.sendNotificationToAdmin(paymentData.adminId, notification);
    } else {
      this.broadcastToAllAdmins(notification);
    }

    console.log(`🔔 Payment failure notification sent for order ${paymentData.link_id}`);
  }

  notifyNewPaymentLink(paymentData) {
    const notification = {
      type: 'payment_link_created',
      title: '🔗 New Payment Link',
      message: `Payment link created for ₹${paymentData.amount} - ${paymentData.plan_name}`,
      data: {
        orderId: paymentData.link_id,
        amount: paymentData.amount,
        customer: paymentData.customer_id || paymentData.phone,
        planName: paymentData.plan_name,
        timestamp: new Date()
      },
      priority: 'low',
      sound: 'notification'
    };

    if (paymentData.adminId) {
      this.sendNotificationToAdmin(paymentData.adminId, notification);
    } else {
      this.broadcastToAllAdmins(notification);
    }
  }

  // Send notification to all admins (simplified method)
  sendNotificationToAdmins(notification) {
    const formattedNotification = {
      ...notification,
      timestamp: new Date(),
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.broadcastToAllAdmins(formattedNotification);
  }

  // Generic notification method
  sendCustomNotification(adminId, title, message, type = 'info', data = {}) {
    const notification = {
      type: type,
      title: title,
      message: message,
      data: {
        ...data,
        timestamp: new Date()
      },
      priority: 'medium',
      sound: 'notification'
    };

    if (adminId === 'all') {
      this.broadcastToAllAdmins(notification);
    } else {
      this.sendNotificationToAdmin(adminId, notification);
    }
  }

  // Clean up old notifications
  cleanupOldNotifications() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    this.notificationHistory.forEach((history, adminId) => {
      const filteredHistory = history.filter(notif => notif.timestamp > cutoffTime);
      if (filteredHistory.length !== history.length) {
        this.notificationHistory.set(adminId, filteredHistory);
      }
    });
  }

  // Get connection stats
  getConnectionStats() {
    const stats = {
      totalConnections: 0,
      adminConnections: {},
      notificationHistorySize: {}
    };

    this.adminConnections.forEach((connections, adminId) => {
      stats.totalConnections += connections.size;
      stats.adminConnections[adminId] = connections.size;
    });

    this.notificationHistory.forEach((history, adminId) => {
      stats.notificationHistorySize[adminId] = history.length;
    });

    return stats;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Cleanup old notifications every hour
setInterval(() => {
  notificationService.cleanupOldNotifications();
}, 60 * 60 * 1000);

module.exports = notificationService;