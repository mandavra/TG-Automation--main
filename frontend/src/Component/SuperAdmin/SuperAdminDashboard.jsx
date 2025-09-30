import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Users,
  Building2,
  BarChart3,
  Settings,
  Shield,
  Activity,
  TrendingUp,
  Eye,
  Edit,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  UserCheck,
  Package
} from 'lucide-react';

// Lazy load components for better performance
const AdminSelector = lazy(() => import('./AdminSelector'));
const AdminAnalytics = lazy(() => import('./AdminAnalytics'));
const AdminUserManagement = lazy(() => import('./AdminUserManagement'));
const AdminPermissions = lazy(() => import('./AdminPermissions'));
const AdminActivityMonitor = lazy(() => import('./AdminActivityMonitor'));
const ChannelBundleFeatureManager = lazy(() => import('./ChannelBundleFeatureManager'));
const AdminPanelCustomizer = lazy(() => import('./AdminPanelCustomizer'));
const PlatformFeeManager = lazy(() => import('./PlatformFeeManager'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <RefreshCw className="animate-spin" size={24} />
    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
);

const SuperAdminDashboard = ({ onViewAdmin, systemStats, adminPerformance }) => {
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [activeView, setActiveView] = useState('overview');
  const [admins, setAdmins] = useState(adminPerformance || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock admin data - replace with actual API call
  const mockAdmins = [
    {
      id: 'admin_1',
      name: 'John Wilson',
      email: 'john@company.com',
      tenantId: 'tenant_1',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-01-15',
      lastActive: '2024-09-02T08:30:00.000Z',
      stats: {
        totalUsers: 1250,
        totalPayments: 3480,
        totalRevenue: 5240000,
        successRate: 94.5,
        activeSubscriptions: 1180
      },
      permissions: ['payments', 'users', 'analytics', 'reports']
    },
    {
      id: 'admin_2',
      name: 'Sarah Davis',
      email: 'sarah@techcorp.com',
      tenantId: 'tenant_2',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-02-20',
      lastActive: '2024-09-02T07:15:00.000Z',
      stats: {
        totalUsers: 850,
        totalPayments: 2340,
        totalRevenue: 3520000,
        successRate: 91.2,
        activeSubscriptions: 780
      },
      permissions: ['payments', 'users', 'analytics']
    },
    {
      id: 'admin_3',
      name: 'Michael Chen',
      email: 'michael@startup.io',
      tenantId: 'tenant_3',
      role: 'admin',
      status: 'inactive',
      joinedAt: '2024-03-10',
      lastActive: '2024-08-28T14:22:00.000Z',
      stats: {
        totalUsers: 420,
        totalPayments: 980,
        totalRevenue: 1470000,
        successRate: 88.7,
        activeSubscriptions: 380
      },
      permissions: ['payments', 'users']
    }
  ];

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:4000/api/admin/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load admins');
        const data = await res.json();
        const mapped = (data.admins || []).map(a => ({
          id: a._id,
          name: a.email,
          email: a.email,
          role: a.role,
          status: a.isActive ? 'active' : 'inactive',
          permissions: a.permissions || [],
          platformFee: typeof a.platformFee === 'number' ? a.platformFee : undefined,
          stats: a.stats || { totalUsers: 0, totalPayments: 0, totalRevenue: 0, successRate: 0 }
        }));
        setAdmins(mapped);
      } catch (e) {
        console.error('Admin list load failed', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  // Use passed system stats or calculate from admins
  const overallStats = useMemo(() => {
    if (systemStats && Object.keys(systemStats).length > 0) {
      return systemStats;
    }
    return admins.reduce((acc, admin) => {
      acc.totalAdmins += 1;
      acc.totalUsers += admin.stats?.totalUsers || 0;
      acc.totalPayments += admin.stats?.totalPayments || 0;
      acc.totalRevenue += admin.stats?.totalRevenue || 0;
      acc.activeAdmins += admin.status === 'active' ? 1 : 0;
      return acc;
    }, {
      totalAdmins: 0,
      totalUsers: 0,
      totalPayments: 0,
      totalRevenue: 0,
      activeAdmins: 0
    });
  }, [admins, systemStats]);

  // Filter admins based on search and status
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           admin.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || admin.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [admins, searchTerm, filterStatus]);

  // Navigation items
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 size={20} />,
      description: 'System-wide analytics'
    },
    {
      id: 'admins',
      label: 'Admin Management',
      icon: <Users size={20} />,
      description: 'Manage admin accounts'
    },
    {
      id: 'analytics',
      label: 'Cross-Admin Analytics',
      icon: <TrendingUp size={20} />,
      description: 'Compare admin performance'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <Shield size={20} />,
      description: 'Role and permission management'
    },
    {
      id: 'activity',
      label: 'Activity Monitor',
      icon: <Activity size={20} />,
      description: 'Real-time activity tracking'
    },
    {
      id: 'features',
      label: 'Feature Management',
      icon: <Package size={20} />,
      description: 'Manage KYC and E-Sign settings'
    },
    {
      id: 'panel-customizer',
      label: 'Panel Customizer',
      icon: <Settings size={20} />,
      description: 'Customize admin panel layouts'
    },
    {
      id: 'platform-fees',
      label: 'Platform Fees',
      icon: <DollarSign size={20} />,
      description: 'Configure and manage platform fees'
    }
  ];

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  const formatDate = useCallback((date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const getTimeAgo = useCallback((date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  }, []);

  const renderOverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Admins */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Admins</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStats.totalAdmins}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {overallStats.activeAdmins} active
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Building2 className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
        </div>
      </div>

      {/* Total Users */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStats.totalUsers.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">
              Across all admins
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <UserCheck className="text-green-600 dark:text-green-400" size={24} />
          </div>
        </div>
      </div>

      {/* Total Payments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payments</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStats.totalPayments.toLocaleString()}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              System-wide
            </p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {formatCurrency(overallStats.totalRevenue)}
            </p>
            <p className="text-sm text-green-600 mt-1">
              All time
            </p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <DollarSign className="text-yellow-600 dark:text-yellow-400" size={24} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminGrid = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-80"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus size={16} className="mr-2" />
          Add Admin
        </button>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAdmins.map((admin) => (
          <div key={admin.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            {/* Admin Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {admin.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {admin.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {admin.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  admin.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {admin.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Admin Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {admin.stats.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Users</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(admin.stats.totalRevenue)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Revenue</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {admin.stats.successRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${admin.stats.successRate}%` }}
                ></div>
              </div>
            </div>

            {/* Last Active */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="flex items-center">
                <Clock size={14} className="mr-1" />
                Last active: {getTimeAgo(admin.lastActive)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedAdmin(admin.id)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <Eye size={14} className="mr-1" />
                View Dashboard
              </button>
              <button className="flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                <Edit size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            {renderOverviewCards()}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Admin Performance Overview
              </h3>
              {renderAdminGrid()}
            </div>
          </div>
        );
      
      case 'admins':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Admin Management
            </h3>
            {renderAdminGrid()}
          </div>
        );
      
      case 'analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAnalytics admins={admins} selectedAdmin={selectedAdmin} />
          </Suspense>
        );
      
      case 'permissions':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPermissions admins={admins} />
          </Suspense>
        );
      
      case 'activity':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminActivityMonitor admins={admins} />
          </Suspense>
        );
      
      case 'features':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ChannelBundleFeatureManager />
          </Suspense>
        );

      case 'panel-customizer':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPanelCustomizer />
          </Suspense>
        );
      
      case 'platform-fees':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PlatformFeeManager />
          </Suspense>
        );
      
      default:
        return renderOverviewCards();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Super Admin 
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and monitor all admin accounts
              </p>
            </div>

            {/* Admin Selector */}
            {selectedAdmin !== 'all' && (
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
          <div className="flex space-x-1 mt-6 overflow-x-auto">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeView === item.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.description}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {renderActiveView()}
      </div>

      {/* Quick Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-gray-600 dark:text-gray-400">
              System Status: <span className="text-green-600 font-medium">All Systems Operational</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Active Admins: <span className="font-medium text-gray-900 dark:text-white">{overallStats.activeAdmins}/{overallStats.totalAdmins}</span>
            </span>
          </div>
          <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <RefreshCw size={14} />
            <span>Last updated: just now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;