import React, { useState, useEffect } from 'react';
import { X, ExternalLink, User } from 'lucide-react';

const NotificationToast = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds auto-close

  useEffect(() => {
    // Fade in animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-close timer
    const closeTimer = setTimeout(() => {
      handleClose();
    }, 10000);
    
    // Countdown timer
    const countdownTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
      clearInterval(countdownTimer);
    };
  }, []);
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade out animation
  };
  
  const handleAction = (action) => {
    if (onAction) {
      onAction(action, notification);
    }
    handleClose();
  };
  
  const getToastStyle = () => {
    const baseStyle = 'fixed top-4 right-4 z-[9999] w-96 max-w-[90vw]';
    const visibilityStyle = isVisible 
      ? 'opacity-100 translate-x-0' 
      : 'opacity-0 translate-x-full';
    
    let colorStyle = '';
    switch (notification.type) {
      case 'payment_success':
        colorStyle = 'bg-green-50 border-green-200';
        break;
      case 'payment_failed':
        colorStyle = 'bg-red-50 border-red-200';
        break;
      case 'payment_link_created':
        colorStyle = 'bg-blue-50 border-blue-200';
        break;
      default:
        colorStyle = 'bg-white border-gray-200';
    }
    
    return `${baseStyle} ${visibilityStyle} ${colorStyle} transition-all duration-300 ease-in-out`;
  };
  
  const getIconStyle = () => {
    switch (notification.type) {
      case 'payment_success':
        return 'text-green-600 bg-green-100';
      case 'payment_failed':
        return 'text-red-600 bg-red-100';
      case 'payment_link_created':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getIcon = () => {
    switch (notification.type) {
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
  
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <div className={getToastStyle()}>
      <div className="bg-white rounded-lg shadow-lg border p-4 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>
        
        {/* Content */}
        <div className="flex items-start space-x-3 mt-2">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconStyle()}`}>
            <span className="text-lg">{getIcon()}</span>
          </div>
          
          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              {notification.message}
            </p>
            
            {/* Payment Details */}
            {notification.data && (
              <div className="space-y-1 mb-3">
                {notification.data.amount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-semibold text-gray-900">
                      {formatAmount(notification.data.amount)}
                    </span>
                  </div>
                )}
                {notification.data.customer && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium text-gray-900 truncate ml-2">
                      {notification.data.customer}
                    </span>
                  </div>
                )}
                {notification.data.planName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-900 truncate ml-2">
                      {notification.data.planName}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex space-x-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <span>{action.icon}</span>
                    <span>{action.title}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Default Actions for Payment Notifications */}
            {!notification.actions && notification.type.startsWith('payment_') && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAction({ action: 'view_details' })}
                  className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>View Details</span>
                </button>
                {notification.data?.customer && (
                  <button
                    onClick={() => handleAction({ action: 'view_customer' })}
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <User size={12} />
                    <span>Customer</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="text-xs text-gray-400 mt-3 text-right">
          {new Date(notification.data?.timestamp || notification.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;