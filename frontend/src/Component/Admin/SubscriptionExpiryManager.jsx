import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaClock, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaBell, 
  FaCalendarPlus,
  FaUsers,
  FaDollarSign,
  FaRedo,
  FaEnvelope,
  FaCalendarTimes
} from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

const SubscriptionExpiryManager = () => {
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState(new Set());
  const [activeTab, setActiveTab] = useState('expiring');
  const [daysFilter, setDaysFilter] = useState(7);

  // Load initial data
  useEffect(() => {
    loadExpiringSubscriptions();
    loadStatistics();
    loadRenewalRecommendations();
  }, [daysFilter]);

  // Load expiring subscriptions
  const loadExpiringSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/subscription-expiry/admin/expiring?days=${daysFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setExpiringSubscriptions(response.data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error loading expiring subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/subscription-expiry/admin/statistics',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Load renewal recommendations
  const loadRenewalRecommendations = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/subscription-expiry/admin/renewal-recommendations',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error loading renewal recommendations:', error);
    }
  };

  // Send expiry notification
  const handleSendNotification = async (subscription, notificationType = 'reminder') => {
    try {
      setProcessing(`notify-${subscription.id}`);
      
      const response = await axios.post(
        `http://localhost:4000/api/subscription-expiry/admin/send-notification/${subscription.id}`,
        { notificationType },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Notification sent to ${subscription.user?.phone || 'user'}`);
      } else {
        alert(`❌ Failed to send notification: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setProcessing(null);
    }
  };

  // Process bulk notifications
  const handleBulkNotifications = async () => {
    if (selectedSubscriptions.size === 0) {
      alert('Please select subscriptions to send notifications');
      return;
    }

    if (!confirm(`Send expiry reminder notifications to ${selectedSubscriptions.size} users?`)) {
      return;
    }

    try {
      setProcessing('bulk-notify');
      
      const response = await axios.post(
        'http://localhost:4000/api/subscription-expiry/admin/process-notifications',
        {
          daysAhead: [daysFilter],
          batchSize: 20,
          delay: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const { results } = response.data;
        alert(`✅ Bulk notifications completed!\n\n` +
              `📧 Notifications sent: ${results.notificationsSent}\n` +
              `❌ Errors: ${results.errors}\n` +
              `📊 Total processed: ${results.processed}`);
        setSelectedSubscriptions(new Set());
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error processing bulk notifications:', error);
      alert('Bulk notification processing failed');
    } finally {
      setProcessing(null);
    }
  };

  // Extend subscription
  const handleExtendSubscription = async (subscription) => {
    const additionalDays = prompt('How many days would you like to extend this subscription?', '30');
    
    if (!additionalDays || isNaN(additionalDays) || additionalDays <= 0) {
      return;
    }

    const reason = prompt('Reason for extension (optional):', 'Admin extension');

    try {
      setProcessing(`extend-${subscription.id}`);
      
      const response = await axios.post(
        `http://localhost:4000/api/subscription-expiry/admin/extend/${subscription.id}`,
        {
          additionalDays: parseInt(additionalDays),
          reason: reason || 'Admin extension'
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Subscription extended by ${additionalDays} days!\nNew expiry: ${format(new Date(response.data.newExpiryDate), 'MMM dd, yyyy')}`);
        await loadExpiringSubscriptions();
        await loadStatistics();
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
      alert('Failed to extend subscription');
    } finally {
      setProcessing(null);
    }
  };

  // Bulk extend subscriptions
  const handleBulkExtend = async () => {
    if (selectedSubscriptions.size === 0) {
      alert('Please select subscriptions to extend');
      return;
    }

    const additionalDays = prompt(`How many days to extend ${selectedSubscriptions.size} selected subscriptions?`, '30');
    
    if (!additionalDays || isNaN(additionalDays) || additionalDays <= 0) {
      return;
    }

    const reason = prompt('Reason for bulk extension:', 'Bulk admin extension');

    if (!confirm(`Extend ${selectedSubscriptions.size} subscriptions by ${additionalDays} days?`)) {
      return;
    }

    try {
      setProcessing('bulk-extend');
      
      const response = await axios.post(
        'http://localhost:4000/api/subscription-expiry/admin/bulk-extend',
        {
          subscriptionIds: Array.from(selectedSubscriptions),
          additionalDays: parseInt(additionalDays),
          reason: reason || 'Bulk admin extension'
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const { results } = response.data;
        alert(`✅ Bulk extension completed!\n\n` +
              `✓ Successful: ${results.successful}\n` +
              `❌ Failed: ${results.failed}`);
        setSelectedSubscriptions(new Set());
        await loadExpiringSubscriptions();
        await loadStatistics();
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error in bulk extension:', error);
      alert('Bulk extension failed');
    } finally {
      setProcessing(null);
    }
  };

  // Toggle subscription selection
  const toggleSubscriptionSelection = (subscriptionId) => {
    const newSelection = new Set(selectedSubscriptions);
    if (newSelection.has(subscriptionId)) {
      newSelection.delete(subscriptionId);
    } else {
      newSelection.add(subscriptionId);
    }
    setSelectedSubscriptions(newSelection);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedSubscriptions.size === expiringSubscriptions.length) {
      setSelectedSubscriptions(new Set());
    } else {
      setSelectedSubscriptions(new Set(expiringSubscriptions.map(s => s.id)));
    }
  };

  // Get urgency badge
  const getUrgencyBadge = (subscription) => {
    const { urgencyLevel, daysUntilExpiry } = subscription;
    
    switch (urgencyLevel) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaExclamationTriangle className="w-3 h-3 mr-1" />
            {daysUntilExpiry <= 0 ? 'Expired' : 'Today'}
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <FaClock className="w-3 h-3 mr-1" />
            {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaClock className="w-3 h-3 mr-1" />
            {daysUntilExpiry} days
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FaClock className="w-3 h-3 mr-1" />
            {daysUntilExpiry} days
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Expiry Management</h2>
          <p className="text-gray-600 mt-1">Monitor expiring subscriptions and manage renewals</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Expires in 1 day</option>
            <option value={3}>Expires in 3 days</option>
            <option value={7}>Expires in 7 days</option>
            <option value={14}>Expires in 14 days</option>
            <option value={30}>Expires in 30 days</option>
          </select>
          <button
            onClick={() => {
              loadExpiringSubscriptions();
              loadStatistics();
              loadRenewalRecommendations();
            }}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FaRedo className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expires Today</p>
                <p className="text-2xl font-bold text-red-600">{statistics.expiresToday}</p>
              </div>
              <FaCalendarTimes className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expires This Week</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.expiresThisWeek}</p>
              </div>
              <FaClock className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalActive}</p>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Renewal Opportunities</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.renewalOpportunities}</p>
              </div>
              <FaDollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Renewal Recommendations */}
      {recommendations && recommendations.highPriority.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">🎯 High Priority Renewals</h3>
              <p className="text-blue-700 text-sm">Potential revenue: ₹{recommendations.potentialRevenue.toLocaleString()}</p>
            </div>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {recommendations.highPriority.length} opportunities
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.highPriority.slice(0, 6).map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.planName}</p>
                    <p className="text-sm text-gray-600">{item.user}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {item.daysLeft} day{item.daysLeft !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-blue-600 font-medium">₹{item.potentialRevenue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {expiringSubscriptions.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSubscriptions.size === expiringSubscriptions.length && expiringSubscriptions.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Select All ({selectedSubscriptions.size} selected)
                </span>
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkNotifications}
                disabled={selectedSubscriptions.size === 0 || processing === 'bulk-notify'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing === 'bulk-notify' ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="w-4 h-4 mr-2" />
                    Send Reminders ({selectedSubscriptions.size})
                  </>
                )}
              </button>
              <button
                onClick={handleBulkExtend}
                disabled={selectedSubscriptions.size === 0 || processing === 'bulk-extend'}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing === 'bulk-extend' ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Extending...
                  </>
                ) : (
                  <>
                    <FaCalendarPlus className="w-4 h-4 mr-2" />
                    Bulk Extend ({selectedSubscriptions.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading expiring subscriptions...</p>
          </div>
        ) : expiringSubscriptions.length === 0 ? (
          <div className="p-8 text-center">
            <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Expiring Subscriptions</h3>
            <p className="text-gray-600">No subscriptions expiring in the next {daysFilter} days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User & Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel Bundle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expiringSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubscriptions.has(subscription.id)}
                        onChange={() => toggleSubscriptionSelection(subscription.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subscription.user?.phone} • {subscription.user?.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          {subscription.planName} • ₹{subscription.amount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.channelBundle?.name || 'Unknown Bundle'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {subscription.channelBundle?.channelCount || 0} channels
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUrgencyBadge(subscription)}
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(subscription.expiryDate), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSendNotification(subscription)}
                          disabled={processing === `notify-${subscription.id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                        >
                          {processing === `notify-${subscription.id}` ? (
                            <>
                              <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                              Sending
                            </>
                          ) : (
                            <>
                              <FaBell className="w-3 h-3 mr-1" />
                              Notify
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleExtendSubscription(subscription)}
                          disabled={processing === `extend-${subscription.id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-600 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                        >
                          {processing === `extend-${subscription.id}` ? (
                            <>
                              <div className="animate-spin w-3 h-3 border border-green-600 border-t-transparent rounded-full mr-1"></div>
                              Extending
                            </>
                          ) : (
                            <>
                              <FaCalendarPlus className="w-3 h-3 mr-1" />
                              Extend
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionExpiryManager;