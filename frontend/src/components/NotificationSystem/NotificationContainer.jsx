import React, { useState, useEffect } from 'react';
import NotificationToast from './NotificationToast';
import notificationService from '../../services/notificationService';

const NotificationContainer = () => {
  const [activeToasts, setActiveToasts] = useState([]);
  const maxToasts = 5; // Maximum number of toasts to show at once
  
  useEffect(() => {
    const handleNewNotification = (notification) => {
      // Create a unique ID for the toast
      const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const toast = {
        ...notification,
        toastId,
        showToast: true // Flag to show as toast
      };
      
      setActiveToasts(prev => {
        const newToasts = [toast, ...prev];
        // Keep only the most recent toasts
        return newToasts.slice(0, maxToasts);
      });
    };
    
    // Listen for notifications
    notificationService.on('notification', handleNewNotification);
    
    // Cleanup
    return () => {
      notificationService.off('notification', handleNewNotification);
    };
  }, []);
  
  const removeToast = (toastId) => {
    setActiveToasts(prev => prev.filter(toast => toast.toastId !== toastId));
  };
  
  const handleToastAction = (action, notification) => {
    console.log('Toast action:', action, notification);
    
    // Handle different actions
    switch (action.action) {
      case 'view_details':
        // Navigate to payment details
        if (notification.data?.orderId) {
          const paymentUrl = `/admin/payments?orderId=${notification.data.orderId}`;
          window.location.href = paymentUrl;
        }
        break;
        
      case 'view_customer':
        // Navigate to customer details
        if (notification.data?.customer) {
          const customerUrl = `/admin/customers?search=${notification.data.customer}`;
          window.location.href = customerUrl;
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };
  
  return (
    <div className="notification-container">
      {activeToasts.map((toast, index) => (
        <div
          key={toast.toastId}
          style={{
            position: 'fixed',
            top: `${20 + index * 110}px`, // Stack toasts vertically
            right: '20px',
            zIndex: 9999 - index // Higher toasts have higher z-index
          }}
        >
          <NotificationToast
            notification={toast}
            onClose={() => removeToast(toast.toastId)}
            onAction={handleToastAction}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;