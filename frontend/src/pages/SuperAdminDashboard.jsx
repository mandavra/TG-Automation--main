import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Users,
  Building2,
  DollarSign,
  Activity,
  TrendingUp,
  Shield,
  Eye,
  Settings,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Clock,
  ArrowLeft,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Lazy load components for performance
const AdminAnalytics = lazy(() => import('../Component/SuperAdmin/AdminAnalytics'));
const AdminPermissions = lazy(() => import('../Component/SuperAdmin/AdminPermissions'));
const AdminActivityMonitor = lazy(() => import('../Component/SuperAdmin/AdminActivityMonitor'));
const AdminSelector = lazy(() => import('../Component/SuperAdmin/AdminSelector'));

// Loading component
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center p-8">
    <RefreshCw className="animate-spin text-blue-600" size={24} />
    <span className="ml-3 text-gray-600 dark:text-gray-400">{message}</span>
  </div>
);

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [admins, setAdmins] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  // const [adminPerformance, setAdminPerformance] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Verify super admin access
  useEffect(() => {
    const adminRole = localStorage.getItem('adminRole');
    const isAdmin = localStorage.getItem('isAdmin');
    const authToken = localStorage.getItem('auth');

    console.log('SuperAdmin Dashboard - Auth check:', { adminRole, isAdmin, authToken });

    if (authToken !== 'true' || adminRole !== 'superadmin') {
      console.log('Access denied - redirecting to admin login');
      // Clear any user session data
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      localStorage.removeItem("phone");
      localStorage.removeItem("userPhone");
      localStorage.removeItem("otp");
      navigate('/loginAdmin', { replace: true });
      return;
    }
  }, [navigate]);
  // const [showAdminDetails, setShowAdminDetails] = useState(false);
  const [selectedAdminForView, setSelectedAdminForView] = useState(null);


  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load system overview and admin list in parallel
      const [systemResponse, adminListResponse] = await Promise.all([
        axios.get('http://localhost:4000/api/admin/system/overview', { headers }),
        axios.get('http://localhost:4000/api/admin/list', { headers })
      ]);

      // Set system stats
      setSystemStats(systemResponse.data.systemStats || systemResponse.data || {});

      // Process admin list and add stats
      const adminList = adminListResponse.data.admins || adminListResponse.data || [];

      // Load detailed stats for each admin
      const adminStatsPromises = adminList.map(admin =>
        axios.get(`http://localhost:4000/api/admin/dashboard/admin/${admin._id}/stats`, { headers })
          .then(response => ({
            ...admin,
            id: admin._id,
            name: admin.name || admin.email.split('@')[0],
            status: admin.isActive ? 'active' : 'inactive',
            lastActive: admin.lastActive || new Date().toISOString(),
            stats: {
              totalUsers: response.data.totalUsers || response.data.userCount || 0,
              totalPayments: response.data.totalPayments || response.data.paymentCount || 0,
              totalRevenue: response.data.totalRevenue || response.data.revenue || 0,
              successRate: response.data.successRate ||
                (response.data.successfulPayments && response.data.totalPayments
                  ? (response.data.successfulPayments / response.data.totalPayments * 100).toFixed(1)
                  : 0)
            },
            permissions: admin.permissions || ['payments', 'users', 'analytics']
          }))
          .catch(error => {
            console.error(`Failed to load stats for admin ${admin._id}:`, error);
            return {
              ...admin,
              id: admin._id,
              name: admin.name || admin.email.split('@')[0],
              status: admin.isActive ? 'active' : 'inactive',
              lastActive: admin.lastActive || new Date().toISOString(),
              stats: {
                totalUsers: 0,
                totalPayments: 0,
                totalRevenue: 0,
                successRate: 0
              },
              permissions: admin.permissions || ['payments', 'users', 'analytics']
            };
          })
      );

      const adminsWithStats = await Promise.all(adminStatsPromises);

      setAdmins(adminsWithStats);
      // setAdminPerformance(adminsWithStats);

    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);

      // Set empty data on error
      setSystemStats({});
      setAdmins([]);
      // setAdminPerformance([]);
    } finally {
      setLoading(false);
    }
  };

  const impersonateAdmin = async (adminId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:4000/api/admin/impersonate/${adminId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      localStorage.setItem('originalToken', token);
      localStorage.setItem('originalRole', 'superadmin');
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('adminRole', 'admin');
      localStorage.setItem('impersonating', adminId);

      toast.success(`Now viewing as ${response.data.admin.email}`);
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error('Failed to impersonate admin');
    }
  };

  const handleViewAdminDashboard = (adminId) => {
    setSelectedAdminForView(adminId);
    setActiveView('admin_view');
  };

  const handleBackToOverview = () => {
    setActiveView('overview');
    setSelectedAdminForView(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  // Navigation items
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 size={18} />,
      description: 'System overview and admin management'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <TrendingUp size={18} />,
      description: 'Cross-admin performance analytics'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <Shield size={18} />,
      description: 'Role and permission management'
    },
    {
      id: 'activity',
      label: 'Activity Monitor',
      icon: <Activity size={18} />,
      description: 'Real-time activity tracking'
    }
  ];

  // Overview Dashboard Component
  const OverviewDashboard = () => (
    <div className="space-y-6">
      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-[10vh]">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Admins</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {systemStats.totalAdmins || 0}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {systemStats.activeAdmins || 0} active
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {systemStats.totalUsers?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-green-600 mt-1">All platforms</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(systemStats.totalRevenue || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">All time</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <DollarSign className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {((systemStats.successfulPayments / systemStats.totalPayments) * 100 || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-green-600 mt-1">Payment success</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Management Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                Admin Management
              </h2>
              <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitor and manage all admin accounts
              </p>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 w-full md:w-auto mt-2 md:mt-0">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search admins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm md:text-base"
                />
              </div>
              <button
                onClick={loadDashboardData}
                className="flex items-center px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs md:text-base"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-6 
                 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Header: Avatar + Name + Status */}
                <div className="flex-wrap flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 md:mb-4 gap-2 sm:gap-0 sm:gap-y-2">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-lg">
                      {admin.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-none">
                        {admin.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[140px] sm:max-w-none">
                        {admin.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-full ${admin.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {admin.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-4">
                  <div className="text-center">
                    <p className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">
                      {admin.stats.totalUsers.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(admin.stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Revenue</p>
                  </div>
                </div>

                {/* Last active + success */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 md:mb-4 gap-1 sm:gap-0">
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {getTimeAgo(admin.lastActive)}
                  </span>
                  <span className="font-medium">{admin.stats.successRate}% success</span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-1 md:space-x-2">
                  <button
                    onClick={() => handleViewAdminDashboard(admin.id)}
                    className="flex-1 flex items-center justify-center px-2 md:px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs md:text-sm"
                  >
                    <Eye size={14} className="mr-1" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => impersonateAdmin(admin.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center px-2 md:px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    title="Impersonate Admin"
                  >
                    <Shield size={14} />
                  </button>
                  <button
                    className="flex-1 sm:flex-none flex items-center justify-center px-2 md:px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Compare admin performance and analyze trends
          </p>
          <button
            onClick={() => setActiveView('analytics')}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            View Analytics
            <ChevronRight size={16} className="ml-2" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Shield className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Permissions
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Manage roles and permissions for all admins
          </p>
          <button
            onClick={() => setActiveView('permissions')}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Manage Permissions
            <ChevronRight size={16} className="ml-2" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Monitor
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Track real-time admin activities and system usage
          </p>
          <button
            onClick={() => setActiveView('activity')}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            View Activity
            <ChevronRight size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );

  // Admin View Component (for viewing individual admin dashboards)
  const AdminView = () => {
    const selectedAdminData = admins.find(admin => admin.id === selectedAdminForView);

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedAdminData?.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedAdminData?.name} Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedAdminData?.email}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => impersonateAdmin(selectedAdminForView)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Shield size={16} className="mr-2" />
              Impersonate Admin
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedAdminData?.stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedAdminData?.stats.totalPayments.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(selectedAdminData?.stats.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedAdminData?.stats.successRate}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                Admin Dashboard View
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                This is a preview of {selectedAdminData?.name}'s admin dashboard. To fully access their dashboard with all functionality, use the "Impersonate Admin" button above.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewDashboard />;
      case 'analytics':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading analytics..." />}>
            <AdminAnalytics admins={admins} selectedAdmin={selectedAdmin} />
          </Suspense>
        );
      case 'permissions':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading permissions..." />}>
            <AdminPermissions admins={admins} />
          </Suspense>
        );
      case 'activity':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading activity monitor..." />}>
            <AdminActivityMonitor admins={admins} />
          </Suspense>
        );
      case 'admin_view':
        return <AdminView />;
      default:
        return <OverviewDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message="Loading Super Admin Dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 
             rounded-none md:rounded-lg shadow-sm fixed top-[65px] md:top-17 z-40 w-[calc(100%-2rem)] 
             px-2 md:px-4 mx-auto"
      >
        <div className="py-2 md:py-3">
          <div
            className="flex flex-col md:flex-row items-start md:items-center 
                 justify-between gap-2 md:gap-0 w-full"
          >
            {/* Left: Logo & Title */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <Crown className="text-yellow-500" size={20} /> {/* smaller on mobile */}
              <div>
                <h1 className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">
                  Super Admin Dashboard
                </h1>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 leading-snug">
                  Complete control & monitoring
                </p>
              </div>
            </div>

            {/* Admin Selector - hide on small screens if needed */}
            {selectedAdmin !== "all" && activeView !== "admin_view" && (
              <Suspense fallback={<div>Loading...</div>}>
                <AdminSelector
                  admins={admins}
                  selectedAdmin={selectedAdmin}
                  onAdminChange={setSelectedAdmin}
                />
              </Suspense>
            )}
          </div>

          {/* Navigation */}
          {activeView !== "admin_view" && (
            <div className="mt-2 md:mt-4 w-full">
              <div
                className="flex flex-nowrap md:flex-wrap space-x-2 md:space-x-1 
                     overflow-x-auto bg-gray-50 dark:bg-gray-700/30 
                     rounded-lg p-1 scrollbar-thin 
                     scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center space-x-1 md:space-x-2 px-3 py-1.5 
                          rounded-md text-sm font-medium transition-colors 
                          whitespace-nowrap min-w-[70px] md:min-w-[120px]
                          ${activeView === item.id
                        ? "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 shadow"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    title={item.description}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="pt-20 md:pt-24 pb-4 px-2 md:px-4 w-full max-w-full md:max-w-6xl mx-auto">
        {renderActiveView()}
      </div>

      {/* Footer */}
      <div className="mt-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 
                  rounded-none md:rounded-lg px-2 md:px-4 py-3 
                  w-full max-w-full md:max-w-6xl mx-auto text-xs md:text-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center 
                    justify-between gap-2 md:gap-0 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span className="text-gray-600 dark:text-gray-400">
              System Status:{" "}
              <span className="text-green-600 font-medium">Operational</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Active Admins:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {systemStats.activeAdmins}/{systemStats.totalAdmins}
              </span>
            </span>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 
                   hover:text-gray-900 dark:hover:text-white transition-colors 
                   px-2 py-1 rounded-md"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;