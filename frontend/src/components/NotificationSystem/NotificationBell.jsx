import React, { useState, useEffect } from 'react';
import { Bell, X, Settings, Check, CheckCheck } from 'lucide-react';
import notificationService from '../../services/notificationService';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    // Load local notifications on mount
    loadLocalNotifications();
    
    // Set up notification service listeners
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20
      updateUnreadCount();
    };
    
    const handleConnected = () => {
      setIsConnected(true);
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
    };
    
    const handleHistory = (historyNotifications) => {
      setNotifications(prev => {
        // Merge with local notifications, removing duplicates
        const localNotifs = prev.filter(n => n.id && n.id.startsWith('local_'));
        const combined = [...historyNotifications, ...localNotifs];
        return combined.slice(0, 50); // Keep last 50
      });
      updateUnreadCount();
    };
    
    // Add listeners
    notificationService.on('notification', handleNewNotification);
    notificationService.on('connected', handleConnected);
    notificationService.on('disconnected', handleDisconnected);
    notificationService.on('history', handleHistory);
    
    // Initialize connection if admin is logged in
    const initializeConnection = () => {
      const adminId = localStorage.getItem('adminId') || localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      
      if (adminId && token) {
        notificationService.connect(adminId, token);
      }
    };
    
    initializeConnection();
    
    // Cleanup
    return () => {
      notificationService.off('notification', handleNewNotification);
      notificationService.off('connected', handleConnected);
      notificationService.off('disconnected', handleDisconnected);
      notificationService.off('history', handleHistory);
    };
  }, []);
  
  const loadLocalNotifications = () => {
    const localNotifs = notificationService.getLocalNotifications();
    setNotifications(localNotifs);
    updateUnreadCount(localNotifs);
  };
  
  const updateUnreadCount = (notificationList = notifications) => {
    const unread = notificationList.filter(n => !n.read).length;
    setUnreadCount(unread);
  };
  
  const markAsRead = (notificationId) => {
    notificationService.markNotificationAsRead(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    updateUnreadCount();
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    // Update local storage
    const updatedNotifs = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('admin_notifications', JSON.stringify(updatedNotifs));
    setUnreadCount(0);
  };
  
  const clearAllNotifications = () => {
    notificationService.clearLocalNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_success':
        return '💰';
      case 'payment_failed':
        return '❌';
      case 'payment_link_created':
        return '🔗';
      default:
        return '🔔';
    }
  };
  
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Handle different notification types
    switch (notification.type) {
      case 'payment_success':
      case 'payment_failed':
        if (notification.data?.orderId) {
          // Navigate to payment details (you can customize this)
          console.log('Navigate to payment:', notification.data.orderId);
        }
        break;
      case 'payment_link_created':
        // Navigate to payments list
        console.log('Navigate to payments list');
        break;
    }
  };
  
  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isConnected 
            ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
        title={isConnected ? 'Notifications' : 'Notifications (Disconnected)'}
      >
        <Bell size={20} />
        
        {/* Connection Status Dot */}
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>
      
      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={14} />
                  <span>Mark all as read</span>
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-800"
                >
                  <X size={14} />
                  <span>Clear all notifications</span>
                </button>
                <div className="text-xs text-gray-500">
                  Status: {isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
          )}
          
          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-sm truncate ${
                        !notification.read ? 'text-gray-800' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                        {notification.data?.amount && (
                          <span className="text-xs font-semibold text-green-600">
                            ₹{notification.data.amount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;