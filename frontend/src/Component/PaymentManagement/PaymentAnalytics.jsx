import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  CreditCard,
  Target
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PaymentAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    earningsChart: [],
    statusDistribution: {},
    monthlyComparison: {},
    topPlans: [],
    metrics: {}
  });
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('earnings');
  const [timeRange, setTimeRange] = useState('6months');

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/payments/admin/detailed-analytics?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Chart configurations
  const earningsChartData = {
    labels: analyticsData.earningsChart?.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [
      {
        label: 'Earnings',
        data: analyticsData.earningsChart?.map(item => item.amount) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
    ],
  };

  const statusChartData = {
    labels: ['Successful', 'Pending', 'Failed', 'Expired'],
    datasets: [
      {
        data: [
          analyticsData.statusDistribution?.SUCCESS || 0,
          analyticsData.statusDistribution?.PENDING || 0,
          analyticsData.statusDistribution?.FAILED || 0,
          analyticsData.statusDistribution?.EXPIRED || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const monthlyComparisonData = {
    labels: ['Previous Month', 'Current Month'],
    datasets: [
      {
        label: 'Revenue',
        data: [
          analyticsData.monthlyComparison?.previous || 0,
          analyticsData.monthlyComparison?.current || 0
        ],
        backgroundColor: ['rgba(156, 163, 175, 0.8)', 'rgba(59, 130, 246, 0.8)'],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#6B7280', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
        border: { display: false },
        ticks: { 
          color: '#6B7280', 
          font: { size: 11 },
          callback: function(value) {
            return '₹' + (value / 1000) + 'k';
          }
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    cutout: '60%',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin mr-2" size={24} />
        <span className="text-gray-600 dark:text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed insights into your payment performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analyticsData.metrics?.totalRevenue || 0)}
              </p>
              <div className={`flex items-center mt-1 ${
                (analyticsData.metrics?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(analyticsData.metrics?.revenueGrowth || 0) >= 0 ? 
                  <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                }
                <span className="text-sm ml-1">
                  {(() => {
                    const rate = Math.abs(analyticsData.metrics?.revenueGrowth || 0);
                    return rate > 100 ? '100%' : rate.toFixed(1) + '%';
                  })()}
                </span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Transaction</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analyticsData.metrics?.avgTransaction || 0)}
              </p>
              <div className={`flex items-center mt-1 ${
                (analyticsData.metrics?.avgGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(analyticsData.metrics?.avgGrowth || 0) >= 0 ? 
                  <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                }
                <span className="text-sm ml-1">
                  {(() => {
                    const rate = Math.abs(analyticsData.metrics?.avgGrowth || 0);
                    return rate > 100 ? '100%' : rate.toFixed(1) + '%';
                  })()}
                </span>
              </div>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {(analyticsData.metrics?.successRate || 0).toFixed(1)}%
              </p>
              <div className={`flex items-center mt-1 ${
                (analyticsData.metrics?.successGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(analyticsData.metrics?.successGrowth || 0) >= 0 ? 
                  <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                }
                <span className="text-sm ml-1">
                  {(() => {
                    const rate = Math.abs(analyticsData.metrics?.successGrowth || 0);
                    return rate > 100 ? '100%' : rate.toFixed(1) + '%';
                  })()}
                </span>
              </div>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.metrics?.totalCustomers || 0}
              </p>
              <div className={`flex items-center mt-1 ${
                (analyticsData.metrics?.customerGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(analyticsData.metrics?.customerGrowth || 0) >= 0 ? 
                  <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                }
                <span className="text-sm ml-1">
                  {(() => {
                    const rate = Math.abs(analyticsData.metrics?.customerGrowth || 0);
                    return rate > 100 ? '100%' : rate.toFixed(1) + '%';
                  })()}
                </span>
              </div>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4 flex-wrap justify-center">
          <span className="text-sm font-medium text-gray-900 dark:text-white">View:</span>
          <button
            onClick={() => setActiveChart('earnings')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'earnings'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Activity size={14} className="inline mr-1" />
            Earnings Trend
          </button>
          <button
            onClick={() => setActiveChart('status')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'status'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PieChart size={14} className="inline mr-1" />
            Status Distribution
          </button>
          <button
            onClick={() => setActiveChart('comparison')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'comparison'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 size={14} className="inline mr-1" />
            Monthly Comparison
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeChart === 'earnings' && 'Earnings Trend'}
              {activeChart === 'status' && 'Payment Status Distribution'}
              {activeChart === 'comparison' && 'Monthly Revenue Comparison'}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {timeRange.replace('d', ' Days').replace('months', ' Months').replace('1year', '1 Year')}
            </div>
          </div>
          
          <div className="h-80">
            {activeChart === 'earnings' && (
              <Line data={earningsChartData} options={chartOptions} />
            )}
            {activeChart === 'status' && (
              <Doughnut data={statusChartData} options={doughnutOptions} />
            )}
            {activeChart === 'comparison' && (
              <Bar data={monthlyComparisonData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Top Performing Plans */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Plans
            </h3>
            <div className="space-y-3">
              {analyticsData.topPlans?.slice(0, 5).map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {plan.sales} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(plan.revenue)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No plan data available
                </p>
              )}
            </div>
          </div>

          {/* Payment Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Insights
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Peak Hour: 2-4 PM
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Most payments received
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Best Day: Sunday
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Highest conversion rate
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Avg. Customer Value
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(analyticsData.metrics?.avgCustomerValue || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Status Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(analyticsData.statusDistribution || {}).map(([status, count]) => {
                const percentage = ((count / (analyticsData.metrics?.totalTransactions || 1)) * 100).toFixed(1);
                const colorClass = {
                  SUCCESS: 'bg-green-500',
                  PENDING: 'bg-yellow-500',
                  FAILED: 'bg-red-500',
                  EXPIRED: 'bg-gray-500'
                }[status] || 'bg-gray-500';

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {status.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
