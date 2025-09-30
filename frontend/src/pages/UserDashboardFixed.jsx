import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaExternalLinkAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaRedo, FaEye, FaSignOutAlt, FaLifeRing } from 'react-icons/fa';
import { format, isAfter, differenceInDays } from 'date-fns';

const UserDashboardFixed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingBundle, setRefreshingBundle] = useState(null);

  // Get user phone from URL params or localStorage
  const getPhoneNumber = () => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('phone') || localStorage.getItem('userPhone');
  };

  // Load user dashboard data using existing API
  useEffect(() => {
    const initializeUserDashboard = async () => {
      const phoneNumber = getPhoneNumber();
      
      if (!phoneNumber) {
        setError('No phone number found. Please login again.');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading dashboard for phone:', phoneNumber);
        
        // Use the working dashboard API
        const response = await fetch(`http://localhost:4000/api/user/dashboard/${phoneNumber}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setDashboardData(data.data);
          console.log('✅ Dashboard data loaded:', data.data);
        } else {
          setError(data.message || 'Failed to load dashboard data');
          console.error('❌ Dashboard API failed:', data);
        }

      } catch (error) {
        setError('Failed to load your dashboard. Please try again.');
        console.error('❌ Dashboard initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeUserDashboard();
  }, [location.search]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userPhone');
    localStorage.clear(); // Clear all bundle-specific data
    navigate('/');
  };

  // Get status for a subscription
  const getSubscriptionStatus = (subscription) => {
    const now = new Date();
    
    if (subscription.status === 'active' && subscription.expiresAt) {
      const expiryDate = new Date(subscription.expiresAt);
      const daysUntilExpiry = differenceInDays(expiryDate, now);
      
      if (isAfter(now, expiryDate)) {
        return { color: 'text-red-600 bg-red-50', text: 'Expired', icon: FaExclamationTriangle };
      } else if (daysUntilExpiry <= 7) {
        return { color: 'text-yellow-600 bg-yellow-50', text: `Expires in ${daysUntilExpiry} days`, icon: FaClock };
      } else {
        return { color: 'text-green-600 bg-green-50', text: 'Active', icon: FaCheckCircle };
      }
    } else if (subscription.status === 'paid_not_joined') {
      return { color: 'text-orange-600 bg-orange-50', text: 'Payment Complete - Join Channels', icon: FaClock };
    } else if (subscription.status === 'expired') {
      return { color: 'text-red-600 bg-red-50', text: 'Expired', icon: FaExclamationTriangle };
    } else {
      return { color: 'text-gray-600 bg-gray-50', text: 'Unknown', icon: FaClock };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const allSubscriptions = [
    ...(dashboardData?.subscriptions?.active || []),
    ...(dashboardData?.subscriptions?.expired || []),
    ...(dashboardData?.subscriptions?.pending || [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Welcome back, {dashboardData?.user?.firstName || 'User'}!</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Subscriptions</h3>
            <p className="text-3xl font-bold text-green-600">
              {dashboardData?.summary?.activeCount || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Subscriptions</h3>
            <p className="text-3xl font-bold text-blue-600">
              {dashboardData?.summary?.totalSubscriptions || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Expired</h3>
            <p className="text-3xl font-bold text-red-600">
              {dashboardData?.summary?.expiredCount || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Spent</h3>
            <p className="text-3xl font-bold text-purple-600">
              ₹{dashboardData?.summary?.totalSpent || 0}
            </p>
          </div>
        </div>

        {allSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <FaExclamationTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Subscriptions</h3>
              <p className="text-gray-600 mb-6">
                You don't have any subscriptions at the moment.
              </p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Channel Bundles
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Your Subscriptions</h2>
            
            {allSubscriptions.map((subscription) => {
              const status = getSubscriptionStatus(subscription);
              const StatusIcon = status.icon;
              
              return (
                <div key={subscription.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Subscription Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        {subscription.channelBundle?.image && (
                          <img
                            src={subscription.channelBundle.image}
                            alt={subscription.channelBundle.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {subscription.channelBundle?.name || subscription.planName || 'Subscription'}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {subscription.channelBundle?.description || 'Channel Bundle Subscription'}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-500">
                              Amount: ₹{subscription.amount}
                            </span>
                            {subscription.expiresAt && (
                              <span className="text-sm text-gray-500">
                                Expires: {format(new Date(subscription.expiresAt), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {status.text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Details */}
                  <div className="p-6">
                    {/* Invite Links */}
                    {subscription.inviteLinks?.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">Channel Access Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subscription.inviteLinks.map((link, index) => (
                            <div key={link.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-1">
                                    {link.channelTitle || `Channel ${index + 1}`}
                                  </h5>
                                </div>
                                {link.isUsed ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <FaCheckCircle className="h-3 w-3 mr-1" />
                                    Used
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    Available
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <a
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
                                >
                                  <FaExternalLinkAlt className="h-4 w-4" />
                                  <span>Join Channel</span>
                                </a>
                                
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(link.link);
                                    alert('Link copied to clipboard!');
                                  }}
                                  className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm w-full justify-center"
                                >
                                  <FaEye className="h-4 w-4" />
                                  <span>Copy Link</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <FaExclamationTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                        <p className="text-gray-600 mb-4">No invite links available</p>
                        <p className="text-sm text-gray-500">Contact support if you need access to your channels</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboardFixed;
