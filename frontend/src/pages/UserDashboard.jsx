import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { FaExternalLinkAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaRedo, FaEye, FaSignOutAlt, FaLifeRing } from 'react-icons/fa';
import { format, isAfter, differenceInDays } from 'date-fns';
import ChannelRejoinManager from '../Component/User/ChannelRejoinManager';
import { getFormattedUserPhone } from '../utils/phoneUtils';

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [channelBundles, setChannelBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingBundle, setRefreshingBundle] = useState(null);
  const [showRejoinManager, setShowRejoinManager] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Get user phone from URL params or localStorage
  const getPhoneNumber = () => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('phone') || getFormattedUserPhone();
  };

  // Get user ID from phone number
  const getUserFromPhone = async (phone) => {
    try {
      const response = await api.get(`/public-user/by-phone/${phone}?autoCreate=true`);
      return response.data.user || response.data;
    } catch (error) {
      console.error('Error fetching user by phone:', error);
      throw error;
    }
  };

  // Fetch user's channel bundles
  const fetchChannelBundles = async (userId) => {
    try {
      const response = await api.get(`/channel-bundles/user/${userId}/channel-bundles`);
      return response.data.channelBundles || [];
    } catch (error) {
      console.error('Error fetching channel bundles:', error);
      throw error;
    }
  };

  // Fetch payment subscription status as a fallback indicator
  const fetchSubscriptionStatus = async (userId) => {
    try {
      const response = await api.get(`/payment/subscription-status/${userId}`);
      return response.data;
    } catch (error) {
      console.warn('Subscription status fetch failed (non-fatal):', error?.response?.data || error.message);
      return null;
    }
  };

  // Request link regeneration for a bundle
  const regenerateLinks = async (bundleId) => {
    if (!user) return;
    
    setRefreshingBundle(bundleId);
    try {
      await api.post(`/channel-bundles/user/${user._id}/channel-bundle/${bundleId}/regenerate-links`);
      
      // Refresh the channel bundles data
      const updatedBundles = await fetchChannelBundles(user._id);
      setChannelBundles(updatedBundles);
      
      alert('✅ Channel links have been regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating links:', error);
      alert('❌ Failed to regenerate links. Please try again or contact support.');
    } finally {
      setRefreshingBundle(null);
    }
  };

  // Load user data and channel bundles
  useEffect(() => {
    const initializeUserDashboard = async () => {
      const phoneNumber = getPhoneNumber();
      
      if (!phoneNumber) {
        setError('No phone number found. Please login again.');
        setLoading(false);
        return;
      }

      try {
        // Get user details
        const userData = await getUserFromPhone(phoneNumber);
        setUser(userData);

        // Get user's channel bundles (non-fatal on failure)
        try {
          const userId = userData._id || userData.id;
          const bundles = userId ? await fetchChannelBundles(userId) : [];
          setChannelBundles(bundles);
          // Also check backend subscription status and store
          if (userId) {
            const status = await fetchSubscriptionStatus(userId);
            setSubscriptionStatus(status);
          }
        } catch (bundleError) {
          console.error('Error loading channel bundles:', bundleError);
          setChannelBundles([]);
        }

      } catch (error) {
        setError('Failed to load your dashboard. Please try again.');
        console.error('Dashboard initialization error:', error);
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

  // Get status color and text for channels
  const getChannelStatus = (bundle) => {
    const now = new Date();
    const expiryDate = new Date(bundle.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, now);

    if (isAfter(now, expiryDate)) {
      return { color: 'text-red-600 bg-red-50', text: 'Expired', icon: FaExclamationTriangle };
    } else if (daysUntilExpiry <= 7) {
      return { color: 'text-yellow-600 bg-yellow-50', text: `Expires in ${daysUntilExpiry} days`, icon: FaClock };
    } else {
      return { color: 'text-green-600 bg-green-50', text: 'Active', icon: FaCheckCircle };
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Channel Access</h1>
              <p className="text-gray-600">Welcome back, {user?.firstName || 'User'}!</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowRejoinManager(true)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-2 rounded-lg"
              >
                <FaLifeRing />
                <span>Rejoin Channels</span>
              </button>
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
        {channelBundles.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <FaExclamationTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Subscriptions</h3>
              <p className="text-gray-600 mb-6">
                You don't have any active channel subscriptions at the moment.
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
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Active Subscriptions</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {(() => {
                    const uiCount = channelBundles.filter(b => b.isActive).length;
                    // If UI count is 0 but backend says active, show 1 as a fallback
                    if (uiCount === 0 && subscriptionStatus?.hasActiveSubscription) return 1;
                    return uiCount;
                  })()}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Channels</h3>
                <p className="text-3xl font-bold text-green-600">
                  {channelBundles.reduce((total, bundle) => total + bundle.channelBundle.channelCount, 0)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Expiring Soon</h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {channelBundles.filter(b => {
                    const daysUntilExpiry = differenceInDays(new Date(b.expiryDate), new Date());
                    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                  }).length}
                </p>
              </div>
            </div>

            {/* Channel Bundles */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Your Channel Bundles</h2>
              {subscriptionStatus?.hasActiveSubscription && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 mb-2">
                  ✅ Your subscription is active. If items below still show expired, they will refresh soon.
                </div>
              )}
              
              {channelBundles.map((bundle) => {
                const status = getChannelStatus(bundle);
                const StatusIcon = status.icon;
                
                return (
                  <div key={bundle.paymentId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Bundle Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          {bundle.channelBundle.image && (
                            <img
                              src={bundle.channelBundle.image}
                              alt={bundle.channelBundle.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {bundle.channelBundle.name}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              {bundle.channelBundle.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-500">
                                {bundle.channelBundle.channelCount} Channels
                              </span>
                              <span className="text-sm text-gray-500">
                                Expires: {format(new Date(bundle.expiryDate), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {status.text}
                          </div>
                          <button
                            onClick={() => regenerateLinks(bundle.channelBundle.id)}
                            disabled={refreshingBundle === bundle.channelBundle.id}
                            className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 text-sm"
                          >
                            {refreshingBundle === bundle.channelBundle.id ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span>Refreshing...</span>
                              </>
                            ) : (
                              <>
                                <FaRedo className="h-4 w-4" />
                                <span>Refresh Links</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Channel Links */}
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Channel Access Links</h4>
                      
                      {bundle.inviteLinks.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <FaExclamationTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                          <p className="text-gray-600 mb-4">No active invite links available</p>
                          <button
                            onClick={() => regenerateLinks(bundle.channelBundle.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Generate Links
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bundle.inviteLinks.map((link, index) => (
                            <div key={link.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-1">
                                    {link.channelTitle || `Channel ${index + 1}`}
                                  </h5>
                                  <p className="text-xs text-gray-500">
                                    Expires: {format(new Date(link.expiresAt), 'MMM dd, HH:mm')}
                                  </p>
                                </div>
                                {link.isUsed ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <FaCheckCircle className="h-3 w-3 mr-1" />
                                    Joined
                                  </span>
                                ) : new Date(link.expiresAt) < new Date() ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    Active
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <a
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
                                  disabled={link.isUsed || new Date(link.expiresAt) < new Date()}
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Channel Rejoin Manager Modal */}
      {showRejoinManager && (
        <ChannelRejoinManager
          userPhone={getPhoneNumber()}
          onClose={() => setShowRejoinManager(false)}
        />
      )}
    </div>
  );
};

export default UserDashboard;