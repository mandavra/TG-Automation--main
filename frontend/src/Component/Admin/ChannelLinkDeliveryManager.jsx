import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaClock, 
  FaRedo, 
  FaPlay, 
  FaEye,
  FaUserCheck,
  FaBolt
} from 'react-icons/fa';
import { format } from 'date-fns';

const ChannelLinkDeliveryManager = () => {
  const [payments, setPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    limit: 50
  });

  // Load initial data
  useEffect(() => {
    loadPaymentsRequiringVerification();
    loadDeliveryStatistics();
  }, []);

  // Load payments requiring verification
  const loadPaymentsRequiringVerification = async (customFilters = {}) => {
    try {
      setLoading(true);
      const queryFilters = { ...filters, ...customFilters };
      
      const queryString = Object.entries(queryFilters)
        .filter(([_, value]) => value && value !== '')
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const response = await axios.get(
        `http://localhost:4000/api/channel-delivery/admin/payments/requiring-verification?${queryString}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      alert('Failed to load payments requiring verification');
    } finally {
      setLoading(false);
    }
  };

  // Load delivery statistics
  const loadDeliveryStatistics = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/channel-delivery/admin/statistics',
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

  // Handle individual payment verification
  const handleVerifyPayment = async (payment) => {
    if (!payment.user?.id) {
      alert('User information not available for this payment');
      return;
    }

    try {
      setProcessing(payment.id);
      
      const response = await axios.post(
        `http://localhost:4000/api/channel-delivery/admin/deliver/${payment.user.id}/${payment.id}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        await loadPaymentsRequiringVerification();
        await loadDeliveryStatistics();
      } else {
        alert(`❌ ${response.data.message || response.data.error}`);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Handle bulk verification
  const handleBulkVerification = async () => {
    if (selectedPayments.size === 0) {
      alert('Please select at least one payment to process');
      return;
    }

    if (!confirm(`Are you sure you want to verify and deliver links for ${selectedPayments.size} selected payments?`)) {
      return;
    }

    try {
      setProcessing('bulk');
      
      const response = await axios.post(
        'http://localhost:4000/api/channel-delivery/admin/bulk-verify-deliver',
        {
          paymentIds: Array.from(selectedPayments),
          delay: 300 // 300ms delay between operations
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const { result } = response.data;
        alert(`✅ Bulk processing completed!\n\n` +
              `✓ Completed: ${result.completed}\n` +
              `❌ Failed: ${result.failed}\n` +
              `⚪ Already Complete: ${result.alreadyComplete}`);
        
        setSelectedPayments(new Set());
        await loadPaymentsRequiringVerification();
        await loadDeliveryStatistics();
      } else {
        alert(`❌ ${response.data.message || response.data.error}`);
      }
    } catch (error) {
      console.error('Error in bulk verification:', error);
      alert('Bulk verification failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Handle auto-verify recent payments
  const handleAutoVerifyRecent = async () => {
    if (!confirm('This will auto-verify all payments from the last 24 hours. Continue?')) {
      return;
    }

    try {
      setProcessing('auto');
      
      const response = await axios.post(
        'http://localhost:4000/api/channel-delivery/admin/auto-verify-recent',
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        if (response.data.processed === 0) {
          alert('✅ No recent payments requiring verification found');
        } else {
          const { result } = response.data;
          alert(`✅ Auto-verification completed!\n\n` +
                `✓ Completed: ${result.completed}\n` +
                `❌ Failed: ${result.failed}\n` +
                `⚪ Already Complete: ${result.alreadyComplete}`);
        }
        
        await loadPaymentsRequiringVerification();
        await loadDeliveryStatistics();
      } else {
        alert(`❌ ${response.data.message || response.data.error}`);
      }
    } catch (error) {
      console.error('Error in auto-verification:', error);
      alert('Auto-verification failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Toggle payment selection
  const togglePaymentSelection = (paymentId) => {
    const newSelection = new Set(selectedPayments);
    if (newSelection.has(paymentId)) {
      newSelection.delete(paymentId);
    } else {
      newSelection.add(paymentId);
    }
    setSelectedPayments(newSelection);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedPayments.size === payments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(payments.map(p => p.id)));
    }
  };

  // Get status badge
  const getStatusBadge = (payment) => {
    const status = payment.deliveryStatus || 'pending';
    
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaExclamationTriangle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FaClock className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaClock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Channel Link Delivery Management</h2>
          <p className="text-gray-600 mt-1">Monitor and manage channel link delivery for successful payments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAutoVerifyRecent}
            disabled={processing === 'auto'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing === 'auto' ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Auto-Verifying...
              </>
            ) : (
              <>
                <FaBolt className="w-4 h-4 mr-2" />
                Auto-Verify Recent
              </>
            )}
          </button>
          <button
            onClick={() => {
              loadPaymentsRequiringVerification();
              loadDeliveryStatistics();
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalSuccessfulPayments}</p>
              </div>
              <FaUserCheck className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Links Delivered</p>
                <p className="text-2xl font-bold text-green-600">{statistics.deliveredPayments}</p>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Deliveries</p>
                <p className="text-2xl font-bold text-red-600">{statistics.failedDeliveries}</p>
              </div>
              <FaExclamationTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.deliveryRate}%</p>
              </div>
              <div className="h-8 w-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                %
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({...filters, limit: parseInt(e.target.value)})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button
            onClick={() => loadPaymentsRequiringVerification()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({ dateFrom: '', dateTo: '', limit: 50 });
              loadPaymentsRequiringVerification({ dateFrom: '', dateTo: '', limit: 50 });
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {payments.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedPayments.size === payments.length && payments.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Select All ({selectedPayments.size} selected)
                </span>
              </label>
            </div>
            <button
              onClick={handleBulkVerification}
              disabled={selectedPayments.size === 0 || processing === 'bulk'}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing === 'bulk' ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FaPlay className="w-4 h-4 mr-2" />
                  Bulk Verify ({selectedPayments.size})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No payments requiring link delivery verification at the moment.</p>
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
                    User & Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel Bundle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id)}
                        onChange={() => togglePaymentSelection(payment.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.user?.phone || 'No phone'}
                        </div>
                        <div className="text-xs text-gray-400">
                          ₹{payment.amount} • {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.channelBundle?.name || 'Unknown Bundle'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.channelBundle?.channelCount || 0} channels
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment)}
                      {payment.failureReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={payment.failureReason}>
                          {payment.failureReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.deliveryAttempts || 0}
                      {payment.lastDeliveryAttempt && (
                        <div className="text-xs text-gray-400">
                          Last: {format(new Date(payment.lastDeliveryAttempt), 'MMM dd, HH:mm')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleVerifyPayment(payment)}
                          disabled={processing === payment.id || !payment.user?.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === payment.id ? (
                            <>
                              <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                              Processing
                            </>
                          ) : (
                            <>
                              <FaPlay className="w-3 h-3 mr-1" />
                              Verify & Deliver
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

export default ChannelLinkDeliveryManager;