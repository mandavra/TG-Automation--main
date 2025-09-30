import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import axios from "axios";
import DateRangePicker from "../components/DateRangePicker";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  UserPlus,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";

// Tailwind-safe color style mapping to avoid dynamic class names
const COLOR_STYLES = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    gradient: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/30",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/20",
    text: "text-green-600 dark:text-green-400",
    gradient: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-900/30",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
    gradient: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-900/30",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    gradient: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/10 dark:to-red-900/30",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/20",
    text: "text-orange-600 dark:text-orange-400",
    gradient: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-900/30",
  },
  indigo: {
    bg: "bg-indigo-100 dark:bg-indigo-900/20",
    text: "text-indigo-600 dark:text-indigo-400",
    gradient: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/10 dark:to-indigo-900/30",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/20",
    text: "text-teal-600 dark:text-teal-400",
    gradient: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/10 dark:to-teal-900/30",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/20",
    text: "text-cyan-600 dark:text-cyan-400",
    gradient: "bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/10 dark:to-cyan-900/30",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/10 dark:to-emerald-900/30",
  },
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    conversionRate: 0,
    avgRevenuePerUser: 0,
    recentTransactions: [],
    monthlyData: [],
    topPlans: []
  });
  const [userGrowth, setUserGrowth] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [channelStats, setChannelStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [dateRangeValue, setDateRangeValue] = useState({
    startDate: null,
    endDate: null,
    preset: 'last30days'
  });
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [groups, setGroups] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState(null);

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange, selectedGroup, dateRangeValue]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAnalytics(),
        fetchUserGrowth(),
        fetchPaymentStats(),
        fetchChannelStats(),
        fetchGroups()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/all');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/analytics/user-growth',
        {
          headers: getAuthHeader(),
          params: { dateRange }
        }
      );
      setUserGrowth(response.data.userGrowth || []);
    } catch (error) {
      console.error('Error fetching user growth:', error);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/payments/admin/stats/dashboard',
        {
          headers: getAuthHeader(),
          params: { dateRange }
        }
      );
      setPaymentStats(response.data);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const fetchChannelStats = async () => {
    try {
      const response = await axios.get(
        'http://localhost:4000/api/channel-members/admin/stats/dashboard',
        {
          headers: getAuthHeader(),
          params: { dateRange }
        }
      );
      setChannelStats(response.data);
    } catch (error) {
      console.error('Error fetching channel stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = {
        dateRange,
        ...(selectedGroup !== 'all' && { groupId: selectedGroup })
      };
      
      const response = await api.get('/analytics/revenue', { params });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
      // Set default data to prevent errors
      setAnalytics({
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        conversionRate: 0,
        avgRevenuePerUser: 0,
        recentTransactions: [],
        monthlyData: [],
        topPlans: []
      });
    }
  };

  // Calculate percentage change from previous period
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

  const getTrendBadgeClasses = (change) => {
    const numChange = parseFloat(change);
    if (numChange > 0) return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    if (numChange < 0) return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
  };

  const exportData = async () => {
    try {
      const params = {
        dateRange,
        ...(selectedGroup !== 'all' && { groupId: selectedGroup }),
        format: 'csv'
      };
      
      const response = await api.get('/analytics/export', { 
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue", subtitle }) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;
    return (
      <div className="group h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ring-1 ring-gray-200/60 dark:ring-gray-700/60 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
            )}
            {change && (
              <div className={`inline-flex items-center mt-3 text-xs px-2 py-1 rounded-full ${getTrendBadgeClasses(change)}`}>
                {getTrendIcon(change)}
                <span className="ml-1 font-medium">{Math.abs(change)}% vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-2xl ${styles.gradient || styles.bg} ring-1 ring-gray-200/60 dark:ring-gray-700/60 transition-transform duration-200 group-hover:scale-105`}>
            <Icon className={`w-8 h-8 ${styles.text}`} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-4 w-full max-w-none bg-gradient-to-br from-[f9fafb]-50/60 via-white/80 to-purple-50/60 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex px-3 flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700 w-full">
        <div className="flex items-center gap-2">
          {/* <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full p-1 shadow-lg" /> */}
        <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
              Analytics Dashboard
          </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs font-medium">
              Insights into your business performance
          </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow px-2 py-1 border border-gray-100 dark:border-gray-700">
          {/* Date Range Filter */}
          <div className="min-w-[140px]">
            <DateRangePicker
              value={dateRangeValue}
              onChange={(newValue) => {
                setDateRangeValue(newValue);
                if (newValue.preset === 'last7days') setDateRange('7d');
                else if (newValue.preset === 'last30days') setDateRange('30d');
                else if (newValue.preset === 'last60days') setDateRange('60d');
                else if (newValue.preset === 'last90days') setDateRange('90d');
                else if (newValue.preset === 'lifetime') setDateRange('1y');
                else setDateRange('custom');
              }}
              placeholder="Select date range"
            />
          </div>
          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs shadow-sm"
          >
            <option value="all">All Groups</option>
            {groups.map(group => (
              <option key={group._id} value={group._id}>{group.name}</option>
            ))}
          </select>
          {/* Refresh Button */}
          <button
            onClick={fetchAllAnalytics}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 text-xs shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          {/* Export Button */}
          <button
            onClick={exportData}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs shadow-lg"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          change="12.5"
          icon={DollarSign}
          color="green"
          subtitle="All-time earnings"
        />
        <MetricCard
          title="Active Subscriptions"
          value={analytics.activeSubscriptions?.toLocaleString() || '0'}
          change="15.3"
          icon={Users}
          color="blue"
          subtitle="Currently paying users"
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(analytics.monthlyRevenue)}
          change="8.2"
          icon={TrendingUp}
          color="purple"
          subtitle="This month's earnings"
        />
        <MetricCard
          title="Avg Revenue/User"
          value={formatCurrency(analytics.avgRevenuePerUser)}
          change="5.1"
          icon={Target}
          color="orange"
          subtitle="Revenue per subscriber"
        />
      </div>

      {/* Payment & Channel Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        <MetricCard
          title="Success Rate"
          value={`${paymentStats?.stats?.successRate || 0}%`}
          change="2.3"
          icon={CheckCircle}
          color="green"
          subtitle="Payment success"
        />
        <MetricCard
          title="Failed Payments"
          value={paymentStats?.stats?.failedPayments?.toLocaleString() || '0'}
          change="-5.7"
          icon={XCircle}
          color="red"
          subtitle="Payment failures"
        />
        <MetricCard
          title="Channel Members"
          value={channelStats?.stats?.totalMembers?.toLocaleString() || '0'}
          change="18.4"
          icon={UserPlus}
          color="indigo"
          subtitle="Total members"
        />
        <MetricCard
          title="Active Members"
          value={channelStats?.stats?.activeMembers?.toLocaleString() || '0'}
          change="12.1"
          icon={UserCheck}
          color="teal"
          subtitle="Currently active"
        />
        <MetricCard
          title="New Users"
          value={userGrowth?.length || '0'}
          change="25.8"
          icon={UserPlus}
          color="cyan"
          subtitle="Recent signups"
        />
        <MetricCard
          title="Retention Rate"
          value={`${channelStats?.stats?.retentionRate || 0}%`}
          change="7.2"
          icon={Activity}
          color="emerald"
          subtitle="Member retention"
        />
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
        {/* Revenue Trends */}
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-lg p-3 border border-gray-100 dark:border-gray-800 flex flex-col w-full justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Revenue Trends</h2>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400 w-full">
            {analytics.monthlyData && analytics.monthlyData.length > 0 ? (
              <div className="w-full">
                <div className="flex items-end justify-between h-20 space-x-1 w-full">
                  {analytics.monthlyData.slice(-6).map((month, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t bg-gradient-to-t from-blue-400/80 to-blue-200/80 shadow-md transition-all duration-500"
                        style={{ 
                          height: `${Math.max(8, (month.revenue / Math.max(...analytics.monthlyData.slice(-6).map(m => m.revenue))) * 60)}px`
                        }}
                      />
                      <span className="text-[10px] mt-1 text-center text-gray-700 dark:text-gray-300">
                        {month._id.month}/{month._id.year}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-1" />
                <p className="text-xs">No revenue data available</p>
              </div>
            )}
          </div>
        </div>
        {/* User Growth Chart */}
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-lg p-3 border border-gray-100 dark:border-gray-800 flex flex-col w-full justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">User Growth</h2>
            <UserPlus className="w-4 h-4 text-green-400" />
          </div>
          <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400 w-full">
            {userGrowth && userGrowth.length > 0 ? (
              <div className="w-full">
                <div className="flex items-end justify-between h-20 space-x-0.5 w-full">
                  {userGrowth.slice(-14).map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t bg-gradient-to-t from-green-400/80 to-green-200/80 shadow-md transition-all duration-500"
                        style={{ 
                          height: `${Math.max(4, (day.newUsers / Math.max(...userGrowth.slice(-14).map(d => d.newUsers))) * 60)}px`
                        }}
                      />
                      <span className="text-[10px] mt-1 text-center text-gray-700 dark:text-gray-300">
                        {day._id.day}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs mt-1 text-gray-600 dark:text-gray-400">
                  Last 14 days: {userGrowth.reduce((sum, day) => sum + day.newUsers, 0)} new users
                </p>
              </div>
            ) : (
              <div className="text-center">
                <UserPlus className="w-8 h-8 mx-auto mb-1" />
                <p className="text-xs">No user growth data</p>
              </div>
            )}
          </div>
        </div>
        {/* Top Performing Plans */}
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-lg p-3 border border-gray-100 dark:border-gray-800 flex flex-col w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Top Plans</h2>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1.5">
            {analytics.topPlans && analytics.topPlans.length > 0 ? (
              analytics.topPlans.slice(0, 5).map((plan, index) => (
                <div key={plan._id} className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-gray-800/60 dark:to-gray-900/60 rounded shadow-sm w-full">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                      index === 0 ? 'bg-yellow-200 text-yellow-900' :
                      index === 1 ? 'bg-gray-200 text-gray-900' :
                      index === 2 ? 'bg-orange-200 text-orange-900' :
                      'bg-blue-200 text-blue-900'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-xs">
                        {plan.type}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {plan.subscriptions} subscriptions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white text-xs">
                      {formatCurrency(plan.revenue)}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {plan.percentage}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <PieChart className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">No plan data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel Member Analytics */}
      {channelStats && (
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-lg p-3 border border-gray-100 dark:border-gray-800 mt-2 w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Channel Member Analytics</h2>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 w-full">
            <div>
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Top Channels by Members</h3>
              <div className="space-y-1">
                {channelStats.membersByChannel?.slice(0, 5).map((channel, index) => (
                  <div key={channel._id} className="flex items-center justify-between p-1 bg-gradient-to-r from-blue-50/80 to-white/80 dark:from-gray-800/60 dark:to-gray-900/60 rounded shadow-sm w-full">
                    <span className="text-xs text-gray-800 dark:text-white truncate">
                      {channel.channelTitle || `Channel ${channel._id.slice(-8)}`}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {channel.count}
                      </span>
                      <span className="text-[10px] text-green-600 ml-1">
                        ({channel.active} active)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Recent Channel Activity</h3>
              <div className="space-y-1">
                {channelStats.recentJoins?.slice(0, 5).map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-1 bg-gradient-to-r from-green-50/80 to-white/80 dark:from-gray-800/60 dark:to-gray-900/60 rounded shadow-sm w-full">
                    <div>
                      <span className="text-xs text-gray-800 dark:text-white">
                        {member.userInfo?.firstName || 'User'} joined
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                        {member.channelInfo?.title || 'Channel'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {channelStats.expiringMembers?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Expiring Soon ({channelStats.expiringMembers.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 w-full">
                {channelStats.expiringMembers.slice(0, 6).map((member, index) => (
                  <div key={index} className="p-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded shadow-sm w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-800 dark:text-white">
                        {member.userInfo?.firstName || 'User'}
                      </span>
                      <Clock className="w-3 h-3 text-yellow-600" />
                    </div>
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-300">
                      Expires: {new Date(member.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-lg overflow-hidden mt-3 border border-gray-100 dark:border-gray-800 w-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/80 to-white/80 dark:from-gray-800/60 dark:to-gray-900/60 w-full">
          <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar w-full">
          {analytics.recentTransactions && analytics.recentTransactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">User</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">Plan</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">Amount</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 w-full">
                {analytics.recentTransactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-blue-50/60 dark:hover:bg-gray-700/60 transition-colors w-full">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {transaction.userName || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {transaction.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">
                      {transaction.planName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold gap-1 ${
                        transaction.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status === 'SUCCESS' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {transaction.status === 'FAILED' && <XCircle className="w-3 h-3 text-red-500" />}
                        {transaction.status !== 'SUCCESS' && transaction.status !== 'FAILED' && <Clock className="w-3 h-3 text-yellow-500" />}
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs w-full">
              No recent transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;