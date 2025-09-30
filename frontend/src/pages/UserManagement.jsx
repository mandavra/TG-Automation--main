import React, { useEffect, useState, forwardRef } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaRegCalendarAlt } from "react-icons/fa";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  User, 
  Calendar,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit,
  FileText,
  MessageCircle,
  UserCheck,
  UserX,
  Users,
  Archive,
  Package
} from 'lucide-react';
import UserDetailsModal from '../Component/UserManagement/UserDetailsModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'kyc'

  // Get auth token
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'joined': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'kicked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  // Status icon mapping
  const getStatusIcon = (status) => {
    switch (status) {
      case 'joined': return <UserCheck size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'kicked': return <UserX size={14} />;
      case 'expired': return <AlertCircle size={14} />;
      default: return <User size={14} />;
    }
  };

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'admin') {
        // Admin view - comprehensive user management
        const params = new URLSearchParams({
          page: currentPage,
          limit: pagination.limit,
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(dateFilter !== 'all' && { dateRange: dateFilter })
        });

        const response = await axios.get(
          `http://localhost:4000/api/users/admin?${params}`,
          { headers: getAuthHeader() }
        );

        if (response.data && response.data.users) {
          setUsers(response.data.users);
          setPagination({
            page: currentPage,
            limit: pagination.limit,
            total: response.data.pagination?.total || 0,
            pages: response.data.pagination?.pages || 0
          });
          setStats(response.data.stats || {});
        }
      } else {
        // KYC view - focus on KYC and invoice data
        const response = await axios.get('http://localhost:4000/api/kyc/all', {
          headers: getAuthHeader()
        });
        
        if (response.data) {
          let kycUsers = response.data;
          
          // Apply filters
          if (searchTerm) {
            kycUsers = kycUsers.filter(user => 
              (user?.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (user?.middleName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (user?.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (user?.phone || '').includes(searchTerm) ||
              (user?.selectedPlan?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (user?.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
          }
          
          setUsers(kycUsers);
          setPagination({
            page: 1,
            limit: kycUsers.length,
            total: kycUsers.length,
            pages: 1
          });
          setStats({
            totalUsers: kycUsers.length,
            successPayments: kycUsers.filter(u => u.paymentStatus === 'SUCCESS').length,
            pendingPayments: kycUsers.filter(u => u.paymentStatus === 'PENDING').length,
            failedPayments: kycUsers.filter(u => u.paymentStatus === 'FAILED').length
          });
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFilter, viewMode]);

  // Handle page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchUsers();
    }
  }, [currentPage]);

  // Handle view mode changes
  useEffect(() => {
    setSelectedUsers([]);
    setCurrentPage(1);
  }, [viewMode]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle view details
  const handleViewDetails = (userId) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  };

  // Export users
  const handleExport = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/users/admin/export`,
        { 
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Error exporting users. Please try again.');
    }
  };

  // Handle user selection
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const selectableUsers = viewMode === 'kyc' 
        ? users.filter(user => user.invoiceId)
        : users;
      setSelectedUsers(selectableUsers.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Download selected invoices
  const handleDownloadSelectedInvoices = async () => {
    if (viewMode !== 'kyc' || selectedUsers.length === 0) return;
    
    const invoiceIds = selectedUsers
      .map(userId => {
        const user = users.find(u => u._id === userId);
        return user && user.invoiceId ? user.invoiceId : null;
      })
      .filter(Boolean);

    if (invoiceIds.length === 0) {
      alert('No invoices found for selected users');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:4000/api/invoices/download-zip',
        { invoiceIds },
        { 
          headers: getAuthHeader(),
          responseType: 'blob' 
        }
      );
    
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'selected_invoices.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading invoices:', err);
      alert('Failed to download invoices');
    }
  };

  // Download single invoice
  const handleDownloadInvoice = (invoiceId) => {
    if (invoiceId) {
      window.open(`http://localhost:4000/api/invoices/download/${invoiceId}`, '_blank');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              User Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {viewMode === 'admin' 
                ? 'Manage and monitor all users, their status, payments, and channel memberships'
                : 'View KYC users and manage invoices'
              }
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'admin'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              Admin View
            </button>
            <button
              onClick={() => setViewMode('kyc')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kyc'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              KYC & Invoices
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {viewMode === 'admin' ? (
          // Admin View Stats
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Members</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.joinedUsers || 0}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">New This Month</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.thisMonth || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {stats.conversionRate || 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
          </>
        ) : (
          // KYC View Stats
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total KYC Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Payments</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.successPayments || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingPayments || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed Payments</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.failedPayments || 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className={`grid grid-cols-1 gap-4 ${viewMode === 'kyc' ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter - only show in admin mode */}
          {viewMode === 'admin' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="joined">Joined</option>
              <option value="pending">Pending</option>
              <option value="kicked">Kicked</option>
              <option value="expired">Expired</option>
            </select>
          )}

          {/* Date Filter - only show in admin mode */}
          {viewMode === 'admin' && (
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          )}

          {/* Download Selected Invoices - only show in KYC mode */}
          {viewMode === 'kyc' && (
            <button
              onClick={handleDownloadSelectedInvoices}
              disabled={selectedUsers.length === 0}
              className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                selectedUsers.length > 0
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Archive size={16} className="mr-2" />
              Download Selected ({selectedUsers.length})
            </button>
          )}

          {/* Export Button - only show in admin mode */}
          {viewMode === 'admin' && (
            <button
              onClick={handleExport}
              className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchUsers}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {/* Checkbox column for KYC mode */}
                {viewMode === 'kyc' && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.filter(user => user.invoiceId).length && users.length > 0}
                      onChange={handleSelectAll}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400 border-gray-300 dark:border-gray-600"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'User Details' : 'Name'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'Contact Info' : 'Email'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'Status' : 'Phone'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'Payment Info' : 'Plan'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'Joined' : 'Order ID'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'admin' ? 'Actions' : 'Amount'}
                </th>
                {viewMode === 'kyc' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Invoice
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={viewMode === 'kyc' ? 9 : 6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'kyc' ? 9 : 6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="mx-auto mb-2" size={48} />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr key={user._id || index} className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      viewMode === 'kyc' && isEven ? "bg-blue-50/60 dark:bg-gray-800/80" : ""
                    }`}>
                      {/* Checkbox for KYC mode */}
                      {viewMode === 'kyc' && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleSelectUser(user._id)}
                            disabled={!user.invoiceId}
                            className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400 border-gray-300 dark:border-gray-600 disabled:opacity-50"
                          />
                        </td>
                      )}
                      
                      {/* User Details / Name */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.fullName || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                PAN: {user.panNumber || 'Not provided'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.City && user.State ? `${user.City}, ${user.State}` : 'Location not provided'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {`${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
                          </div>
                        )}
                      </td>
                      
                      {/* Contact Info / Email */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div>
                            <div className="flex items-center text-sm text-gray-900 dark:text-white mb-1">
                              <Mail className="h-4 w-4 text-gray-400 mr-2" />
                              {user.email || 'Not provided'}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="h-4 w-4 text-gray-400 mr-2" />
                              {user.phone || 'Not provided'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.email || 'Not provided'}
                          </div>
                        )}
                      </td>
                      
                      {/* Status / Phone */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.telegramJoinStatus)}`}>
                              {getStatusIcon(user.telegramJoinStatus)}
                              <span className="ml-1 capitalize">{user.telegramJoinStatus || 'pending'}</span>
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Channels: {user.channelMemberships || 0}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.phone || 'Not provided'}
                          </div>
                        )}
                      </td>
                      
                      {/* Payment Info / Plan */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              ₹{user.totalAmount || 0}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.planName || 'No plan'}
                            </div>
                            <div className={`text-xs ${
                              user.paymentStatus === 'SUCCESS' ? 'text-green-600' : 
                              user.paymentStatus === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {user.paymentStatus || 'PENDING'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.selectedPlan || 'N/A'}
                          </div>
                        )}
                      </td>
                      
                      {/* Joined / Order ID */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(user.createdAt)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Updated: {formatDate(user.lastUpdated || user.updatedAt)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.orderId || 'N/A'}
                          </div>
                        )}
                      </td>
                      
                      {/* Actions / Amount */}
                      <td className="px-6 py-4">
                        {viewMode === 'admin' ? (
                          <div className="flex space-x-2">
                            {/* View Details */}
                            <button
                              onClick={() => handleViewDetails(user._id)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            
                            {/* Contact User */}
                            {user.phone && (
                              <button
                                onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="WhatsApp"
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ₹{user.amount || '0'}
                          </div>
                        )}
                      </td>
                      
                      {/* KYC Mode additional columns */}
                      {viewMode === 'kyc' && (
                        <>
                          {/* Status */}
                          <td className="px-6 py-4">
                            {user.paymentStatus === "SUCCESS" ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                                Success
                              </span>
                            ) : user.paymentStatus === "FAILED" ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                                Failed
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                Pending
                              </span>
                            )}
                          </td>
                          
                          {/* Invoice Download */}
                          <td className="px-6 py-4">
                            <button
                              className={`flex items-center gap-1 px-3 py-1 rounded transition-colors duration-150 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                user.paymentStatus === "SUCCESS" && user.invoiceId
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                              }`}
                              onClick={() => {
                                if (user.paymentStatus === "SUCCESS" && user.invoiceId) {
                                  handleDownloadInvoice(user.invoiceId);
                                }
                              }}
                              disabled={!(user.paymentStatus === "SUCCESS" && user.invoiceId)}
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(pagination.pages, 5))].map((_, index) => {
                      const pageNum = index + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userId={selectedUserId}
      />
    </div>
  );
};

export default UserManagement;