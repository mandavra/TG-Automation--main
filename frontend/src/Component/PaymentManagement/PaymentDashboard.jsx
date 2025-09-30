// PaymentDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  CreditCard,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  LineChart
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

const PaymentDashboard = ({ onTransactionClick, externalNetSubtotal }) => {
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    successfulTransactions: 0,
    totalTransactions: 0,
    recentTransactions: [],
    chartData: [],
    growthRate: 0,
    platformFee: 0,
    earnedAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [chartType, setChartType] = useState('line');

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
        `http://localhost:4000/api/analytics/revenue?dateRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      const data = response.data;
      console.log('Raw analytics data from API:', data);
      // Derive fallback subtotal from recent transactions if API subtotal is missing/zero
      const fallbackSubtotal = (() => {
        try {
          const recent = data.recentTransactions || [];
          if (!Array.isArray(recent) || recent.length === 0) return 0;
          const sum = recent.reduce((acc, t) => {
            const amt = Number(t.amount) || 0;
            const net = (typeof t.netAmount === 'number' && Number.isFinite(t.netAmount))
              ? t.netAmount
              : (amt - (Number(t.platformFee) || 0));
            return acc + (Number.isFinite(net) ? Math.max(0, net) : 0);
          }, 0);
          return sum;
        } catch {
          return 0;
        }
      })();

      // Dashboard should always use its own analytics data, not external subtotal
      const finalNetSubtotal = (typeof data.netEarnedSubtotal === 'number' && data.netEarnedSubtotal > 0)
        ? data.netEarnedSubtotal
        : fallbackSubtotal;

      setAnalytics({
        totalEarnings: data.totalRevenue || 0,
        monthlyEarnings: data.monthlyRevenue || 0,
        successfulTransactions: data.recentTransactions ? data.recentTransactions.filter(t => t.status === 'SUCCESS').length : 0,
        totalTransactions: data.recentTransactions ? data.recentTransactions.length : 0,
        recentTransactions: data.recentTransactions || [],
        chartData: (data.monthlyData || []).map(item => {
          // Use netRevenue if available, otherwise calculate from revenue
          const netAmount = item.netRevenue || (item.revenue - (item.platformFees || 0) || 0);
          // Use the actual transaction date for the label if available
          const date = item.latestTransactionDate
            ? item.latestTransactionDate
            : (item.date || new Date().toISOString());
          return {
            date,
            amount: netAmount,
            revenue: item.revenue || 0,
            netRevenue: typeof item.netRevenue === 'number' ? item.netRevenue : (item.revenue - (item.platformFees || 0) || 0),
            platformFees: item.platformFees || 0
          };
        }),
        growthRate: data.growthRate || 0,
        netEarnedSubtotal: finalNetSubtotal
      });

      console.log('DEBUG - Analytics data received:', {
        externalNetSubtotal,
        dataNetEarnedSubtotal: data.netEarnedSubtotal,
        fallbackSubtotal,
        finalNetSubtotal,
        growthRate: data.growthRate,
        totalRevenue: data.totalRevenue
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        totalEarnings: 0,
        monthlyEarnings: 0,
        successfulTransactions: 0,
        totalTransactions: 0,
        recentTransactions: [],
        chartData: [],
        growthRate: 0,
        netEarnedSubtotal: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dashboard should always fetch its own analytics data
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date for chart based on time range
  const formatChartDate = (date, range) => {
    const d = new Date(date);

    switch (range) {
      case '7d':
      case '30d':
      case '3months':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '6months':
      case '1year':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Show month and day
      case 'lifetime':
        return d.getFullYear().toString();
      default:
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.formattedValue;
            return `${label}: ${formatCurrency(Number(value))}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#6B7280', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
        border: { display: false },
        ticks: {
          color: '#6B7280',
          font: { size: 12 },
          callback: function (value) {
            // show abbreviated y-axis (₹50k -> 50k)
            if (value >= 100000) return '₹' + (value / 1000) + 'k';
            return '₹' + value;
          }
        }
      }
    },
    interaction: { intersect: false, mode: 'index' }
  };

  // Build chart datasets including cumulative subtotal dataset
  const labels = analytics.chartData?.map(item => formatChartDate(item.date, timeRange)) || [];

  const perPeriodNet = analytics.chartData && analytics.chartData.length > 0
    ? analytics.chartData.map(item => Number(item.amount || 0))
    : [];

  // Build cumulative (running) subtotal
  const cumulative = [];
  perPeriodNet.reduce((acc, val, idx) => {
    const next = acc + val;
    cumulative.push(next);
    return next;
  }, 0);

  // Remove this block:
  // const netEarnedAmount = analytics.recentTransactions
  //   .filter(tx => tx.status === 'SUCCESS')
  //   .reduce((sum, tx) => { ... }, 0);
  // Instead, use analytics.netEarnedSubtotal from backend

  // Chart datasets
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Net Earned (Per Period)',
        data: perPeriodNet,
        type: chartType === 'bar' ? 'bar' : 'line',
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.12)',
        borderWidth: chartType === 'bar' ? 1 : 2,
        fill: chartType === 'line',
        tension: chartType === 'line' ? 0.35 : 0,
        pointRadius: chartType === 'line' ? 4 : 0,
        pointHoverRadius: chartType === 'line' ? 6 : 0,
        order: 1
      },
      {
        label: 'Net Earned Subtotal (Cumulative)',
        data: cumulative,
        type: 'line',
        borderColor: 'rgb(16, 185, 129)', // green
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: false,
        borderDash: [4, 4],
        order: 2
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin mr-2" size={24} />
        <span className="text-gray-600 dark:text-gray-400">Loading dashboard...</span>
      </div>
    );
  }

  // helper for time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case '1year': return 'Last Year';
      case 'lifetime': return 'Lifetime';
      default: return 'Custom Range';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'SUCCESS') return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
    if (status === 'PENDING') return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
    if (status === 'FAILED') return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
    return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
  };

  // Helper to calculate net amount for a single transaction
  const calculateNetTransactionAmount = (transaction) => {
    const amount = Number(transaction.amount || 0);

    if (typeof transaction.netAmount === 'number') {
      return transaction.netAmount;
    }

    if (typeof transaction.platformFee === 'number') {
      return amount - transaction.platformFee;
    }

    if (typeof transaction.adminPlatformFee === 'number') {
      if (transaction.adminPlatformFee >= 1) {
        return amount - transaction.adminPlatformFee;
      } else {
        return amount - (amount * transaction.adminPlatformFee);
      }
    }

    // fallback 2.9%
    return amount - (amount * 0.029);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Track your earnings and transaction performance
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 flex-wrap gap-3 md:gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full sm:w-auto"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="lifetime">Lifetime</option>
          </select>

          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex-wrap gap-3 md:gap-4">
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'line'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <LineChart size={14} className="mr-1" /> Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'bar'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <BarChart3 size={14} className="mr-1" /> Bar
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Earnings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4 sm:gap-0 flex-wrap">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              EARNINGS • {getTimeRangeLabel()}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics.netEarnedSubtotal || 0)}
            </h2>
          </div>
          <div className="text-right">
            <div className={`flex items-center space-x-1 ${analytics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.growthRate >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span className="text-sm font-medium">
                {(() => {
                  const rate = Math.abs(analytics.growthRate);
                  return rate > 100 ? '100%' : rate.toFixed(1) + '%';
                })()}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs last period</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          {analytics.chartData && analytics.chartData.length > 0 ? (
            chartType === 'line' ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Net Earned Amount Stat */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-700 p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1 font-semibold">Net Earned Amount (Subtotal)</p>
          <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(analytics.netEarnedSubtotal || 0)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sum of successful transactions (after fees)</p>
        </div>
        <DollarSign className="h-8 w-8 text-blue-400" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-wrap">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Earnings This Month</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.monthlyEarnings)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">After platform fees</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-xl font-bold text-green-600">
                {((analytics.successfulTransactions / analytics.totalTransactions) * 100 || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {analytics.successfulTransactions} of {analytics.totalTransactions}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.totalTransactions}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All payment attempts</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <button
            onClick={() => onTransactionClick?.()}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center"
          >
            View all
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {analytics.recentTransactions && analytics.recentTransactions.length > 0 ? (
            analytics.recentTransactions.slice(0, 5).map((transaction, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.userName || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.plan_name} • {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Amount & Time */}
                  <div className="text-right flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-2 sm:mt-0">
                    <p className={`text-sm font-medium ${transaction.status === 'SUCCESS' ? 'text-green-600' :
                      transaction.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                      {transaction.status === 'SUCCESS' ? '+' : ''}
                      {formatCurrency(calculateNetTransactionAmount(transaction))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(transaction.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <CreditCard className="mx-auto mb-2" size={48} />
              <p>No recent transactions</p>
            </div>
          )}
        </div>
      </div>

    </div>

  );
};

export default PaymentDashboard;
