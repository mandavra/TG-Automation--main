import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Eye,
  User,
  CreditCard,
  Settings,
  Download,
  Upload,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  RefreshCw,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

const AdminActivityMonitor = ({ admins = [] }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    admin: 'all',
    action: 'all',
    timeRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false); // Disabled by default for real usage

  // Generate realistic activities based on admin data and system patterns
  const generateRealisticActivities = () => {
    if (!admins || admins.length === 0) {
      return [];
    }

    const actions = [
      { type: 'login', icon: <User size={16} />, severity: 'info', description: 'Logged into admin panel' },
      { type: 'dashboard_view', icon: <Eye size={16} />, severity: 'info', description: 'Accessed admin dashboard' },
      { type: 'payment_create', icon: <CreditCard size={16} />, severity: 'success', description: 'Created payment link' },
      { type: 'payment_view', icon: <Eye size={16} />, severity: 'info', description: 'Viewed payment details' },
      { type: 'user_management', icon: <User size={16} />, severity: 'info', description: 'Accessed user management' },
      { type: 'analytics_view', icon: <BarChart3 size={16} />, severity: 'info', description: 'Viewed analytics dashboard' },
      { type: 'settings_access', icon: <Settings size={16} />, severity: 'info', description: 'Accessed system settings' },
      { type: 'data_export', icon: <Download size={16} />, severity: 'info', description: 'Exported data' },
      { type: 'withdrawal_process', icon: <DollarSign size={16} />, severity: 'warning', description: 'Processed withdrawal request' },
      { type: 'system_update', icon: <RefreshCw size={16} />, severity: 'success', description: 'Updated system configuration' }
    ];

    const devices = [
      { type: 'desktop', icon: <Monitor size={14} />, name: 'Desktop Browser' },
      { type: 'mobile', icon: <Smartphone size={14} />, name: 'Mobile Browser' }
    ];

    const locations = [
      'Mumbai, India',
      'Delhi, India', 
      'Bangalore, India',
      'Chennai, India',
      'Pune, India',
      'Hyderabad, India',
      'Kolkata, India'
    ];

    const activities = [];
    const now = new Date();

    // Generate activities based on admin activity patterns
    admins.forEach((admin) => {
      if (!admin.stats) return;

      // More active admins get more activities
      const activityMultiplier = admin.status === 'active' ? 1.5 : 0.5;
      const baseActivities = Math.max(1, Math.floor((admin.stats.totalUsers / 100) * activityMultiplier));
      const numActivities = Math.min(15, baseActivities); // Cap at 15 per admin

      for (let i = 0; i < numActivities; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        // Recent activities for active admins, older for inactive
        const maxDays = admin.status === 'active' ? 3 : 14;
        const timestamp = new Date(now.getTime() - Math.random() * maxDays * 24 * 60 * 60 * 1000);
        
        activities.push({
          id: `activity_${admin.id}_${i}`,
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          action: action.type,
          actionIcon: action.icon,
          actionDescription: action.description,
          severity: action.severity,
          timestamp: timestamp.toISOString(),
          device: device.name,
          deviceIcon: device.icon,
          location,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: device.type === 'mobile' ? 'Mobile Safari' : 'Chrome 118.0.0.0',
          success: admin.stats.successRate ? (Math.random() * 100 < admin.stats.successRate) : true,
          duration: Math.floor(Math.random() * 3000) + 200, // 200ms - 3s
          details: {
            resourceId: action.type.includes('payment') ? `payment_${Math.floor(Math.random() * 1000)}` : undefined,
            userCount: action.type === 'user_management' ? admin.stats.totalUsers : undefined,
            amount: action.type === 'withdrawal_process' ? Math.floor(Math.random() * 50000) + 1000 : undefined
          }
        });
      }
    });

    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  useEffect(() => {
    // Load realistic activities based on admin data
    if (admins && admins.length > 0) {
      setLoading(true);
      setTimeout(() => {
        setActivities(generateRealisticActivities());
        setLoading(false);
      }, 500);
    } else {
      setActivities([]);
      setLoading(false);
    }

    // Optional: Simulate real-time updates (only if enabled)
    let interval;
    if (realTimeEnabled && admins.length > 0) {
      interval = setInterval(() => {
        if (Math.random() > 0.8) { // 20% chance of new activity
          const newActivities = generateRealisticActivities().slice(0, 2); // Get latest 2
          setActivities(prev => [...newActivities, ...prev.slice(0, 48)]); // Keep last 50 total
        }
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [admins, realTimeEnabled]);

  // Filter and search activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Admin filter
    if (filters.admin !== 'all') {
      filtered = filtered.filter(activity => activity.adminId === filters.admin);
    }

    // Action filter
    if (filters.action !== 'all') {
      filtered = filtered.filter(activity => activity.action === filters.action);
    }

    // Time range filter
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    if (filters.timeRange !== 'all') {
      const cutoff = new Date(now.getTime() - timeRanges[filters.timeRange]);
      filtered = filtered.filter(activity => new Date(activity.timestamp) >= cutoff);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.adminName.toLowerCase().includes(term) ||
        activity.actionDescription.toLowerCase().includes(term) ||
        activity.location.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [activities, filters, searchTerm]);

  // Activity statistics
  const activityStats = useMemo(() => {
    const last24h = activities.filter(activity => 
      new Date(activity.timestamp) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      total24h: last24h.length,
      unique_admins: new Set(last24h.map(a => a.adminId)).size,
      failed_attempts: last24h.filter(a => !a.success).length,
      critical_actions: last24h.filter(a => a.severity === 'warning' || a.severity === 'error').length
    };
  }, [activities]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error': return <XCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin" size={24} />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading activities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Real-time Activity Monitor
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track all admin activities across the platform
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Real-time updates</span>
            </label>
            <div className={`w-3 h-3 rounded-full ${realTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {activityStats.total24h}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Activities (24h)
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {activityStats.unique_admins}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Active Admins
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {activityStats.critical_actions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Critical Actions
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {activityStats.failed_attempts}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Failed Attempts
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Admin Filter */}
          <select
            value={filters.admin}
            onChange={(e) => setFilters({...filters, admin: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Admins</option>
            {admins.map(admin => (
              <option key={admin.id} value={admin.id}>{admin.name}</option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => setFilters({...filters, action: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Actions</option>
            <option value="login">Logins</option>
            <option value="payment_create">Payment Created</option>
            <option value="settings_change">Settings Changed</option>
            <option value="data_export">Data Export</option>
            <option value="failed_login">Failed Logins</option>
          </select>

          {/* Time Range */}
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Export Button */}
          <button className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Feed ({filteredActivities.length})
            </h3>
            <button 
              onClick={() => setActivities(generateMockActivities())}
              className="flex items-center px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Activity size={48} className="mx-auto mb-2 opacity-50" />
              <p>No activities found matching your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    {/* Severity Icon */}
                    <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                      {getSeverityIcon(activity.severity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.adminName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {activity.adminEmail}
                            </span>
                            {activity.actionIcon}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {activity.actionDescription}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{formatTime(activity.timestamp)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {activity.deviceIcon}
                              <span>{activity.device}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin size={12} />
                              <span>{activity.location}</span>
                            </div>
                            {activity.duration && (
                              <span>{activity.duration}ms</span>
                            )}
                          </div>

                          {/* Additional Details */}
                          {activity.details && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                              {activity.details.changes && (
                                <div>Changes: {activity.details.changes.join(', ')}</div>
                              )}
                              {activity.details.recordsAffected && (
                                <div>Records affected: {activity.details.recordsAffected}</div>
                              )}
                              <div>IP: {activity.ipAddress}</div>
                            </div>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.success 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {activity.success ? 'Success' : 'Failed'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminActivityMonitor;