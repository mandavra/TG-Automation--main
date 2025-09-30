import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Crown,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Filter,
  ChevronDown
} from 'lucide-react';
import {
  Bar,
  Line,
  Doughnut,
  Pie
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SystemAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [systemStats, setSystemStats] = useState({});
  const [adminPerformance, setAdminPerformance] = useState([]);
  const [revenueStats, setRevenueStats] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [comparisonMode, setComparisonMode] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    loadAnalyticsData();
  }, [navigate, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/admin/system/overview', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { timeRange }
      });

      setSystemStats(response.data.systemStats || {});
      setAdminPerformance(response.data.adminPerformance || []);
      setRevenueStats(response.data.revenueStats || []);
    } catch (error) {
      toast.error('Failed to load analytics data');
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151'
        }
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151',
        bodyColor: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151',
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
        }
      },
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#F3F4F6'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
        }
      }
    }
  };

  // Revenue Trend Chart
  const revenueChartData = {
    labels: revenueStats.slice(0, 15).reverse().map(stat =>
      `${stat._id.day}/${stat._id.month}`
    ),
    datasets: [{
      label: 'Daily Revenue',
      data: revenueStats.slice(0, 15).reverse().map(stat => stat.dailyRevenue),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }, {
      label: 'Daily Transactions',
      data: revenueStats.slice(0, 15).reverse().map(stat => stat.dailyCount * 1000), // Scale for visibility
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
    }]
  };

  // Admin Performance Comparison
  const adminComparisonData = {
    labels: adminPerformance.slice(0, 10).map(admin => admin.email.split('@')[0]),
    datasets: [{
      label: 'Revenue (₹)',
      data: adminPerformance.slice(0, 10).map(admin => admin.revenue),
      backgroundColor: '#3B82F6',
      borderRadius: 6,
    }, {
      label: 'Users',
      data: adminPerformance.slice(0, 10).map(admin => admin.userCount * 1000), // Scale for visibility
      backgroundColor: '#10B981',
      borderRadius: 6,
      yAxisID: 'y1',
    }]
  };

  // Admin Distribution
  const adminDistributionData = {
    labels: adminPerformance.slice(0, 8).map(admin => admin.email.split('@')[0]),
    datasets: [{
      data: adminPerformance.slice(0, 8).map(admin => admin.revenue),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
      ],
      borderWidth: 0,
    }]
  };

  // User Growth Chart
  const userGrowthData = {
    labels: revenueStats.slice(0, 15).reverse().map(stat =>
      `${stat._id.day}/${stat._id.month}`
    ),
    datasets: [{
      label: 'New Users Daily',
      data: revenueStats.slice(0, 15).reverse().map(stat => stat.dailyCount),
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const metrics = [
    {
      id: 'revenue',
      label: 'Revenue Analysis',
      icon: DollarSign,
      color: 'blue',
      value: formatCurrency(adminPerformance.reduce((sum, admin) => sum + admin.revenue, 0))
    },
    {
      id: 'users',
      label: 'User Growth',
      icon: Users,
      color: 'green',
      value: systemStats.totalUsers?.toLocaleString() || '0'
    },
    {
      id: 'performance',
      label: 'Admin Performance',
      icon: TrendingUp,
      color: 'purple',
      value: `${adminPerformance.length} Admins`
    },
    {
      id: 'activity',
      label: 'System Activity',
      icon: Activity,
      color: 'orange',
      value: `${systemStats.successfulPayments || 0} Payments`
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600 dark:text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <BarChart3 className="text-blue-500" size={28} />
              <div>
                <h1 className="text-[20px] sm:text-4xl font-bold text-gray-900 dark:text-white">
                  System Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-[12px] sm:text-base">
                  Comprehensive system performance and admin analytics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              <button
                onClick={loadAnalyticsData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`p-4 rounded-xl border transition-all duration-200 ${selectedMetric === metric.id
                      ? `bg-${metric.color}-50 dark:bg-${metric.color}-900/20 border-${metric.color}-200 dark:border-${metric.color}-700`
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`${selectedMetric === metric.id ? `text-${metric.color}-500` : 'text-gray-400'}`} size={24} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectedMetric === metric.id ? `text-${metric.color}-700 dark:text-${metric.color}-300` : 'text-gray-600 dark:text-gray-300'}`}>
                        {metric.label}
                      </p>
                      <p className={`text-lg font-bold ${selectedMetric === metric.id ? `text-${metric.color}-800 dark:text-${metric.color}-200` : 'text-gray-900 dark:text-white'}`}>
                        {metric.value}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* Primary Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedMetric === 'revenue' && 'Revenue Trend Analysis'}
                  {selectedMetric === 'users' && 'User Growth Analysis'}
                  {selectedMetric === 'performance' && 'Admin Performance Comparison'}
                  {selectedMetric === 'activity' && 'System Activity Overview'}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setComparisonMode(!comparisonMode)}
                    className={`px-3 py-1 text-xs rounded-lg border ${comparisonMode
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    Compare Mode
                  </button>
                </div>
              </div>

              <div className="h-80">
                {selectedMetric === 'revenue' && (
                  <Line data={revenueChartData} options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                          color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
                        }
                      }
                    }
                  }} />
                )}

                {selectedMetric === 'users' && (
                  <Line data={userGrowthData} options={chartOptions} />
                )}

                {selectedMetric === 'performance' && (
                  <Bar data={adminComparisonData} options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                          color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
                        }
                      }
                    }
                  }} />
                )}

                {selectedMetric === 'activity' && (
                  <Doughnut data={adminDistributionData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="space-y-6">

            {/* Key Performance Indicators */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Performance Indicators
              </h3>

              <div className="space-y-4">
                {/* Average Revenue per Admin */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Average Revenue per Admin
                    </p>
                    <p className="text-base sm:text-lg font-bold text-blue-800 dark:text-blue-200">
                      {formatCurrency(adminPerformance.reduce((sum, admin) => sum + admin.revenue, 0) / adminPerformance.length || 0)}
                    </p>
                  </div>
                  <TrendingUp className="text-blue-500" size={24} />
                </div>

                {/* Average Users per Admin */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Average Users per Admin
                    </p>
                    <p className="text-base sm:text-lg font-bold text-green-800 dark:text-green-200">
                      {Math.round(adminPerformance.reduce((sum, admin) => sum + admin.userCount, 0) / adminPerformance.length || 0)}
                    </p>
                  </div>
                  <Users className="text-green-500" size={24} />
                </div>

                {/* Payment Success Rate */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Payment Success Rate
                    </p>
                    <p className="text-base sm:text-lg font-bold text-purple-800 dark:text-purple-200">
                      {((systemStats.successfulPayments / systemStats.totalPayments) * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                  <Activity className="text-purple-500" size={24} />
                </div>

                {/* System Utilization */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      System Utilization
                    </p>
                    <p className="text-base sm:text-lg font-bold text-orange-800 dark:text-orange-200">
                      {((systemStats.activeUsers / systemStats.totalUsers) * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="text-orange-500" size={24} />
                </div>
              </div>
            </div>


            {/* Top Performers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Admins
              </h3>

              <div className="space-y-3">
                {adminPerformance.slice(0, 5).map((admin, index) => (
                  <div key={admin._id} className="flex items-center justify-between flex-wrap">
                    <div className="flex items-center gap-3 ">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                        }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {admin.userCount} users
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(admin.revenue)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {admin.paymentCount} payments
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Admin Performance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Detailed Admin Performance
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {/* Export functionality */ }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Rank</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Admin</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Total Users</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Total Revenue</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Avg. Revenue per User</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Payment Count</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Success Rate</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Status</th>
                  <th className="pb-3 text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminPerformance.map((admin, index) => {
                  const avgRevenuePerUser = admin.userCount > 0 ? admin.revenue / admin.userCount : 0;
                  const successRate = admin.paymentCount > 0 ? (admin.paymentCount / admin.paymentCount) * 100 : 0; // Simplified for demo

                  return (
                    <tr key={admin._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${index < 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-400'
                          }`}>
                          #{index + 1}
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {admin.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {admin.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 text-gray-900 dark:text-white font-medium">
                        {admin.userCount.toLocaleString()}
                      </td>
                      <td className="py-4 text-gray-900 dark:text-white font-medium">
                        {formatCurrency(admin.revenue)}
                      </td>
                      <td className="py-4 text-gray-900 dark:text-white">
                        {formatCurrency(avgRevenuePerUser)}
                      </td>
                      <td className="py-4 text-gray-900 dark:text-white">
                        {admin.paymentCount}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${successRate >= 90
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : successRate >= 70
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                          {successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${admin.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/super-admin-manage/${admin._id}`)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="View Details"
                          >
                            <Eye size={16} className="text-gray-500" />
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

        {/* Additional Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Revenue Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revenue Distribution by Admin
            </h3>
            <div className="h-64">
              <Pie data={adminDistributionData} options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'right',
                    labels: {
                      generateLabels: (chart) => {
                        const data = chart.data;
                        return data.labels.map((label, index) => ({
                          text: `${label}: ${formatCurrency(data.datasets[0].data[index])}`,
                          fillStyle: data.datasets[0].backgroundColor[index],
                          strokeStyle: data.datasets[0].backgroundColor[index],
                          lineWidth: 0,
                          pointStyle: 'circle'
                        }));
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* System Health Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Health Metrics
            </h3>

            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active Admins</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.activeAdmins}/{systemStats.totalAdmins}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(systemStats.activeAdmins / systemStats.totalAdmins) * 100 || 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active Users</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.activeUsers?.toLocaleString()}/{systemStats.totalUsers?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(systemStats.activeUsers / systemStats.totalUsers) * 100 || 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Payment Success</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.successfulPayments?.toLocaleString()}/{systemStats.totalPayments?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${(systemStats.successfulPayments / systemStats.totalPayments) * 100 || 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown size={20} />
            Performance Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={16} />
                <span className="text-sm font-medium">Top Revenue Generator</span>
              </div>
              <p className="text-lg font-bold">
                {adminPerformance[0]?.email?.split('@')[0] || 'N/A'}
              </p>
              <p className="text-xs opacity-80">
                {formatCurrency(adminPerformance[0]?.revenue || 0)} total revenue
              </p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} />
                <span className="text-sm font-medium">Largest User Base</span>
              </div>
              <p className="text-lg font-bold">
                {[...adminPerformance].sort((a, b) => b.userCount - a.userCount)[0]?.email?.split('@')[0] || 'N/A'}
              </p>
              <p className="text-xs opacity-80">
                {[...adminPerformance].sort((a, b) => b.userCount - a.userCount)[0]?.userCount || 0} users
              </p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} />
                <span className="text-sm font-medium">Best Revenue per User</span>
              </div>
              <p className="text-lg font-bold">
                {[...adminPerformance].sort((a, b) => (b.revenue / b.userCount || 0) - (a.revenue / a.userCount || 0))[0]?.email?.split('@')[0] || 'N/A'}
              </p>
              <p className="text-xs opacity-80">
                {formatCurrency([...adminPerformance].sort((a, b) => (b.revenue / b.userCount || 0) - (a.revenue / a.userCount || 0))[0]?.revenue / [...adminPerformance].sort((a, b) => (b.revenue / b.userCount || 0) - (a.revenue / a.userCount || 0))[0]?.userCount || 0)} per user
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
