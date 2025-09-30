import axios from 'axios';
import { safeAPICall, createCache, performanceMonitor, APIError, NetworkError, AuthenticationError } from '../utils/errorHandler';

const API_BASE_URL = 'http://localhost:4000/api';

// Create cache instances for different data types
const analyticsCache = createCache(2 * 60 * 1000); // 2 minutes for analytics
const paymentCache = createCache(30 * 1000); // 30 seconds for payments
const statsCache = createCache(60 * 1000); // 1 minute for stats

// Get auth header with tenant context
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  
  return {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-ID': tenantId }),
    'Content-Type': 'application/json'
  };
};

class PaymentService {
  constructor() {
    this.setupAxiosInterceptors();
  }

  // Setup axios interceptors for better error handling
  setupAxiosInterceptors() {
    // Request interceptor
    axios.interceptors.request.use(
      (config) => {
        // Add timestamp to requests
        config.metadata = { startTime: performance.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    axios.interceptors.response.use(
      (response) => {
        // Log performance
        const duration = performance.now() - response.config.metadata.startTime;
        if (duration > 2000) {
          console.warn(`Slow API request: ${response.config.url} took ${duration.toFixed(2)}ms`);
        }
        return response;
      },
      (error) => {
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          throw new NetworkError('Unable to connect to server');
        }
        if (error.response?.status === 401) {
          throw new AuthenticationError('Authentication required');
        }
        if (error.response) {
          throw new APIError(
            error.response.data?.message || 'API Error',
            error.response.status,
            error.response.data?.code,
            error.response.data
          );
        }
        throw error;
      }
    );
  }
  
  // Fetch payment analytics for dashboard with caching
  async getPaymentAnalytics(timeRange = '6months', useCache = true) {
    const cacheKey = `analytics_${timeRange}`;
    
    if (useCache && analyticsCache.has(cacheKey)) {
      return {
        success: true,
        data: analyticsCache.get(cacheKey),
        fromCache: true
      };
    }

    return await safeAPICall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/analytics?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      
      // Cache the result
      analyticsCache.set(cacheKey, response.data);
      
      return response.data;
    }, 'Payment Analytics');
  }

  // Fetch detailed analytics for charts with caching
  async getDetailedAnalytics(timeRange = '6months', useCache = true) {
    const cacheKey = `detailed_analytics_${timeRange}`;
    
    if (useCache && analyticsCache.has(cacheKey)) {
      return {
        success: true,
        data: analyticsCache.get(cacheKey),
        fromCache: true
      };
    }

    return await safeAPICall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/detailed-analytics?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      
      // Cache the result
      analyticsCache.set(cacheKey, response.data);
      
      return response.data;
    }, 'Detailed Analytics');
  }

  // Fetch payments with filtering, pagination and smart caching
  async getPayments(params = {}, useCache = true) {
    // Create cache key from params
    const cacheKey = `payments_${JSON.stringify(params)}`;
    
    // Don't use cache for real-time data or first page
    const shouldCache = useCache && !params.search && params.page > 1;
    
    if (shouldCache && paymentCache.has(cacheKey)) {
      return {
        success: true,
        data: paymentCache.get(cacheKey),
        fromCache: true
      };
    }

    return await safeAPICall(async () => {
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 15,
        ...(params.search && { search: params.search }),
        ...(params.status && params.status !== 'all' && { status: params.status }),
        ...(params.planId && params.planId !== 'all' && { planId: params.planId }),
        ...(params.dateRange && params.dateRange !== 'all' && { dateRange: params.dateRange }),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortOrder && { sortOrder: params.sortOrder }),
        ...(params.minAmount && { minAmount: params.minAmount }),
        ...(params.maxAmount && { maxAmount: params.maxAmount })
      });

      const response = await axios.get(
        `${API_BASE_URL}/payments/admin?${queryParams}`,
        { headers: getAuthHeader() }
      );
      
      const result = {
        payments: response.data.payments || [],
        pagination: response.data.pagination || {},
        stats: response.data.stats || {},
        plans: response.data.plans || []
      };
      
      // Cache non-search results
      if (shouldCache) {
        paymentCache.set(cacheKey, result, 30 * 1000); // 30 seconds for payment data
      }
      
      return result;
    }, 'Payment List');
  }

  // Get payment details by ID
  async getPaymentDetails(paymentId) {
    try {
      const authHeaders = getAuthHeader();
      
      // Debug auth headers
      console.log('🔍 Payment details request:', {
        paymentId,
        hasToken: !!authHeaders.Authorization,
        hasTenantId: !!authHeaders['X-Tenant-ID'],
        url: `${API_BASE_URL}/payments/admin/${paymentId}`
      });

      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/${paymentId}`,
        { headers: authHeaders }
      );
      
      console.log('✅ Payment details response:', response.status);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error fetching payment details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        error: error.message
      });
      
      // Check if it's an auth error
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required. Please log in again.',
          authError: true
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payment details'
      };
    }
  }

  // Export payments data
  async exportPayments(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        ...(params.status && params.status !== 'all' && { status: params.status }),
        ...(params.dateRange && params.dateRange !== 'all' && { dateRange: params.dateRange }),
        ...(params.planId && params.planId !== 'all' && { planId: params.planId })
      });

      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/export?${queryParams}`,
        { 
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Export completed successfully'
      };
    } catch (error) {
      console.error('Error exporting payments:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to export payments'
      };
    }
  }

  // Get payment statistics
  async getPaymentStats(timeRange = '30d') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/stats?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payment statistics'
      };
    }
  }

  // Process refund
  async processRefund(paymentId, refundData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/admin/${paymentId}/refund`,
        refundData,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to process refund'
      };
    }
  }

  // Update payment status (admin only)
  async updatePaymentStatus(paymentId, newStatus, reason = '') {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/payments/admin/${paymentId}/status`,
        { status: newStatus, reason },
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data,
        message: 'Payment status updated successfully'
      };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update payment status'
      };
    }
  }

  // Get revenue insights
  async getRevenueInsights(timeRange = '30d') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/revenue-insights?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching revenue insights:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch revenue insights'
      };
    }
  }

  // Get plan performance data
  async getPlanPerformance(timeRange = '30d') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/plan-performance?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching plan performance:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch plan performance'
      };
    }
  }

  // Search customers for payment linking
  async searchCustomers(searchTerm) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/customers/search?q=${encodeURIComponent(searchTerm)}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data.customers || []
      };
    } catch (error) {
      console.error('Error searching customers:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search customers'
      };
    }
  }

  // Get customer payment history
  async getCustomerPaymentHistory(customerId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/customer/${customerId}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching customer payment history:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch customer payment history'
      };
    }
  }

  // Generate payment report
  async generatePaymentReport(params = {}) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/admin/generate-report`,
        params,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data,
        message: 'Report generated successfully'
      };
    } catch (error) {
      console.error('Error generating payment report:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate payment report'
      };
    }
  }

  // Get payment trends for forecasting
  async getPaymentTrends(timeRange = '6months') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin/trends?timeRange=${timeRange}`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching payment trends:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payment trends'
      };
    }
  }

  // Resend payment notification
  async resendPaymentNotification(paymentId, method = 'email') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/admin/${paymentId}/resend-notification`,
        { method },
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data,
        message: 'Notification sent successfully'
      };
    } catch (error) {
      console.error('Error resending notification:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resend notification'
      };
    }
  }

  // Bulk operations on payments
  async bulkUpdatePayments(paymentIds, action, data = {}) {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/payments/admin/bulk-update`,
        { paymentIds, action, data },
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data,
        message: 'Bulk update completed successfully'
      };
    } catch (error) {
      console.error('Error in bulk update:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to perform bulk update'
      };
    }
  }

  // Get payment gateway status
  async getGatewayStatus() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/gateway/status`,
        { headers: getAuthHeader() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching gateway status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch gateway status'
      };
    }
  }

  // Check authentication status
  async checkAuthStatus() {
    try {
      const authHeaders = getAuthHeader();
      
      if (!authHeaders.Authorization) {
        return {
          success: false,
          error: 'No authentication token found',
          needsLogin: true
        };
      }
      
      // Try a simple API call to check if auth is working
      const response = await axios.get(
        `${API_BASE_URL}/payments/admin?page=1&limit=1`,
        { headers: authHeaders }
      );
      
      return {
        success: true,
        message: 'Authentication valid',
        data: { hasAccess: true }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication expired',
          needsLogin: true
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Authentication check failed',
        needsLogin: error.response?.status === 401
      };
    }
  }

  // Utility functions
  formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
  }

  getStatusColor(status) {
    const statusColors = {
      SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return statusColors[status] || statusColors.PENDING;
  }

  getPaymentIcon(status) {
    const icons = {
      SUCCESS: '✅',
      FAILED: '❌',
      PENDING: '⏳',
      EXPIRED: '⚠️'
    };
    return icons[status] || icons.PENDING;
  }

  // Calculate platform fee dynamically using the new fee management system
  async calculatePlatformFee(amount, tenantId = null, channelBundleId = null) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/platform-fees/calculate`,
        { 
          amount, 
          tenantId: tenantId || localStorage.getItem('tenantId'),
          channelBundleId 
        },
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        return response.data.data.platformFee;
      } else {
        // Fallback to static calculation if API fails
        console.warn('Dynamic fee calculation failed, using fallback rate');
        return (amount * 2.9) / 100;
      }
    } catch (error) {
      // Fallback to static calculation if API fails
      console.warn('Dynamic fee calculation error, using fallback rate:', error);
      return (amount * 2.9) / 100;
    }
  }

  // Calculate net earnings using dynamic platform fee
  async calculateNetEarnings(amount, tenantId = null, channelBundleId = null) {
    const platformFee = await this.calculatePlatformFee(amount, tenantId, channelBundleId);
    return amount - platformFee;
  }

  // Get detailed fee calculation breakdown
  async getDetailedFeeCalculation(amount, tenantId = null, channelBundleId = null) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/platform-fees/calculate`,
        { 
          amount, 
          tenantId: tenantId || localStorage.getItem('tenantId'),
          channelBundleId 
        },
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        // Return fallback calculation
        const fallbackFee = (amount * 2.9) / 100;
        return {
          success: true,
          data: {
            transactionAmount: amount,
            platformFee: fallbackFee,
            netAmount: amount - fallbackFee,
            feeRate: 2.9,
            feeType: 'percentage',
            currency: 'INR',
            configUsed: null,
            calculatedAt: new Date(),
            breakdown: {
              grossAmount: amount,
              platformFee: fallbackFee,
              netAmount: amount - fallbackFee,
              calculation: {
                type: 'percentage',
                rate: 2.9,
                baseAmount: amount,
                calculatedFee: fallbackFee
              }
            },
            fallback: true,
            fallbackReason: 'No active fee configuration found'
          }
        };
      }
    } catch (error) {
      console.error('Detailed fee calculation error:', error);
      // Return fallback calculation
      const fallbackFee = (amount * 2.9) / 100;
      return {
        success: true,
        data: {
          transactionAmount: amount,
          platformFee: fallbackFee,
          netAmount: amount - fallbackFee,
          feeRate: 2.9,
          feeType: 'percentage',
          currency: 'INR',
          configUsed: null,
          calculatedAt: new Date(),
          breakdown: {
            grossAmount: amount,
            platformFee: fallbackFee,
            netAmount: amount - fallbackFee,
            calculation: {
              type: 'percentage',
              rate: 2.9,
              baseAmount: amount,
              calculatedFee: fallbackFee
            }
          },
          fallback: true,
          fallbackReason: error.message || 'API error'
        }
      };
    }
  }

  // Validate payment data
  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!paymentData.customer_id && !paymentData.customerEmail && !paymentData.phone) {
      errors.push('Customer identification is required');
    }

    if (!paymentData.plan_id && !paymentData.plan_name) {
      errors.push('Plan information is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format payment status for display
  formatPaymentStatus(status) {
    const statusLabels = {
      SUCCESS: 'Payment Received',
      FAILED: 'Payment Failed',
      PENDING: 'Payment Pending',
      EXPIRED: 'Payment Expired'
    };
    return statusLabels[status] || 'Unknown Status';
  }

  // Get transaction summary
  getTransactionSummary(transactions) {
    const summary = {
      total: transactions.length,
      successful: 0,
      pending: 0,
      failed: 0,
      expired: 0,
      totalAmount: 0,
      successfulAmount: 0
    };

    transactions.forEach(transaction => {
      summary.totalAmount += transaction.amount || 0;
      
      switch (transaction.status) {
        case 'SUCCESS':
          summary.successful += 1;
          summary.successfulAmount += transaction.amount || 0;
          break;
        case 'PENDING':
          summary.pending += 1;
          break;
        case 'FAILED':
          summary.failed += 1;
          break;
        case 'EXPIRED':
          summary.expired += 1;
          break;
      }
    });

    summary.successRate = summary.total > 0 ? (summary.successful / summary.total) * 100 : 0;
    summary.avgTransactionAmount = summary.total > 0 ? summary.totalAmount / summary.total : 0;

    return summary;
  }

  // Group transactions by date for charts
  groupTransactionsByDate(transactions, groupBy = 'day') {
    const grouped = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      let key;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          count: 0,
          amount: 0,
          successful: 0,
          failed: 0,
          pending: 0
        };
      }

      grouped[key].count += 1;
      grouped[key].amount += transaction.amount || 0;

      switch (transaction.status) {
        case 'SUCCESS':
          grouped[key].successful += 1;
          break;
        case 'FAILED':
          grouped[key].failed += 1;
          break;
        case 'PENDING':
          grouped[key].pending += 1;
          break;
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Calculate growth rate
  calculateGrowthRate(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Get time range dates
  getTimeRangeDates(range) {
    const now = new Date();
    const ranges = {
      '7d': new Date(now.setDate(now.getDate() - 7)),
      '30d': new Date(now.setDate(now.getDate() - 30)),
      '90d': new Date(now.setDate(now.getDate() - 90)),
      '3months': new Date(now.setMonth(now.getMonth() - 3)),
      '6months': new Date(now.setMonth(now.getMonth() - 6)),
      '1year': new Date(now.setFullYear(now.getFullYear() - 1))
    };

    return {
      startDate: ranges[range] || ranges['30d'],
      endDate: new Date()
    };
  }
}

// Create singleton instance
const paymentService = new PaymentService();

export default paymentService;
