import React, { useState, useEffect } from 'react';
import { MdLightMode } from "react-icons/md";
import { IoMoon } from "react-icons/io5";
import { useTheme } from '../Theme/ThemeContext';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

const BundleHeader = () => {
  const { darkMode, setDarkMode } = useTheme();
  const { route } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on a bundle page
  const isBundlePage = location.pathname.startsWith('/pc/');
  
  // Get bundle data from global storage (set by PublicGroup component)
  const bundleData = window.currentBundleData;
  
  // Get bundle name or default
  const bundleName = bundleData?.name || "Premium Bundle";
  const bundleInitial = bundleName.charAt(0).toUpperCase();
  
  // User authentication state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('user');
      const authToken = localStorage.getItem('authToken');
      
      if (storedUser && authToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Clear invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
        }
      }
    };
    
    checkAuthStatus();
    
    // Listen for storage changes (in case user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'authToken') {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Handle logout
  // Handle logout
  const handleLogout = () => {
    // Clear all user authentication data
    const keysToRemove = [
      'user',
      'authToken',
      'phone',
      'userPhone',
      'isAuthenticated',
      'transactionId',
      'telegramLink',
      // Admin related keys
      'auth',
      'token',
      'adminRole',
      'isAdmin',
      'originalToken',
      'originalRole',
      'impersonating',
      'otp',
      // Other app data
      'adminData',
      'tenantId',
      'adminId',
      'persistenceFailures',
      'admin_notifications'
    ];

    // Remove standard keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear all bundle-specific completion status keys
    const completionKeys = ['paymentCompleted', 'kycCompleted', 'digioCompleted'];
    completionKeys.forEach(baseKey => {
      // Clear global keys
      localStorage.removeItem(baseKey);
      localStorage.removeItem(`${baseKey}_timestamp`);
      localStorage.removeItem(`${baseKey}_validated`);

      // Clear all bundle-specific keys by checking all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${baseKey}_`)) {
          localStorage.removeItem(key);
        }
      }
    });

    // Update component state
    setUser(null);
    setIsLoggedIn(false);

    // Small delay to ensure all localStorage operations complete before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };
  // Handle login navigation
  const handleLogin = () => {
    // Navigate to login with current bundle as return path
    const currentPath = location.pathname;
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  return (
    <header className="max-w-4xl mx-auto bg-gray-200 sm:rounded-xl px-6 py-3 flex items-center justify-between sm:fixed left-0 right-0 top-5 z-50 animate-fade-in-down">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-sans font-medium text-lg select-none animate-bounce-slow">
          {isBundlePage ? bundleInitial : 'E'}
        </div>
        {isBundlePage && (
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {bundleName}
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Premium Channel Bundle
            </p>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {isBundlePage && bundleData?.channels && (
          <div className="hidden md:flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
              📺 {bundleData.channels.filter(ch => ch.isActive).length} Channels
            </span>
          </div>
        )}
        
        {/* User Authentication Section */}
        {isLoggedIn && user ? (
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">👤</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-green-700 dark:text-green-400 text-xs font-medium">
                {user.phone || user.username || 'User'}
              </span>
              <span className="text-green-600 dark:text-green-500 text-[10px]">
                Logged in
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium hover:underline transition-colors"
              title="Logout"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors duration-200"
            title="Login to continue your purchase"
          >
            Login
          </button>
        )}
        
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-blue-600 text-white text-base font-sans rounded-lg px-4 py-2 hover:scale-110 transition-transform duration-300"
        >
          {darkMode ? <MdLightMode /> : <IoMoon />}
        </button>
      </div>
    </header>
  );
};

export default BundleHeader;