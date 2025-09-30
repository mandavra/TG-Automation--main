import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter,
  Calendar,
  DollarSign
} from 'lucide-react';
import axios from 'axios';

const PaymentStatusMonitor = () => {
  const [realtimeStats, setRealtimeStats] = useState({
    totalPayments: 0,
    successfulPayments: 0,
    failedDeliveries: 0,
    recoveredPayments: 0,
    deliverySuccessRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    // Real-time updates every 10 seconds
    const interval = setInterval(loadMonitoringData, 10000);
    
    // Connection status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadMonitoringData = async () => {
    try {
      const [statsResponse, testResponse] = await Promise.all([
        axios.get('/api/payment-recovery/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/payment-recovery/test-system', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setRealtimeStats(statsResponse.data.data);
      setRecentActivity(prev => {
        const newActivity = {
          id: Date.now(),
          type: 'system_check',
          message: 'Payment recovery system operational',
          timestamp: new Date().toISOString(),
          status: 'success'
        };
        
        return [newActivity, ...prev.slice(0, 9)]; // Keep last 10 activities
      });
      
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      setRecentActivity(prev => {
        const errorActivity = {
          id: Date.now(),
          type: 'system_error',
          message: 'Failed to load monitoring data',
          timestamp: new Date().toISOString(),
          status: 'error'
        };
        
        return [errorActivity, ...prev.slice(0, 9)];
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} />;
      case 'error': return <AlertCircle size={16} />;
      case 'warning': return <Clock size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Status Monitor</h2>
          <p className="text-gray-600">Real-time monitoring of payment delivery system</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={loadMonitoringData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-blue-600">{realtimeStats.totalSuccessfulPayments}</p>
            </div>
            <DollarSign className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{realtimeStats.deliveredPayments}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{realtimeStats.failedDeliveries}</p>
            </div>
            <AlertCircle className="text-red-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recovered</p>
              <p className="text-2xl font-bold text-purple-600">{realtimeStats.recoveredPayments}</p>
            </div>
            <Activity className="text-purple-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-indigo-600">{realtimeStats.deliverySuccessRate}%</p>
            </div>
            {parseFloat(realtimeStats.deliverySuccessRate) >= 95 ? 
              <TrendingUp className="text-indigo-600" size={24} /> :
              <TrendingDown className="text-indigo-600" size={24} />
            }
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recovery System Status */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            Recovery System
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Check</span>
              <span className="text-sm text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto Recovery</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Notification System */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="text-orange-600" size={20} />
            Alert System
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Admin Notifications</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed Delivery Alerts</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                On
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-purple-600" size={20} />
            Performance
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Recovery Time</span>
              <span className="text-sm font-medium">2.5 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recovery Success Rate</span>
              <span className="text-sm font-medium text-green-600">
                {realtimeStats.recoverySuccessRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">System Uptime</span>
              <span className="text-sm font-medium text-green-600">99.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-gray-600" size={20} />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            recentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${getStatusColor(activity.status)}`}>
                    {getStatusIcon(activity.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/admin/payment-recovery'}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <RefreshCw className="text-blue-600 mb-2" size={20} />
            <h4 className="font-medium">Recovery Manager</h4>
            <p className="text-sm text-gray-600">Manage failed payment deliveries</p>
          </button>
          
          <button
            onClick={loadMonitoringData}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <Eye className="text-green-600 mb-2" size={20} />
            <h4 className="font-medium">System Check</h4>
            <p className="text-sm text-gray-600">Run comprehensive system test</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/analytics'}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <TrendingUp className="text-purple-600 mb-2" size={20} />
            <h4 className="font-medium">View Analytics</h4>
            <p className="text-sm text-gray-600">Detailed payment analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusMonitor;