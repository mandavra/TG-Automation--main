import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaUsers, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaChartLine,
  FaRedo,
  FaExternalLinkAlt,
  FaClock,
  FaUserMinus,
  FaLifeRing
} from 'react-icons/fa';
import { format, formatDistanceToNow } from 'date-fns';

const ChannelMembershipMonitor = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recentLeavers, setRecentLeavers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [timeframe, setTimeframe] = useState(24);

  useEffect(() => {
    loadAnalytics();
    loadRecentLeavers();
  }, [timeframe]);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/channel-membership/admin/analytics',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadRecentLeavers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/channel-membership/admin/recent-leavers?hours=${timeframe}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setRecentLeavers(response.data.recentLeavers || []);
      }
    } catch (error) {
      console.error('Error loading recent leavers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecoveryLink = async (userId, channelId, userName) => {
    if (!confirm(`Generate recovery link for ${userName} to rejoin the channel?`)) {
      return;
    }

    try {
      setProcessing(`${userId}-${channelId}`);
      
      const response = await axios.post(
        `http://localhost:4000/api/channel-membership/admin/generate-recovery/${userId}/${channelId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Recovery link generated successfully!\n\nLink: ${response.data.recoveryLink?.link || 'Generated'}\nExpires: ${response.data.expiresIn || '7 days'}`);
        await loadRecentLeavers(); // Refresh the list
      } else {
        alert(`❌ Failed to generate recovery link: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error generating recovery link:', error);
      alert('Failed to generate recovery link. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkMembershipCheck = async () => {
    if (recentLeavers.length === 0) {
      alert('No recent leavers to check');
      return;
    }

    try {
      setProcessing('bulk-check');
      
      const userChannelPairs = recentLeavers.map(leaver => ({
        userId: leaver.userId,
        channelId: leaver.channelId
      }));

      const response = await axios.post(
        'http://localhost:4000/api/channel-membership/admin/bulk-check',
        { userChannelPairs },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Bulk membership check completed!\n\nChecked: ${response.data.checkedCount} user-channel pairs\n\nResults will be processed and updated shortly.`);
      } else {
        alert(`❌ Bulk check failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error in bulk membership check:', error);
      alert('Bulk membership check failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getLeaveReasonBadge = (reason) => {
    switch (reason) {
      case 'left':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaUserMinus className="w-3 h-3 mr-1" />
            Left Voluntarily
          </span>
        );
      case 'kicked':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaExclamationTriangle className="w-3 h-3 mr-1" />
            Kicked
          </span>
        );
      case 'banned':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <FaExclamationTriangle className="w-3 h-3 mr-1" />
            Banned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Channel Membership Monitor</h2>
          <p className="text-gray-600 mt-1">Track channel membership and handle user recovery</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button
            onClick={() => {
              loadAnalytics();
              loadRecentLeavers();
            }}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FaRedo className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('leavers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leavers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent Leavers
          </button>
        </nav>
      </div>

      {activeTab === 'analytics' && (
        <>
          {/* Analytics Summary */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Channels</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalChannels}</p>
                  </div>
                  <FaUsers className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Invites</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalInvites}</p>
                  </div>
                  <FaExternalLinkAlt className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Users Joined</p>
                    <p className="text-2xl font-bold text-green-600">{analytics.summary.totalJoined}</p>
                  </div>
                  <FaCheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Join Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics.summary.overallJoinRate}%</p>
                  </div>
                  <FaChartLine className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </div>
          )}

          {/* Channel Breakdown */}
          {analytics && analytics.channelBreakdown && (
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Channel Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Invites
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expired
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Join Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.channelBreakdown.map((channel) => (
                      <tr key={channel._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {channel.channelTitle || `Channel ${channel._id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {channel._id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {channel.totalInvites}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {channel.usedInvites}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {channel.expiredInvites}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {channel.joinRate.toFixed(1)}%
                            </div>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, channel.joinRate)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'leavers' && (
        <>
          {/* Bulk Actions */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  Recent Leavers ({recentLeavers.length})
                </h3>
                <p className="text-sm text-gray-600">
                  Users who left channels in the last {timeframe} hours
                </p>
              </div>
              <button
                onClick={handleBulkMembershipCheck}
                disabled={processing === 'bulk-check' || recentLeavers.length === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing === 'bulk-check' ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <FaUsers className="w-4 h-4 mr-2" />
                    Bulk Check Status
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Leavers Table */}
          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading recent leavers...</p>
              </div>
            ) : recentLeavers.length === 0 ? (
              <div className="p-8 text-center">
                <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Leavers</h3>
                <p className="text-gray-600">No users have left channels in the last {timeframe} hours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User & Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recovery Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentLeavers.map((leaver) => (
                      <tr key={`${leaver.userId}-${leaver.channelId}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {leaver.userName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {leaver.userPhone || 'No phone'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Channel: {leaver.channelTitle}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {getLeaveReasonBadge(leaver.reason)}
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(leaver.leftAt))} ago
                            </div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(leaver.leftAt), 'MMM dd, HH:mm')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {leaver.hasActiveSubscription ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaCheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FaExclamationTriangle className="w-3 h-3 mr-1" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {leaver.recoveryGenerated ? (
                              <>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <FaLifeRing className="w-3 h-3 mr-1" />
                                  Generated
                                </span>
                                {leaver.recoveryUsed && (
                                  <div className="text-xs text-green-600 mt-1">
                                    ✓ Used
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Not generated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleGenerateRecoveryLink(
                              leaver.userId,
                              leaver.channelId,
                              leaver.userName
                            )}
                            disabled={
                              processing === `${leaver.userId}-${leaver.channelId}` ||
                              !leaver.hasActiveSubscription
                            }
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing === `${leaver.userId}-${leaver.channelId}` ? (
                              <>
                                <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                                Generating
                              </>
                            ) : (
                              <>
                                <FaLifeRing className="w-3 h-3 mr-1" />
                                Generate Recovery
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChannelMembershipMonitor;