import { useEffect, useState, useRef } from "react";
import { Sun, Moon, Bell, User, Check, Trash2, Crown } from "lucide-react";
import { io } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";
import AdminPanelSwitcher from "../Component/SuperAdmin/AdminPanelSwitcher";
import NotificationBell from "../components/NotificationSystem/NotificationBell";

const NOTIFICATION_TYPES = {
  NEW_USER: {
    icon: '👤',
    color: 'blue',
    label: 'New User'
  },
  PAYMENT: {
    icon: '💰',
    color: 'green',
    label: 'Payment'
  },
  KYC: {
    icon: '📝',
    color: 'purple',
    label: 'KYC'
  },
  DIGIO: {
    icon: '📄',
    color: 'red',
    label: 'Digio Error'
  },
  TELEGRAM_KICK: {
    icon: '🚫',
    color: 'orange',
    label: 'Telegram Kick'
  },
  SYSTEM: {
    icon: '⚙️',
    color: 'gray',
    label: 'System'
  }
};

const MAX_NOTIFICATIONS = 50; 
const NOTIFICATION_EXPIRY_DAYS = 7; 

const Navbar = ({ title = "Admin Panel" }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupedNotifications, setGroupedNotifications] = useState({});
  const notificationRef = useRef(null);

  useEffect(() => {
   
    const now = new Date();
    const cleanedNotifications = notifications
      .filter(notification => {
        const notificationDate = new Date(notification.time);
        const daysDiff = (now - notificationDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= NOTIFICATION_EXPIRY_DAYS;
      })
      .slice(0, MAX_NOTIFICATIONS);

    if (cleanedNotifications.length !== notifications.length) {
      setNotifications(cleanedNotifications);
    } else {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    setUnreadCount(notifications.filter(n => !n.read).length);
    
   
    const grouped = notifications.reduce((acc, notification) => {
      const type = notification.type || 'SYSTEM';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(notification);
      return acc;
    }, {});
    setGroupedNotifications(grouped);
  }, [notifications]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const socket = io('http://localhost:4000');
    const telegramSocket = io('http://localhost:4000'); // Now using same port

    socket.on('connect', () => {
      console.log('Connected to main WebSocket server');
    });

    telegramSocket.on('connect', () => {
      console.log('Connected to Telegram bot WebSocket server');
    });

    socket.on('newUser', (user) => {
     
      const existingNotification = notifications.find(
        n => n.type === 'NEW_USER' && 
        n.message.includes(user.email || user.phone)
      );

      if (!existingNotification) {
        const newNotification = {
          id: Date.now(),
          type: 'NEW_USER',
          message: `New user registered: ${user.name || user.email || user.phone}`,
          time: new Date(),
          read: false,
          priority: 'high',
          userId: user._id || user.id 
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
      }
    });

    socket.on('payment', (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'PAYMENT',
        message: `New payment received: ${data.amount} from ${data.user}`,
        time: new Date(),
        read: false,
        priority: 'high',
        paymentId: data.paymentId 
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
    });

    // Listen for Telegram bot kick notifications
    telegramSocket.on('telegramKick', (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'TELEGRAM_KICK',
        message: `User kicked from Telegram: ${data.user} (${data.userId})`,
        time: new Date(),
        read: false,
        priority: 'high',
        userId: data.userId,
        reason: data.reason,
        channelId: data.channelId
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
    });

    // Listen for Telegram bot error notifications
    telegramSocket.on('telegramError', (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'TELEGRAM_KICK',
        message: `Telegram bot error: ${data.error} for user ${data.userId}`,
        time: new Date(),
        read: false,
        priority: 'high',
        userId: data.userId,
        error: data.error
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
    });

    if (notifications.length === 0) {
      fetchInitialNotifications();
    }

    return () => {
      socket.disconnect();
      telegramSocket.disconnect();
    };
  }, [notifications]);

  const fetchInitialNotifications = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/kyc/all');
      const users = await response.json();
      
      
      const recentUsers = users
        .filter(user => {
          const userDate = new Date(user.createdAt || Date.now());
          const daysDiff = (new Date() - userDate) / (1000 * 60 * 60 * 24);
          return daysDiff <= NOTIFICATION_EXPIRY_DAYS;
        })
        .slice(0, 10);

      const initialNotifications = recentUsers.map(user => ({
        id: user._id || Date.now(),
        type: 'NEW_USER',
        message: `User registered: ${user.name || user.email || user.phone}`,
        time: new Date(user.createdAt || Date.now()),
        read: false,
        priority: 'normal',
        userId: user._id || user.id
      }));

      setNotifications(initialNotifications);
    } catch (error) {
      console.error('Error fetching initial notifications:', error);
    }
  };

 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setShowNotifications(false);
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  let role
  const adminRole= localStorage.getItem('adminRole');
  if (adminRole === 'superadmin') {
    role = 'Super Admin';
  }else if (adminRole === 'admin') {
    role = 'Admin';
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] w-full flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between px-1 xs:px-2 sm:px-4 md:px-6 py-1 md:py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-0.5 xs:gap-1 min-w-0 w-full md:w-auto">
        <span className="hidden sm:inline truncate max-w-[80vw] xs:max-w-[55vw] sm:max-w-none text-[13px] xs:text-base sm:text-lg md:text-2xl font-bold font-sans tracking-tight text-gray-900 dark:text-white">{title}</span>
        <span className="hidden xs:inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200 rounded-full">Dashboard</span>
      </div>
      <div className="flex flex-row items-center justify-center flex-nowrap gap-1 xs:gap-2 sm:gap-3 md:gap-4 w-full md:w-auto mt-0">
        {/* New Payment Notification System */}
        {/* <NotificationBell /> */}
        <div className="relative notification-container" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1 xs:p-2 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 xs:w-5 xs:h-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 xs:w-5 xs:h-5 bg-red-500 text-white text-[10px] xs:text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute left-0 right-0 mx-auto mt-2 w-[98vw] sm:w-80 md:w-96 max-w-[99vw] md:max-w-[92vw] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 md:right-0 md:left-auto md:mx-0 p-1 xs:p-2 sm:p-0 text-[12px] xs:text-sm">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearAllNotifications}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(groupedNotifications).length > 0 ? (
                  Object.entries(groupedNotifications).map(([type, typeNotifications]) => (
                    <div key={type} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {NOTIFICATION_TYPES[type]?.icon} {NOTIFICATION_TYPES[type]?.label}
                        </span>
                      </div>
                      {typeNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                            !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notification.time), { addSuffix: true })}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={markAllAsRead}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-1 xs:p-2 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 xs:w-5 xs:h-5 text-gray-600" />
          )}
        </button>
        {/* Admin Panel Switcher for Super Admin - show on all screens, no border/padding on mobile */}
        {adminRole === 'superadmin' && (
          <div className="md:pl-2 md:border-l md:border-gray-200 md:dark:border-gray-700 flex items-center">
            <AdminPanelSwitcher />
          </div>
        )}
        {/* Avatar/role hidden on mobile, only md+ */}
        <div className="hidden md:flex items-center gap-0.5 xs:gap-1 md:pl-2 md:border-l md:border-gray-200 md:dark:border-gray-700">
          <div className="w-6 h-6 xs:w-7 xs:h-7 rounded-full bg-blue-500 flex items-center justify-center">
            {adminRole === 'superadmin' ? (
              <Crown className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-400" />
            ) : (
              <User className="w-4 h-4 xs:w-5 xs:h-5 text-white" />
            )}
          </div>
          <span className="text-[11px] xs:text-xs font-medium text-gray-700 dark:text-gray-300">{role}</span>
          {localStorage.getItem('impersonating') && (
            <span className="text-[10px] xs:text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1 py-0.5 rounded-full">
              Impersonating
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
