import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Eye,
  Download,
  Filter,
  Search,
  MoreVertical,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Activity
} from 'lucide-react';
import axios from 'axios';

const PaymentRecoveryManager = () => {
  const [recoveryStats, setRecoveryStats] = useState(null);
  const [failedDeliveries, setFailedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadRecoveryData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRecoveryData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRecoveryData = async () => {
    try {
      const [statsResponse, deliveriesResponse] = await Promise.all([
        axios.get('/api/payment-recovery/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/payment-recovery/failed-deliveries', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setRecoveryStats(statsResponse.data.data);
      setFailedDeliveries(deliveriesResponse.data.data);
    } catch (error) {
      console.error('Error loading recovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAllFailedDeliveries = async () => {
    setProcessing(true);
    try {
      const response = await axios.post('/api/payment-recovery/process-failed', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(`Recovery completed: ${response.data.data.success} successful, ${response.data.data.failed} failed`);
      await loadRecoveryData();
    } catch (error) {
      console.error('Error processing failed deliveries:', error);
      alert('Error processing failed deliveries');
    } finally {
      setProcessing(false);
    }
  };

  const recoverSpecificPayment = async (paymentId) => {
    try {
      const response = await axios.post(`/api/payment-recovery/recover/${paymentId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        alert('Payment recovered successfully');
        await loadRecoveryData();
      } else {
        alert('Failed to recover payment: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error recovering payment:', error);
      alert('Error recovering payment');
    }
  };

  const bulkRecoverPayments = async () => {
    if (selectedPayments.length === 0) {
      alert('Please select payments to recover');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post('/api/payment-recovery/bulk-recovery', {
        paymentIds: selectedPayments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(`Bulk recovery completed: ${response.data.data.success} successful, ${response.data.data.failed} failed`);
      setSelectedPayments([]);
      await loadRecoveryData();
    } catch (error) {
      console.error('Error in bulk recovery:', error);
      alert('Error in bulk recovery');
    } finally {
      setProcessing(false);
    }
  };

  const filteredDeliveries = failedDeliveries.filter(delivery => {
    const matchesSearch = delivery.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.user.phone?.includes(searchTerm);

    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'failed' && delivery.deliveryStatus === 'failed') ||
                         (filterStatus === 'pending' && !delivery.deliveryStatus);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading recovery data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Recovery Manager</h2>
          <p className="text-gray-600">Monitor and recover failed payment deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadRecoveryData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
          <button
            onClick={processAllFailedDeliveries}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={16} />
            {processing ? 'Processing...' : 'Process All Failed'}
          </button>
        </div>
      </div>

      {/* Recovery Statistics */}
      {recoveryStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Successful Payments</p>
                <p className="text-2xl font-bold text-blue-600">{recoveryStats.totalSuccessfulPayments}</p>
              </div>
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successfully Delivered</p>
                <p className="text-2xl font-bold text-green-600">{recoveryStats.deliveredPayments}</p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Deliveries</p>
                <p className="text-2xl font-bold text-red-600">{recoveryStats.failedDeliveries}</p>
              </div>
              <XCircle className="text-red-600" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recovered Payments</p>
                <p className="text-2xl font-bold text-purple-600">{recoveryStats.recoveredPayments}</p>
              </div>
              <Activity className="text-purple-600" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{recoveryStats.deliverySuccessRate}%</p>
              </div>
              <CheckCircle className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Failed Deliveries</h3>
          {selectedPayments.length > 0 && (
            <button
              onClick={bulkRecoverPayments}
              disabled={processing}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Recover Selected ({selectedPayments.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by user name, plan, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Failed Deliveries Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPayments(filteredDeliveries.map(d => d._id));
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                    checked={selectedPayments.length === filteredDeliveries.length && filteredDeliveries.length > 0}
                  />
                </th>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Payment Date</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Attempts</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-8 text-gray-500">
                    {failedDeliveries.length === 0 ? 'No failed deliveries found' : 'No deliveries match your filters'}
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(delivery._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayments([...selectedPayments, delivery._id]);
                          } else {
                            setSelectedPayments(selectedPayments.filter(id => id !== delivery._id));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <div className="font-medium">{delivery.user.name}</div>
                          <div className="text-sm text-gray-500">{delivery.user.phone}</div>
                          {delivery.user.telegramId && (
                            <div className="text-xs text-blue-600">TG: {delivery.user.telegramId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{delivery.planName}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-green-600">₹{delivery.amount}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        {new Date(delivery.paymentDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        delivery.deliveryStatus === 'failed' 
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {delivery.deliveryStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm">{delivery.deliveryAttempts || 0}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => recoverSpecificPayment(delivery._id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
                        >
                          <RefreshCw size={12} />
                          Recover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecoveryManager;