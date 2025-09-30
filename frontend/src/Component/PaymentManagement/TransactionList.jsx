import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { calculatePlatformFee } from '../../utils/platformFeeConfig';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  CreditCard,
  Package,
  Receipt,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Phone,
  Mail
} from 'lucide-react';

const TransactionList = ({ onTransactionSelect, selectedTransaction, onNetSubtotalChange }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    plan: 'all',
    dateRange: 'all',
    amount: { min: '', max: '' }
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0
  });

  // Compute Net Earned Amount array from transactions
  const netEarnedAmounts = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.map((t) => {
      const possible =
        t?.netEarnedAmount ??
        t?.net_earned_amount ??
        t?.netAmount ??
        t?.net_amount;
      if (typeof possible === 'number' && Number.isFinite(possible)) {
        return possible;
      }
      // Derive net for successful transactions using platform fee util
      if (t?.status === 'SUCCESS' && typeof t?.amount === 'number') {
        const feeCalc = calculatePlatformFee(t.amount, t.createdAt);
        return typeof feeCalc?.netAmount === 'number' ? feeCalc.netAmount : 0;
      }
      return 0;
    });
  }, [transactions]);

  // Total of Net Earned Amount array
  const totalNetEarnedAmount = useMemo(() => {
    return netEarnedAmounts.reduce((sum, val) => sum + (Number.isFinite(val) ? val : 0), 0);
  }, [netEarnedAmounts]);

  // Log Net Earned Amount array when transactions change
  useEffect(() => {
    if (!loading) {
      console.log('Net Earned Amount array:', netEarnedAmounts);
      console.log('Net Earned Amount total:', totalNetEarnedAmount);
      // Notify parent if callback provided
      if (typeof onNetSubtotalChange === 'function') {
        onNetSubtotalChange(totalNetEarnedAmount);
      }
    }
  }, [loading, netEarnedAmounts, totalNetEarnedAmount]);

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Status configurations
  const statusConfig = {
    SUCCESS: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', 
      icon: <CheckCircle size={14} />,
      label: 'Successful'
    },
    FAILED: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 
      icon: <XCircle size={14} />,
      label: 'Failed'
    },
    PENDING: { 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', 
      icon: <Clock size={14} />,
      label: 'Pending'
    },
    EXPIRED: { 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', 
      icon: <AlertCircle size={14} />,
      label: 'Expired'
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.plan !== 'all' && { planId: filters.plan }),
        ...(filters.dateRange !== 'all' && { dateRange: filters.dateRange }),
        ...(filters.amount.min && { minAmount: filters.amount.min }),
        ...(filters.amount.max && { maxAmount: filters.amount.max })
      });

      const response = await axios.get(
        `http://localhost:4000/api/payments/admin?${params}`,
        { headers: getAuthHeader() }
      );

      setTransactions(response.data.payments || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Fallback to mock data for demo
      const mockTransactions = [
        {
          _id: '66f4e1b1c1234567890abcd1',
          customerName: 'Fresh User',
          phone: '+91 9998887777',
          customerEmail: 'test_99888777@example.com',
          plan_name: 'Test Plan (43200 min)',
          amount: 1800,
          status: 'PENDING',
          createdAt: '2024-08-31T10:16:00.000Z',
          link_id: 'pl_abc123def456'
        },
        {
          _id: '66f4e1b1c1234567890abcd2',
          customerName: 'Fresh User',
          phone: '+91 9521119080',
          customerEmail: 'test_99888777@example.com',
          plan_name: 'Test Plan (43200 min)',
          amount: 3000,
          status: 'PENDING',
          createdAt: '2024-08-28T09:08:00.000Z',
          link_id: 'pl_def456ghi789'
        },
        {
          _id: '66f4e1b1c1234567890abcd3',
          customerName: 'Test ExpiredUser',
          phone: '+91 8309786579',
          customerEmail: 'expired@test.com',
          plan_name: 'Test Plan (525600 min)',
          amount: 1800,
          status: 'PENDING',
          createdAt: '2024-08-26T06:05:00.000Z',
          link_id: 'pl_ghi789jkl012'
        },
        {
          _id: '66f4e1b1c1234567890abcd4',
          customerName: 'Test ExpiredUser',
          phone: '+91 7098188549',
          customerEmail: 'expired2@test.com',
          plan_name: 'Test Plan (1440 min)',
          amount: 1800,
          status: 'PENDING',
          createdAt: '2024-08-20T10:32:00.000Z',
          link_id: 'pl_jkl012mno345'
        }
      ];
      
      setTransactions(mockTransactions);
      setPagination(prev => ({
        ...prev,
        total: 4,
        pages: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchTransactions();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filters, sortBy, sortOrder]);

  // Initial load and pagination
  useEffect(() => {
    fetchTransactions();
  }, [pagination.page]);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Memoized formatting functions for better performance
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);
  
  const formatPhoneDisplay = useCallback((phone) => {
    if (!phone) return 'N/A';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
    return phone;
  }, []);

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export transactions
  const handleExport = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/payments/admin/export`,
        { 
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Export functionality will be available once the backend API is ready');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Showing {pagination.total} transactions
          </p>
        </div>
        
        {/* Quick Filter Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Quick filters:</span>
          <button
            onClick={() => setFilters({...filters, status: 'SUCCESS'})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.status === 'SUCCESS' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Successful
          </button>
          <button
            onClick={() => setFilters({...filters, status: 'PENDING'})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.status === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilters({...filters, status: 'all'})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.status === 'all' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {/* Date Range */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchTransactions}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Amount</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <CreditCard className="mx-auto mb-2" size={48} />
                    <p className="text-lg font-medium mb-1">No transactions found</p>
                    <p className="text-sm">Try adjusting your filters or search criteria</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr 
                    key={transaction._id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      selectedTransaction === transaction._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => onTransactionSelect?.(transaction._id)}
                  >
                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(transaction.createdAt)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(transaction.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Customer Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User size={14} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {transaction.customerName || 'Unknown Customer'}
                          </p>
                          {transaction.phone && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Phone size={12} className="text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatPhoneDisplay(transaction.phone)}
                              </p>
                            </div>
                          )}
                          {transaction.customerEmail && (
                            <div className="flex items-center space-x-1">
                              <Mail size={12} className="text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {transaction.customerEmail}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Package size={16} className="text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.plan_name || 'Premium'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Plan Subscription
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          transaction.status === 'SUCCESS' ? 'text-green-600' :
                          transaction.status === 'PENDING' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {transaction.status === 'SUCCESS' ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        {transaction.status === 'SUCCESS' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Gross amount
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusConfig[transaction.status]?.color || statusConfig.PENDING.color
                      }`}>
                        {statusConfig[transaction.status]?.icon || statusConfig.PENDING.icon}
                        <span className="ml-1.5">
                          {statusConfig[transaction.status]?.label || 'Pending'}
                        </span>
                      </span>
                      {transaction.failure_reason && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-32" title={transaction.failure_reason}>
                          {transaction.failure_reason}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransactionSelect?.(transaction._id);
                          }}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {transaction.invoiceId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/admin/admin-invoices?id=${transaction.invoiceId}`, '_blank');
                            }}
                            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            title="View Invoice"
                          >
                            <Receipt size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="More Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination with Items per Page */}
        <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Items per page</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setPagination(prev => ({ 
                      ...prev, 
                      limit: newLimit, 
                      page: 1 
                    }));
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span> of{' '}
                  <span className="font-medium">{pagination.total}</span> transactions
                </p>
              </div>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  Previous
                </button>

                {/* Page info */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.pages}</span>
                  </span>
                </div>

                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  Next
                  <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
