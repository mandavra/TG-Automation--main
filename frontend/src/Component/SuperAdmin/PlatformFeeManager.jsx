import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Settings,
  Plus,
  Edit,
  Eye,
  Check,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  History,
  Calculator,
  Target,
  BarChart3,
  Layers,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import axios from 'axios';

/**
 * Platform Fee Manager Component
 * 
 * Comprehensive platform fee management interface for Super Admin with:
 * - Fee configuration management
 * - Historical data protection
 * - Real-time fee calculation
 * - Analytics and reporting
 * - Audit trail visualization
 */

const PlatformFeeManager = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [feeConfigs, setFeeConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Configuration Management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  // Form State for New Configuration
  const [formData, setFormData] = useState({
    scope: 'global',
    tenantId: '',
    channelBundleId: '',
    effectiveFrom: '',
    feeType: 'percentage',
    percentageRate: '',
    fixedAmount: '',
    currency: 'INR',
    minFee: '',
    maxFee: '',
    changeReason: '',
    adminNotes: ''
  });

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [feeCalculation, setFeeCalculation] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);

  // State for bulk platform fee update
  const [bulkFee, setBulkFee] = useState('');
  const [bulkFeeLoading, setBulkFeeLoading] = useState(false);
  const [bulkFeeError, setBulkFeeError] = useState('');
  const [bulkFeeSuccess, setBulkFeeSuccess] = useState('');

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // API Base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  // Load fee configurations
  const loadFeeConfigs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/platform-fees`, {
        headers: getAuthHeader(),
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          scope: scopeFilter === 'all' ? undefined : scopeFilter,
          page: 1,
          limit: 50
        }
      });

      if (response.data.success) {
        setFeeConfigs(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load fee configurations');
      }
    } catch (error) {
      console.error('Load fee configs error:', error);
      setError('Failed to load fee configurations');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/platform-fees/analytics`, {
        headers: getAuthHeader()
      });

      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  // Create new fee configuration
  const createFeeConfig = async (configData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/platform-fees`, configData, {
        headers: getAuthHeader()
      });

      if (response.data.success) {
        setSuccess('Fee configuration created successfully');
        setShowCreateModal(false);
        resetForm();
        loadFeeConfigs();
      } else {
        setError(response.data.message || 'Failed to create fee configuration');
      }
    } catch (error) {
      console.error('Create fee config error:', error);
      setError(error.response?.data?.message || 'Failed to create fee configuration');
    } finally {
      setLoading(false);
    }
  };

  // Approve fee configuration
  const approveFeeConfig = async (id, approvalNotes = '') => {
    setLoading(true);
    try {
      const response = await axios.patch(`${API_BASE}/api/platform-fees/${id}/approve`, 
        { approvalNotes }, 
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        setSuccess('Fee configuration approved and activated');
        loadFeeConfigs();
      } else {
        setError(response.data.message || 'Failed to approve fee configuration');
      }
    } catch (error) {
      console.error('Approve fee config error:', error);
      setError(error.response?.data?.message || 'Failed to approve fee configuration');
    } finally {
      setLoading(false);
    }
  };

  // Calculate fee for test amount
  const calculateTestFee = async (amount, tenantId = null) => {
    try {
      const response = await axios.post(`${API_BASE}/api/platform-fees/calculate`, 
        { amount, tenantId },
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        setFeeCalculation(response.data.data);
      } else {
        setError(response.data.message || 'Failed to calculate fee');
      }
    } catch (error) {
      console.error('Calculate fee error:', error);
      setError('Failed to calculate fee');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      scope: 'global',
      tenantId: '',
      channelBundleId: '',
      effectiveFrom: '',
      feeType: 'percentage',
      percentageRate: '',
      fixedAmount: '',
      currency: 'INR',
      minFee: '',
      maxFee: '',
      changeReason: '',
      adminNotes: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.effectiveFrom || !formData.changeReason) {
      setError('Effective date and change reason are required');
      return;
    }

    if (formData.feeType === 'percentage' && (!formData.percentageRate && formData.percentageRate !== 0)) {
      setError('Percentage rate is required for percentage fee type');
      return;
    }

    if (formData.feeType === 'fixed' && (!formData.fixedAmount && formData.fixedAmount !== 0)) {
      setError('Fixed amount is required for fixed fee type');
      return;
    }

    // Prepare data for API
    const configData = {
      ...formData,
      percentageRate: formData.percentageRate ? parseFloat(formData.percentageRate) : undefined,
      fixedAmount: formData.fixedAmount ? parseFloat(formData.fixedAmount) : undefined,
      minFee: formData.minFee ? parseFloat(formData.minFee) : undefined,
      maxFee: formData.maxFee ? parseFloat(formData.maxFee) : undefined
    };

    createFeeConfig(configData);
  };

  // Bulk update handler
  const handleBulkFeeUpdate = async () => {
    setBulkFeeError('');
    setBulkFeeSuccess('');
    if (!bulkFee || isNaN(Number(bulkFee))) {
      setBulkFeeError('Please enter a valid number');
      return;
    }
    setBulkFeeLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE}/api/admin/platform-fee/all`,
        { platformFee: Number(bulkFee) },
        { headers: getAuthHeader() }
      );
      if (response.data.success) {
        setBulkFeeSuccess(`Platform fee set to ${bulkFee} for all admins.`);
        setBulkFee('');
      } else {
        setBulkFeeError(response.data.message || 'Failed to update platform fee for all admins');
      }
    } catch (error) {
      setBulkFeeError(error.response?.data?.message || 'Failed to update platform fee for all admins');
    } finally {
      setBulkFeeLoading(false);
    }
  };

  // Filter configurations based on search and filters
  const filteredConfigs = useMemo(() => {
    return feeConfigs.filter(config => {
      const matchesSearch = 
        config.configId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.changeReason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.tenantId?.email && config.tenantId.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || config.status === statusFilter;
      const matchesScope = scopeFilter === 'all' || config.scope === scopeFilter;

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [feeConfigs, searchTerm, statusFilter, scopeFilter]);

  // Format currency
  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      case 'superseded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Component mount effect
  useEffect(() => {
    loadFeeConfigs();
    loadAnalytics();
  }, [statusFilter, scopeFilter]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 size={18} />,
      description: 'System overview and key metrics'
    },
    {
      id: 'configurations',
      label: 'Fee Configurations',
      icon: <Settings size={18} />,
      description: 'Manage fee configurations'
    },
    {
      id: 'calculator',
      label: 'Fee Calculator',
      icon: <Calculator size={18} />,
      description: 'Test fee calculations'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <TrendingUp size={18} />,
      description: 'Fee performance analytics'
    }
  ];

  // Overview Cards Component
  const OverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Configurations</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {feeConfigs.filter(c => c.status === 'active').length}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {feeConfigs.filter(c => c.scope === 'global' && c.status === 'active').length} Global
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <Settings className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Draft Configurations</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {feeConfigs.filter(c => c.status === 'draft').length}
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              Awaiting approval
            </p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Transactions</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {feeConfigs.reduce((sum, c) => sum + (c.usageStats?.transactionsAffected || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Processed
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Fees Collected</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(feeConfigs.reduce((sum, c) => sum + (c.usageStats?.totalFeesCollected || 0), 0))}
            </p>
            <p className="text-sm text-green-600 mt-1">
              All time
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <DollarSign className="text-purple-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );

  // Fee Configuration Card Component
  const FeeConfigCard = ({ config }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(config.status)}`}>
            {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
          </div>
          <span className="text-sm text-gray-600">
            {config.scope === 'global' ? 'Global' : 'Tenant-specific'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedConfig(config)}
            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {config.status === 'draft' && (
            <button
              onClick={() => approveFeeConfig(config._id)}
              className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              title="Approve Configuration"
            >
              <Check size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Configuration Details */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Configuration ID</p>
          <p className="text-sm text-gray-600 font-mono">{config.configId}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Fee Type</p>
            <p className="text-sm text-gray-600 capitalize">{config.feeType}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Rate/Amount</p>
            <p className="text-sm text-gray-600">
              {config.feeType === 'percentage' 
                ? `${config.percentageRate}%`
                : config.feeType === 'fixed'
                ? formatCurrency(config.fixedAmount, config.currency)
                : 'Tiered'
              }
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">Effective Period</p>
          <p className="text-sm text-gray-600">
            From: {formatDate(config.effectiveFrom)}
            {config.effectiveTo && (
              <><br />To: {formatDate(config.effectiveTo)}</>
            )}
          </p>
        </div>

        {config.tenantId && (
          <div>
            <p className="text-sm font-medium text-gray-900">Tenant</p>
            <p className="text-sm text-gray-600">{config.tenantId.email}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-900">Change Reason</p>
          <p className="text-sm text-gray-600 line-clamp-2">{config.changeReason}</p>
        </div>

        {/* Usage Statistics */}
        {config.usageStats?.transactionsAffected > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Transactions</p>
                <p className="font-medium text-gray-900">
                  {config.usageStats.transactionsAffected.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Fees Collected</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(config.usageStats.totalFeesCollected)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Create Configuration Modal
  const CreateConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Create New Fee Configuration</h3>
            <button
              onClick={() => {setShowCreateModal(false); resetForm();}}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration Scope *
            </label>
            <select
              name="scope"
              value={formData.scope}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="global">Global (applies to all tenants)</option>
              <option value="tenant">Tenant-specific</option>
            </select>
          </div>

          {/* Tenant Selection (if tenant scope) */}
          {formData.scope === 'tenant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID
              </label>
              <input
                type="text"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleInputChange}
                placeholder="Enter tenant ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Effective Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Effective From Date *
            </label>
            <input
              type="datetime-local"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This date determines when the new fee structure becomes active. Existing transactions won't be affected.
            </p>
          </div>

          {/* Fee Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fee Type *
            </label>
            <select
              name="feeType"
              value={formData.feeType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          {/* Fee Configuration Based on Type */}
          {formData.feeType === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentage Rate (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="percentageRate"
                value={formData.percentageRate}
                onChange={handleInputChange}
                placeholder="e.g., 2.9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {formData.feeType === 'fixed' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fixed Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="fixedAmount"
                  value={formData.fixedAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          )}

          {/* Optional Fee Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Fee
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="minFee"
                value={formData.minFee}
                onChange={handleInputChange}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Fee
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="maxFee"
                value={formData.maxFee}
                onChange={handleInputChange}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Change Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Reason *
            </label>
            <textarea
              name="changeReason"
              value={formData.changeReason}
              onChange={handleInputChange}
              rows={3}
              placeholder="Explain why this fee configuration is being created..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes
            </label>
            <textarea
              name="adminNotes"
              value={formData.adminNotes}
              onChange={handleInputChange}
              rows={2}
              placeholder="Internal notes (optional)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {setShowCreateModal(false); resetForm();}}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading && <RefreshCw size={16} className="animate-spin" />}
              <span>Create Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Fee Calculator Component
  const FeeCalculator = () => {
    const [testAmount, setTestAmount] = useState('1000');
    const [testTenant, setTestTenant] = useState('');

    const handleCalculate = () => {
      if (testAmount && parseFloat(testAmount) > 0) {
        calculateTestFee(parseFloat(testAmount), testTenant || null);
      }
    };

    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator size={20} className="mr-2" />
          Fee Calculator
        </h3>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Amount (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID (Optional)
              </label>
              <input
                type="text"
                value={testTenant}
                onChange={(e) => setTestTenant(e.target.value)}
                placeholder="Leave empty for global config"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Calculator size={16} />
            <span>Calculate Fee</span>
          </button>
        </div>

        {feeCalculation && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Calculation Result</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Transaction Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(feeCalculation.transactionAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Platform Fee</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(feeCalculation.platformFee)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Amount</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(feeCalculation.netAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fee Rate</p>
                <p className="text-lg font-semibold text-blue-600">
                  {feeCalculation.feeType === 'percentage' 
                    ? `${feeCalculation.feeRate}%`
                    : feeCalculation.feeType === 'fixed'
                    ? formatCurrency(feeCalculation.breakdown.calculation.fixedAmount)
                    : 'Tiered'
                  }
                </p>
              </div>
            </div>

            {feeCalculation.configUsed && (
              <div className="p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Configuration Used:</p>
                <p className="text-sm text-gray-600 font-mono">{feeCalculation.configUsed.configId}</p>
                <p className="text-xs text-gray-500">
                  Version {feeCalculation.configUsed.version} • {feeCalculation.configUsed.scope}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk Platform Fee Update Section */}
      <div className="bg-white rounded-xl p-6 border border-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign size={24} className="text-blue-600" />
          <span className="font-semibold text-gray-900">Set Platform Fee for All Admins</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={bulkFee}
            onChange={e => setBulkFee(e.target.value)}
            placeholder="Enter fee (e.g. 90)"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
            disabled={bulkFeeLoading}
          />
          <button
            onClick={handleBulkFeeUpdate}
            disabled={bulkFeeLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {bulkFeeLoading && <RefreshCw size={16} className="animate-spin" />}
            Set Fee
          </button>
        </div>
      </div>
      {bulkFeeError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{bulkFeeError}</div>
      )}
      {bulkFeeSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">{bulkFeeSuccess}</div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign size={28} className="mr-3 text-blue-600" />
            Platform Fee Manager
          </h1>
          <p className="text-gray-600 mt-1">
            Configure and manage platform fees with historical data protection
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          New Configuration
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle size={20} className="text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle size={20} className="text-green-500 mr-3" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title={tab.description}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <OverviewCards />
          
          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Fee Configurations
            </h3>
            <div className="space-y-3">
              {feeConfigs.slice(0, 5).map((config) => (
                <div key={config._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(config.status)}`}>
                      {config.status}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{config.configId}</p>
                      <p className="text-sm text-gray-600">{config.changeReason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {config.feeType === 'percentage' 
                        ? `${config.percentageRate}%`
                        : config.feeType === 'fixed'
                        ? formatCurrency(config.fixedAmount)
                        : 'Tiered'
                      }
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(config.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configurations' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search configurations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="expired">Expired</option>
                  <option value="superseded">Superseded</option>
                </select>

                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Scopes</option>
                  <option value="global">Global</option>
                  <option value="tenant">Tenant-specific</option>
                </select>
              </div>

              <button
                onClick={loadFeeConfigs}
                disabled={loading}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Configuration Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400 mr-3" />
              <span className="text-gray-600">Loading configurations...</span>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <Settings size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No configurations found</h3>
              <p className="text-gray-600 mb-6">
                {feeConfigs.length === 0 
                  ? "Get started by creating your first fee configuration"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Configuration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredConfigs.map((config) => (
                <FeeConfigCard key={config._id} config={config} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calculator' && <FeeCalculator />}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fee Analytics
          </h3>
          <div className="text-center py-12">
            <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              Analytics dashboard coming soon...
            </p>
          </div>
        </div>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && <CreateConfigModal />}
    </div>
  );
};

export default PlatformFeeManager;