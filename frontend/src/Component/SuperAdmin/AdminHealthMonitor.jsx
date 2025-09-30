import { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  Shield,
  ShieldAlert,
  Users,
  DollarSign,
  FileX,
  Zap,
  RefreshCw,
  Eye,
  Settings,
  Bell
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminHealthMonitor = () => {
  const [adminHealth, setAdminHealth] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadHealthData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadHealthData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHealthData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load admin health data
      const response = await axios.get('http://localhost:4000/api/admin/system/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const admins = response.data.adminPerformance || [];
      
      // Calculate health metrics for each admin
      const healthData = admins.map(admin => {
        const healthScore = calculateHealthScore(admin);
        const issues = detectIssues(admin);
        const status = getHealthStatus(healthScore, issues);
        
        return {
          ...admin,
          healthScore,
          issues,
          status,
          lastActive: admin.lastActive || new Date(),
          systemStatus: getSystemStatus()
        };
      });
      
      setAdminHealth(healthData);
      
      // Generate system alerts
      const alerts = generateSystemAlerts(healthData);
      setSystemAlerts(alerts);
      
    } catch (error) {
      console.error('Failed to load health data:', error);
      toast.error('Failed to load health monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (admin) => {
    let score = 100;
    
    // Revenue performance (30% weight)
    const avgRevenue = 50000; // Mock average
    if (admin.revenue < avgRevenue * 0.5) score -= 30;
    else if (admin.revenue < avgRevenue * 0.8) score -= 15;
    
    // User engagement (25% weight)
    const avgUsers = 100; // Mock average
    if (admin.userCount < avgUsers * 0.5) score -= 25;
    else if (admin.userCount < avgUsers * 0.8) score -= 12;
    
    // Payment success rate (25% weight)
    const successRate = admin.paymentCount > 0 ? 95 : 0; // Mock calculation
    if (successRate < 70) score -= 25;
    else if (successRate < 85) score -= 12;
    
    // System activity (20% weight)
    if (!admin.isActive) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  };

  const detectIssues = (admin) => {
    const issues = [];
    
    if (!admin.isActive) {
      issues.push({ type: 'critical', message: 'Admin account is inactive' });
    }
    
    if (admin.revenue < 10000) {
      issues.push({ type: 'warning', message: 'Low revenue performance' });
    }
    
    if (admin.userCount < 50) {
      issues.push({ type: 'warning', message: 'Low user acquisition' });
    }
    
    if (admin.paymentCount === 0) {
      issues.push({ type: 'critical', message: 'No successful payments' });
    }
    
    // Mock additional issues
    if (Math.random() > 0.7) {
      issues.push({ type: 'info', message: 'Consider optimizing payment flow' });
    }
    
    if (Math.random() > 0.8) {
      issues.push({ type: 'warning', message: 'High user churn detected' });
    }
    
    return issues;
  };

  const getHealthStatus = (score, issues) => {
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    const warningIssues = issues.filter(i => i.type === 'warning').length;
    
    if (criticalIssues > 0 || score < 50) return 'critical';
    if (warningIssues > 1 || score < 75) return 'warning';
    if (score >= 90) return 'excellent';
    return 'good';
  };

  const getSystemStatus = () => {
    // Mock system status calculation
    const statuses = ['online', 'degraded', 'offline'];
    const weights = [0.8, 0.15, 0.05]; // 80% online, 15% degraded, 5% offline
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'online';
  };

  const generateSystemAlerts = (healthData) => {
    const alerts = [];
    
    // Critical admins
    const criticalAdmins = healthData.filter(admin => admin.status === 'critical');
    if (criticalAdmins.length > 0) {
      alerts.push({
        id: 'critical-admins',
        type: 'critical',
        title: `${criticalAdmins.length} admin(s) need immediate attention`,
        message: 'Critical issues detected that may impact business operations',
        timestamp: new Date(),
        admins: criticalAdmins.map(a => a.email)
      });
    }
    
    // Low performance admins
    const lowPerformanceAdmins = healthData.filter(admin => admin.healthScore < 60);
    if (lowPerformanceAdmins.length > 0) {
      alerts.push({
        id: 'low-performance',
        type: 'warning',
        title: `${lowPerformanceAdmins.length} admin(s) showing low performance`,
        message: 'Performance optimization recommended',
        timestamp: new Date(),
        admins: lowPerformanceAdmins.map(a => a.email)
      });
    }
    
    // System-wide issues
    const offlineAdmins = healthData.filter(admin => admin.systemStatus === 'offline');
    if (offlineAdmins.length > 0) {
      alerts.push({
        id: 'offline-systems',
        type: 'critical',
        title: `${offlineAdmins.length} admin system(s) offline`,
        message: 'System connectivity issues detected',
        timestamp: new Date(),
        admins: offlineAdmins.map(a => a.email)
      });
    }
    
    return alerts.slice(0, 10); // Limit to 10 most recent alerts
  };

  const getStatusColor = (status) => {
    const colors = {
      excellent: 'green',
      good: 'blue',
      warning: 'yellow',
      critical: 'red'
    };
    return colors[status] || 'gray';
  };

  const getStatusIcon = (status) => {
    const icons = {
      excellent: CheckCircle,
      good: CheckCircle,
      warning: AlertTriangle,
      critical: XCircle
    };
    return icons[status] || AlertTriangle;
  };

  const getSystemStatusIcon = (status) => {
    const icons = {
      online: Wifi,
      degraded: Clock,
      offline: WifiOff
    };
    return icons[status] || WifiOff;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin mr-3" size={24} />
          <span className="text-gray-600 dark:text-gray-300">Loading health data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Alerts ({systemAlerts.length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.type === 'critical' 
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'} mt-1`} size={18} />
                    <div>
                      <h3 className={`text-sm font-medium ${alert.type === 'critical' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                        {alert.title}
                      </h3>
                      <p className={`text-xs ${alert.type === 'critical' ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'} mt-1`}>
                        {alert.message}
                      </p>
                      {alert.admins && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Affected: {alert.admins.slice(0, 3).join(', ')}
                            {alert.admins.length > 3 && ` and ${alert.admins.length - 3} more`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Health Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Admin Health Monitor
            </h2>
          </div>
          
          <button
            onClick={loadHealthData}
            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* Health Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {['excellent', 'good', 'warning', 'critical'].map((status) => {
            const count = adminHealth.filter(admin => admin.status === status).length;
            const StatusIcon = getStatusIcon(status);
            const color = getStatusColor(status);
            
            return (
              <div key={status} className={`p-4 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800`}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon className={`text-${color}-500`} size={20} />
                  <span className={`text-sm font-medium text-${color}-700 dark:text-${color}-300 capitalize`}>
                    {status}
                  </span>
                </div>
                <p className={`text-2xl font-bold text-${color}-800 dark:text-${color}-200`}>
                  {count}
                </p>
                <p className={`text-xs text-${color}-600 dark:text-${color}-400`}>
                  {((count / adminHealth.length) * 100 || 0).toFixed(1)}% of admins
                </p>
              </div>
            );
          })}
        </div>

        {/* Admin Health Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-gray-600 dark:text-gray-300">Admin</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">Health Score</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">Status</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">System</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">Issues</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">Performance</th>
                <th className="pb-3 text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminHealth.map((admin) => {
                const StatusIcon = getStatusIcon(admin.status);
                const SystemIcon = getSystemStatusIcon(admin.systemStatus);
                const statusColor = getStatusColor(admin.status);
                
                return (
                  <tr key={admin._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Users size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {admin.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`bg-${statusColor}-500 h-2 rounded-full`}
                            style={{ width: `${admin.healthScore}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium text-${statusColor}-600 dark:text-${statusColor}-400`}>
                          {admin.healthScore}%
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`text-${statusColor}-500`} size={16} />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 dark:bg-${statusColor}-900/30 text-${statusColor}-700 dark:text-${statusColor}-300 capitalize`}>
                          {admin.status}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <SystemIcon className={`${
                          admin.systemStatus === 'online' ? 'text-green-500' :
                          admin.systemStatus === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                        }`} size={16} />
                        <span className={`text-xs capitalize ${
                          admin.systemStatus === 'online' ? 'text-green-600 dark:text-green-400' :
                          admin.systemStatus === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {admin.systemStatus}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-1">
                        {admin.issues.length === 0 ? (
                          <CheckCircle className="text-green-500" size={16} />
                        ) : (
                          <>
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {admin.issues.length} issue{admin.issues.length !== 1 ? 's' : ''}
                            </span>
                            {admin.issues.some(i => i.type === 'critical') && (
                              <AlertTriangle className="text-red-500 ml-1" size={14} />
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {admin.revenue > 50000 ? (
                          <TrendingUp className="text-green-500" size={16} />
                        ) : (
                          <TrendingDown className="text-red-500" size={16} />
                        )}
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {formatCurrency(admin.revenue)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowDetails(true);
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="View Details"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => {/* Manage admin functionality */}}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Manage Admin"
                        >
                          <Settings size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Details Modal */}
      {showDetails && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Health Details: {selectedAdmin.email}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Health Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Health Score
                  </span>
                  <span className={`text-lg font-bold text-${getStatusColor(selectedAdmin.status)}-600 dark:text-${getStatusColor(selectedAdmin.status)}-400`}>
                    {selectedAdmin.healthScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className={`bg-${getStatusColor(selectedAdmin.status)}-500 h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${selectedAdmin.healthScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Issues List */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Issues & Recommendations
                </h4>
                
                {selectedAdmin.issues.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      No issues detected. Admin is performing well.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAdmin.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          issue.type === 'critical' 
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                            : issue.type === 'warning'
                            ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {issue.type === 'critical' && <XCircle className="text-red-500" size={16} />}
                          {issue.type === 'warning' && <AlertTriangle className="text-yellow-500" size={16} />}
                          {issue.type === 'info' && <CheckCircle className="text-blue-500" size={16} />}
                          
                          <span className={`text-sm ${
                            issue.type === 'critical' ? 'text-red-700 dark:text-red-300' :
                            issue.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                            'text-blue-700 dark:text-blue-300'
                          }`}>
                            {issue.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-300">Users</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-200">
                    {selectedAdmin.userCount}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-300">Revenue</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-200">
                    {formatCurrency(selectedAdmin.revenue)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    // Navigate to admin management
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Settings size={16} />
                  Manage Admin
                </button>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    // Impersonate admin
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <Shield size={16} />
                  View as Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHealthMonitor;
