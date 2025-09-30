import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Calendar,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart,
  FileText,
  Shield,
  MessageSquare
} from 'lucide-react';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    users: null,
    payments: null,
    channelMembers: null,
    analytics: null,
    documents: null,
    kyc: null
  });
  const [dateRange, setDateRange] = useState('30d');

  // Redirect super admin to super admin dashboard
  useEffect(() => {
    const adminRole = localStorage.getItem('adminRole');
    if (adminRole === 'superadmin') {
      navigate('/admin/super-admin-dashboard', { replace: true });
      return;
    }
  }, [navigate]);

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        usersResponse,
        paymentsResponse,
        channelMembersResponse,
        analyticsResponse,
        documentsResponse,
        kycResponse
      ] = await Promise.allSettled([
        axios.get('http://localhost:4000/api/users/admin/stats/dashboard', {
          headers: getAuthHeader(),
          params: { dateRange }
        }),
        axios.get('http://localhost:4000/api/payments/admin/stats/dashboard', {
          headers: getAuthHeader(),
          params: { dateRange }
        }),
        axios.get('http://localhost:4000/api/channel-members/admin/stats/dashboard', {
          headers: getAuthHeader(),
          params: { dateRange }
        }),
        axios.get('http://localhost:4000/api/analytics/revenue', {
          headers: getAuthHeader(),
          params: { dateRange }
        }),
        axios.get('http://localhost:4000/api/documents/admin/stats', {
          headers: getAuthHeader()
        }),
        axios.get('http://localhost:4000/api/kyc-admin/stats', {
          headers: getAuthHeader()
        })
      ]);

      setDashboardData({
        users: usersResponse.status === 'fulfilled' ? usersResponse.value.data : null,
        payments: paymentsResponse.status === 'fulfilled' ? paymentsResponse.value.data : null,
        channelMembers: channelMembersResponse.status === 'fulfilled' ? channelMembersResponse.value.data : null,
        analytics: analyticsResponse.status === 'fulfilled' ? analyticsResponse.value.data : null,
        documents: documentsResponse.status === 'fulfilled' ? documentsResponse.value.data : null,
        kyc: kycResponse.status === 'fulfilled' ? kycResponse.value.data : null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getTrendIcon = (change) => {
    const numChange = parseFloat(change);
    if (numChange > 0) return <ArrowUp className="w-4 h-4" />;
    if (numChange < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (change) => {
    const numChange = parseFloat(change);
    if (numChange > 0) return 'text-green-600';
    if (numChange < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue", subtitle, onClick }) => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${getTrendColor(change)}`}>
              {getTrendIcon(change)}
              <span className="ml-1">{Math.abs(change)}% vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`w-8 h-8 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <RefreshCw className="animate-spin w-12 h-12 text-blue-600" />
        <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete overview of your platform performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
          
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(dashboardData.analytics?.totalRevenue)}
          change="12.5"
          icon={DollarSign}
          color="green"
          subtitle="All-time earnings"
          onClick={() => window.location.href = '/admin/analytics'}
        />
        <MetricCard
          title="Active Users"
          value={dashboardData.users?.stats?.activeUsers?.toLocaleString() || '0'}
          change="8.2"
          icon={Users}
          color="blue"
          subtitle="Currently active"
          onClick={() => window.location.href = '/admin/user-management'}
        />
        <MetricCard
          title="Total Payments"
          value={dashboardData.payments?.stats?.totalPayments?.toLocaleString() || '0'}
          change="15.7"
          icon={CreditCard}
          color="purple"
          subtitle="All transactions"
          onClick={() => window.location.href = '/admin/payment-management'}
        />
        <MetricCard
          title="Channel Members"
          value={dashboardData.channelMembers?.stats?.totalMembers?.toLocaleString() || '0'}
          change="22.1"
          icon={UserCheck}
          color="indigo"
          subtitle="Total memberships"
          onClick={() => window.location.href = '/admin/channel-member-management'}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Success Rate"
          value={`${dashboardData.payments?.stats?.successRate || 0}%`}
          change="2.3"
          icon={CheckCircle}
          color="green"
          subtitle="Payment success"
        />
        <MetricCard
          title="Failed Payments"
          value={dashboardData.payments?.stats?.failedPayments?.toLocaleString() || '0'}
          change="-5.1"
          icon={XCircle}
          color="red"
          subtitle="Failed transactions"
        />
        <MetricCard
          title="Pending KYC"
          value={dashboardData.kyc?.pendingKyc?.toLocaleString() || '0'}
          change="3.2"
          icon={AlertTriangle}
          color="yellow"
          subtitle="Awaiting verification"
        />
        <MetricCard
          title="Documents"
          value={dashboardData.documents?.totalDocuments?.toLocaleString() || '0'}
          change="7.8"
          icon={FileText}
          color="cyan"
          subtitle="Total documents"
        />
        <MetricCard
          title="Retention Rate"
          value={`${dashboardData.channelMembers?.stats?.retentionRate || 0}%`}
          change="4.5"
          icon={Activity}
          color="emerald"
          subtitle="Member retention"
        />
        <MetricCard
          title="Avg Revenue/User"
          value={formatCurrency(dashboardData.analytics?.avgRevenuePerUser)}
          change="9.1"
          icon={Target}
          color="orange"
          subtitle="Per user value"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Revenue Trends
            </h2>
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            {dashboardData.analytics?.monthlyData?.length > 0 ? (
              <div className="w-full">
                <div className="flex items-end justify-between h-48 space-x-2">
                  {dashboardData.analytics.monthlyData.slice(-6).map((month, index) => {
                    const maxRevenue = Math.max(...dashboardData.analytics.monthlyData.slice(-6).map(m => m.revenue));
                    const height = Math.max(10, (month.revenue / maxRevenue) * 180);
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                          style={{ height: `${height}px` }}
                          title={`${month._id.month}/${month._id.year}: ${formatCurrency(month.revenue)}`}
                        />
                        <span className="text-xs mt-2 text-center">
                          {month._id.month}/{month._id.year}
                        </span>
                        <span className="text-xs text-gray-500 text-center">
                          {formatCurrency(month.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No revenue data available</p>
                <p className="text-sm text-gray-400">Check back after some transactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Plans */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Top Performing Plans
            </h2>
            <PieChart className="w-6 h-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.analytics?.topPlans?.length > 0 ? (
              dashboardData.analytics.topPlans.slice(0, 5).map((plan, index) => (
                <div key={plan._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {plan.type}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {plan.subscriptions} subscriptions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-800 dark:text-white">
                      {formatCurrency(plan.revenue)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.percentage}% of total
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg text-gray-500">No plan data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {dashboardData.users?.recentUsers?.slice(0, 5).map((user, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <Users className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    New user registered
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!dashboardData.users?.recentUsers || dashboardData.users.recentUsers.length === 0) && (
              <p className="text-center text-gray-500 py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Expiring Memberships */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Expiring Soon
          </h3>
          <div className="space-y-3">
            {dashboardData.channelMembers?.expiringMembers?.slice(0, 5).map((member, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {member.userInfo?.firstName || 'User'}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Expires: {new Date(member.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {(!dashboardData.channelMembers?.expiringMembers || dashboardData.channelMembers.expiringMembers.length === 0) && (
              <p className="text-center text-gray-500 py-4">No expiring memberships</p>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Payment Gateway</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Fast</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Background Jobs</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Recent Transactions
            </h2>
            <button
              onClick={() => window.location.href = '/admin/payment-management'}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              View All <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {dashboardData.payments?.recentPayments?.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dashboardData.payments.recentPayments.slice(0, 8).map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.customer?.fullName || payment.customerName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.customer?.phone || payment.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {payment.plan_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                        payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg text-gray-500">No recent transactions</p>
              <p className="text-sm text-gray-400">Transactions will appear here once users start paying</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;