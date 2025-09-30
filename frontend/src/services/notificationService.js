class NotificationService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.listeners = new Map();
    this.isConnected = false;
    this.adminId = null;
    this.token = null;
    
    // Browser notification permission
    this.hasNotificationPermission = false;
    this.requestNotificationPermission();
    
    console.log('🔔 Frontend Notification Service initialized');
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.hasNotificationPermission = permission === 'granted';
      
      if (this.hasNotificationPermission) {
        console.log('📱 Browser notification permission granted');
      } else {
        console.warn('⚠️ Browser notification permission denied');
      }
    } else {
      console.warn('⚠️ Browser does not support notifications');
    }
  }

  // Initialize WebSocket connection
  connect(adminId, token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.adminId = adminId;
    this.token = token;
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4000/api/notifications/ws`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔗 Connected to notification service');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Authenticate
        this.ws.send(JSON.stringify({
          type: 'authenticate',
          adminId: this.adminId,
          token: this.token
        }));
        
        this.emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('📡 WebSocket connection closed');
        this.isConnected = false;
        this.emit('disconnected');
        this.handleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    switch (data.type) {
      case 'authentication_success':
        console.log('✅ Authentication successful');
        this.emit('authenticated');
        break;
        
      case 'authentication_failed':
        console.error('❌ Authentication failed:', data.message);
        this.emit('auth_failed', data.message);
        break;
        
      case 'notification':
        console.log('🔔 New notification received:', data.data);
        this.handleNotification(data.data);
        break;
        
      case 'notification_history':
        console.log('📜 Notification history received');
        this.emit('history', data.data);
        break;
        
      case 'pong':
        // Handle ping response
        break;
        
      default:
        console.log('🔄 Unknown message type:', data.type);
    }
  }

  // Handle new notification
  handleNotification(notification) {
    // Show browser notification
    this.showBrowserNotification(notification);
    
    // Play sound if configured
    this.playNotificationSound(notification.sound || 'notification');
    
    // Emit to listeners
    this.emit('notification', notification);
    
    // Store in local history (optional)
    this.storeNotificationLocally(notification);
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if (!this.hasNotificationPermission) return;
    
    const title = notification.title;
    const options = {
      body: notification.message,
      icon: this.getNotificationIcon(notification.type),
      badge: '/notification-badge.png',
      tag: `payment-${notification.data?.orderId || Date.now()}`,
      requireInteraction: notification.priority === 'high',
      actions: notification.actions || [],
      data: notification.data
    };
    
    const browserNotification = new Notification(title, options);
    
    browserNotification.onclick = () => {
      window.focus();
      this.emit('notification_clicked', notification);
      browserNotification.close();
    };
    
    // Auto close after 10 seconds for non-high priority
    if (notification.priority !== 'high') {
      setTimeout(() => {
        browserNotification.close();
      }, 10000);
    }
  }

  // Play notification sound
  playNotificationSound(soundType) {
    try {
      let audioFile = '/sounds/notification.mp3'; // Default sound
      
      switch (soundType) {
        case 'success':
          audioFile = '/sounds/success.mp3';
          break;
        case 'error':
          audioFile = '/sounds/error.mp3';
          break;
        case 'notification':
        default:
          audioFile = '/sounds/notification.mp3';
          break;
      }
      
      const audio = new Audio(audioFile);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  // Get notification icon based on type
  getNotificationIcon(type) {
    const icons = {
      payment_success: '/icons/payment-success.png',
      payment_failed: '/icons/payment-failed.png',
      payment_link_created: '/icons/payment-link.png',
      custom: '/icons/notification.png'
    };
    
    return icons[type] || icons.custom;
  }

  // Store notification locally for offline viewing
  storeNotificationLocally(notification) {
    try {
      const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
      notifications.unshift({
        ...notification,
        timestamp: new Date(),
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        read: false
      });
      
      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      localStorage.setItem('admin_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.warn('Failed to store notification locally:', error);
    }
  }

  // Get local notification history
  getLocalNotifications() {
    try {
      return JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    } catch (error) {
      console.warn('Failed to get local notifications:', error);
      return [];
    }
  }

  // Mark local notification as read
  markNotificationAsRead(notificationId) {
    try {
      const notifications = this.getLocalNotifications();
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        localStorage.setItem('admin_notifications', JSON.stringify(notifications));
        this.emit('notification_read', notificationId);
      }
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
    }
  }

  // Clear all local notifications
  clearLocalNotifications() {
    try {
      localStorage.removeItem('admin_notifications');
      this.emit('notifications_cleared');
    } catch (error) {
      console.warn('Failed to clear local notifications:', error);
    }
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.adminId && this.token) {
        this.connect(this.adminId, this.token);
      }
    }, delay);
  }

  // Send ping to keep connection alive
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  // Start heartbeat
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Disconnect WebSocket
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.adminId = null;
    this.token = null;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      adminId: this.adminId,
      reconnectAttempts: this.reconnectAttempts,
      hasNotificationPermission: this.hasNotificationPermission
    };
  }

  // Test notification (development)
  sendTestNotification() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // This would typically be handled by a backend API call
      console.log('Test notification would be sent via API call to backend');
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Start heartbeat when connected
notificationService.on('authenticated', () => {
  notificationService.startHeartbeat();
});

// Stop heartbeat when disconnected
notificationService.on('disconnected', () => {
  notificationService.stopHeartbeat();
});

export default notificationService;