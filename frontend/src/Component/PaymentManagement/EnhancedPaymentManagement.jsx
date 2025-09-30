import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { calculatePlatformFee } from '../../utils/platformFeeConfig';
import { 
  BarChart3, 
  List, 
  Settings,
  Bell,
  Filter,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';

// Lazy load components for better performance
const PaymentDashboard = lazy(() => import('./PaymentDashboard'));
const TransactionList = lazy(() => import('./TransactionList'));
const PaymentDetailSidebar = lazy(() => import('./PaymentDetailSidebar'));
const PaymentAnalytics = lazy(() => import('./PaymentAnalytics'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <RefreshCw className="animate-spin" size={24} />
    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
);

import paymentService from '../../services/paymentService';

const EnhancedPaymentManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
    active: true,
    processing: false
  });
  const [listNetSubtotal, setListNetSubtotal] = useState(0);

  // Tab configuration
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 size={16} />,
      component: PaymentDashboard
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <List size={16} />,
      component: TransactionList
    },
    {
      id: 'analytics',
      label: 'Analytics', 
      icon: <BarChart3 size={16} />,
      component: PaymentAnalytics
    }
  ];

  // Handle transaction selection
  const handleTransactionSelect = (paymentId) => {
    setSelectedPaymentId(paymentId);
    setIsSidebarOpen(true);
  };

  // Handle sidebar close
  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    setSelectedPaymentId(null);
  };

  // Handle navigate to transactions from dashboard
  const handleNavigateToTransactions = () => {
    setActiveTab('transactions');
  };

  // Receive subtotal from TransactionList
  const handleNetSubtotalChange = (total) => {
    if (typeof total === 'number' && Number.isFinite(total)) {
      setListNetSubtotal(total);
    }
  };

  // Check payment gateway status
  useEffect(() => {
    const checkGatewayStatus = async () => {
      const result = await paymentService.getGatewayStatus();
      if (result.success) {
        setPaymentStatus(result.data);
      }
    };

    checkGatewayStatus();
  }, []);

  // helper: auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Preload Net Earned subtotal similar to TransactionList default view
  useEffect(() => {
    const preloadNetSubtotal = async () => {
      try {
        // First try backend analytics subtotal (uses same logic as Payment Details)
        const analyticsRes = await axios.get(
          `http://localhost:4000/api/analytics/revenue?dateRange=30d`,
          { headers: getAuthHeader() }
        );
        const serverSubtotal = analyticsRes?.data?.netEarnedSubtotal;
        if (typeof serverSubtotal === 'number' && Number.isFinite(serverSubtotal)) {
          setListNetSubtotal(serverSubtotal);
          return;
        }

        // Fallback: derive from payments list
        const params = new URLSearchParams({
          page: 1,
          limit: 15,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        const response = await axios.get(
          `http://localhost:4000/api/payments/admin?${params}`,
          { headers: getAuthHeader() }
        );
        const payments = response.data?.payments || [];
        const subtotal = payments.reduce((sum, t) => {
          // Prefer explicit net fields
          const possible =
            t?.netEarnedAmount ??
            t?.net_earned_amount ??
            t?.netAmount ??
            t?.net_amount;
          if (typeof possible === 'number' && Number.isFinite(possible)) {
            return sum + possible;
          }
          if (t?.status === 'SUCCESS' && typeof t?.amount === 'number') {
            const feeCalc = calculatePlatformFee(t.amount, t.createdAt);
            const net = typeof feeCalc?.netAmount === 'number' ? feeCalc.netAmount : 0;
            return sum + net;
          }
          return sum;
        }, 0);
        setListNetSubtotal(subtotal);
      } catch (err) {
        // keep default 0 on error
      }
    };
    preloadNetSubtotal();
  }, []);

  // Render active component with Suspense for lazy loading
  const renderActiveComponent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;

    const Component = activeTabConfig.component;

    const componentProps = {
      dashboard: { onTransactionClick: handleNavigateToTransactions, externalNetSubtotal: null }, // Don't pass external subtotal to dashboard
      transactions: { 
        onTransactionSelect: handleTransactionSelect,
        selectedTransaction: selectedPaymentId,
        onNetSubtotalChange: handleNetSubtotalChange
      },
      analytics: { externalNetSubtotal: listNetSubtotal }
    };

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Component {...(componentProps[activeTab] || {})} />
      </Suspense>
    );
  };

  return (
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  {/* Header */}
  <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
    <div className="px-4 sm:px-6 py-4">
      {/* Top Row: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title and Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Payment Management
          </h1>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>
            <div className={`flex items-center space-x-1 ${
              paymentStatus.active ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                paymentStatus.active ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium">
                {paymentStatus.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-4 overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-3 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>

  {/* Main Content */}
  <div className="px-4 sm:px-6 py-6">
    {renderActiveComponent()}
  </div>

  {/* Payment Detail Sidebar with Suspense */}
  {isSidebarOpen && (
    <Suspense fallback={<LoadingSpinner />}>
      <PaymentDetailSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        paymentId={selectedPaymentId}
      />
    </Suspense>
  )}
</div>
  );
};

export default EnhancedPaymentManagement;
