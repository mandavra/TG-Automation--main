import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaExternalLinkAlt, 
  FaRedo,
  FaInfoCircle,
  FaClock,
  FaShieldAlt
} from 'react-icons/fa';
import { format } from 'date-fns';

const ChannelRejoinManager = ({ userPhone, onClose }) => {
  const [rejoinOptions, setRejoinOptions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userPhone) {
      loadRejoinOptions();
    }
  }, [userPhone]);

  const loadRejoinOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `http://localhost:4000/api/channel-membership/user/${userPhone}/rejoin-options`
      );

      if (response.data.success) {
        setUser(response.data.user);
        setRejoinOptions(response.data.rejoinOptions || []);
      } else {
        setError(response.data.message || 'Failed to load rejoin options');
      }
    } catch (error) {
      console.error('Error loading rejoin options:', error);
      setError('Unable to load rejoin options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejoinChannel = async (option) => {
    if (!user) return;

    try {
      setProcessing(option.channelId);
      
      const response = await axios.post(
        `http://localhost:4000/api/channel-membership/user/${user.id}/rejoin/${option.channelId}`,
        { reason: 'user_request' }
      );

      if (response.data.success) {
        const { code, recovery } = response.data;
        
        if (code === 'EXISTING_RECOVERY_AVAILABLE') {
          alert(`✅ Recovery link already available!\n\nClick the link below to rejoin:\n${response.data.recoveryLink.link}`);
        } else if (code === 'NEW_RECOVERY_GENERATED') {
          alert(`✅ New recovery link generated!\n\nClick the link below to rejoin:\n${recovery.recoveryLink.link}\n\nThis link expires in ${recovery.recoveryLink.expiresIn || '7 days'}.`);
        }
        
        // Reload options to reflect changes
        await loadRejoinOptions();
      } else {
        alert(`❌ ${response.data.error || response.data.message}`);
      }
    } catch (error) {
      console.error('Error requesting rejoin:', error);
      alert('Failed to generate rejoin link. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (option) => {
    switch (option.currentStatus) {
      case 'invited_not_joined':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FaInfoCircle className="w-3 h-3 mr-1" />
            Link Available
          </span>
        );
      case 'unknown':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaExclamationTriangle className="w-3 h-3 mr-1" />
            May Have Left
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <FaClock className="w-3 h-3 mr-1" />
            {option.currentStatus}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking your channel access...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Channel Access Recovery</h2>
              <p className="text-blue-100 mt-1">Rejoin channels you may have accidentally left</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {error ? (
            <div className="text-center py-8">
              <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadRejoinOptions}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : rejoinOptions.length === 0 ? (
            <div className="text-center py-8">
              <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Good! 🎉</h3>
              <p className="text-gray-600">
                You're currently a member of all your subscribed channels. No recovery needed!
              </p>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaInfoCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Accidentally left a channel?
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Don't worry! You can generate a new invite link to rejoin any channel 
                        you have an active subscription for. The recovery link will be valid for 7 days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <FaShieldAlt className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejoin Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Channels Available for Recovery ({rejoinOptions.length})
                </h3>
                
                {rejoinOptions.map((option) => (
                  <div key={option.channelId} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {option.channelTitle || `Channel ${option.channelId}`}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span>Plan: {option.lastSubscription?.planName || 'Unknown'}</span>
                          <span>•</span>
                          <span>Bundle: {option.lastSubscription?.bundleName || 'Unknown'}</span>
                        </div>
                        {option.lastSubscription?.expiresAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Subscription expires: {format(new Date(option.lastSubscription.expiresAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {getStatusBadge(option)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {option.hasRecoveryLinks ? (
                          <span className="text-green-600 flex items-center">
                            <FaCheckCircle className="w-3 h-3 mr-1" />
                            Recovery link available
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            No active recovery links
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleRejoinChannel(option)}
                        disabled={processing === option.channelId}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                      >
                        {processing === option.channelId ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <FaRedo className="w-4 h-4 mr-2" />
                            {option.hasRecoveryLinks ? 'Get Recovery Link' : 'Generate Recovery Link'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click "Generate Recovery Link" for any channel you want to rejoin</li>
                  <li>• A new invite link will be created specifically for you</li>
                  <li>• Click the link to rejoin the channel immediately</li>
                  <li>• Recovery links expire in 7 days for security</li>
                  <li>• You can only rejoin channels with active paid subscriptions</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelRejoinManager;