import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Award,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  ArrowUpDown
} from 'lucide-react';

const AdminAnalytics = ({ admins = [], selectedAdmin }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('revenue');
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');

  // Format currency
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Sort admins by selected metric
  const sortedAdmins = useMemo(() => {
    return [...admins].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'revenue':
          aValue = a.stats?.totalRevenue || 0;
          bValue = b.stats?.totalRevenue || 0;
          break;
        case 'users':
          aValue = a.stats?.totalUsers || 0;
          bValue = b.stats?.totalUsers || 0;
          break;
        case 'payments':
          aValue = a.stats?.totalPayments || 0;
          bValue = b.stats?.totalPayments || 0;
          break;
        case 'successRate':
          aValue = a.stats?.successRate || 0;
          bValue = b.stats?.successRate || 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        default:
          aValue = a.stats.totalRevenue;
          bValue = b.stats.totalRevenue;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [admins, sortBy, sortOrder]);

  // Calculate performance rankings
  const adminRankings = useMemo(() => {
    const metrics = ['totalRevenue', 'totalUsers', 'totalPayments', 'successRate'];
    
    return admins.map(admin => {
      let totalScore = 0;
      const scores = {};
      
      metrics.forEach(metric => {
        const values = admins.map(a => a.stats[metric]).sort((a, b) => b - a);
        const rank = values.indexOf(admin.stats[metric]) + 1;
        const score = ((admins.length - rank + 1) / admins.length) * 100;
        scores[metric] = { rank, score };
        totalScore += score;
      });
      
      return {
        ...admin,
        overallScore: totalScore / metrics.length,
        metricScores: scores
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [admins]);

  // Get top performers
  const topPerformers = useMemo(() => {
    return {
      revenue: [...admins].sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue)[0],
      users: [...admins].sort((a, b) => b.stats.totalUsers - a.stats.totalUsers)[0],
      successRate: [...admins].sort((a, b) => b.stats.successRate - a.stats.successRate)[0],
      payments: [...admins].sort((a, b) => b.stats.totalPayments - a.stats.totalPayments)[0]
    };
  }, [admins]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
  };

  const getTrendIcon = (isPositive) => {
    return isPositive ? (
      <TrendingUp size={16} className="text-green-500" />
    ) : (
      <TrendingDown size={16} className="text-red-500" />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full mt-[10vh]">
      {/* Header Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 w-full max-w-full">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Cross-Admin Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm">
              Compare performance across all admin accounts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="w-full sm:w-auto flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm">
              <Download size={16} className="mr-2" />
              Export
            </button>
            <button className="w-full sm:w-auto flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-xs sm:text-sm">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top Performers Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full max-w-full">
        {/* Revenue Leader */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <Award className="text-yellow-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Revenue Leader</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {topPerformers.revenue?.name}
            </p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(topPerformers.revenue?.stats.totalRevenue)}
            </p>
          </div>
        </div>

        {/* User Leader */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <Award className="text-yellow-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">User Base Leader</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {topPerformers.users?.name}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {topPerformers.users?.stats.totalUsers.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Success Rate Leader */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <Award className="text-yellow-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Efficiency Leader</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {topPerformers.successRate?.name}
            </p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {topPerformers.successRate?.stats.successRate}%
            </p>
          </div>
        </div>

        {/* Payment Volume Leader */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <Award className="text-yellow-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Volume Leader</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {topPerformers.payments?.name}
            </p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {topPerformers.payments?.stats.totalPayments.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-full">
        <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Performance Comparison
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Detailed metrics for all admin accounts
          </p>
        </div>
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-[600px] text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th 
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Admin</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th 
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Revenue</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th 
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('users')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Users</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th 
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('payments')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Payments</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th 
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('successRate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Success Rate</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Overall Score
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {adminRankings.map((admin, index) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {admin.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(admin.stats.totalRevenue)}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      {getTrendIcon(admin.stats.revenueGrowth >= 0)}
                      <span>{admin.stats.revenueGrowth >= 0 ? '+' : ''}{admin.stats.revenueGrowth || 0}%</span>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {admin.stats.totalUsers.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      {getTrendIcon(admin.stats.userGrowth >= 0)}
                      <span>{admin.stats.userGrowth >= 0 ? '+' : ''}{admin.stats.userGrowth || 0}%</span>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {admin.stats.totalPayments.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      {getTrendIcon(admin.stats.paymentGrowth >= 0)}
                      <span>{admin.stats.paymentGrowth >= 0 ? '+' : ''}{admin.stats.paymentGrowth || 0}%</span>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {admin.stats.successRate}%
                      </div>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${admin.stats.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(admin.overallScore)}`}>
                      {admin.overallScore.toFixed(1)}
                    </span>
                  </td>
                  
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      title="View Dashboard"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6 w-full max-w-full">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Performance Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 w-full max-w-full">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Top Performers</h4>
            <div className="space-y-2">
              {adminRankings.slice(0, 3).map((admin, index) => (
                <div key={admin.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">{admin.name}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto">
                    {admin.overallScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Growth Leaders</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {admins.filter(admin => admin.stats?.userGrowth > 0).length > 0 && (
                <p>• {[...admins].sort((a, b) => (b.stats?.userGrowth || 0) - (a.stats?.userGrowth || 0))[0]?.name} - Highest user growth ({([...admins].sort((a, b) => (b.stats?.userGrowth || 0) - (a.stats?.userGrowth || 0))[0]?.stats?.userGrowth || 0) >= 0 ? '+' : ''}{[...admins].sort((a, b) => (b.stats?.userGrowth || 0) - (a.stats?.userGrowth || 0))[0]?.stats?.userGrowth || 0}%)</p>
              )}
              {admins.filter(admin => admin.stats?.revenueGrowth > 0).length > 0 && (
                <p>• {[...admins].sort((a, b) => (b.stats?.revenueGrowth || 0) - (a.stats?.revenueGrowth || 0))[0]?.name} - Revenue growth ({([...admins].sort((a, b) => (b.stats?.revenueGrowth || 0) - (a.stats?.revenueGrowth || 0))[0]?.stats?.revenueGrowth || 0) >= 0 ? '+' : ''}{[...admins].sort((a, b) => (b.stats?.revenueGrowth || 0) - (a.stats?.revenueGrowth || 0))[0]?.stats?.revenueGrowth || 0}%)</p>
              )}
              {topPerformers.successRate && (
                <p>• {topPerformers.successRate.name} - Highest efficiency ({topPerformers.successRate.stats.successRate}%)</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Recommendations</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• Focus on improving conversion rates for lower-performing admins</p>
              <p>• Share best practices from top performers</p>
              <p>• Consider additional training for efficiency optimization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;