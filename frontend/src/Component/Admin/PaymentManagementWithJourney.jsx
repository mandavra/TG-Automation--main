import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  CreditCard,
  Eye,
  X,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Users,
  Activity
} from 'lucide-react';
import UserJourneyTimeline from './UserJourneyTimeline';
import axios from 'axios';

const PaymentManagementWithJourney = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showJourneyPanel, setShowJourneyPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const loadPayments = async () => {
    try {
      const response = await axios.get('/api/payments/admin', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.userid?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.userid?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.userid?.phone?.includes(searchTerm) ||
        payment.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.link_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter.toUpperCase());
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (dateFilter) {
        case 'today':
          dateThreshold = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = null;
      }
      
      if (dateThreshold) {
        filtered = filtered.filter(payment => 
          new Date(payment.purchase_datetime) >= dateThreshold
        );
      }
    }

    setFilteredPayments(filtered);
  };

  const openUserJourney = async (payment) => {
    try {
      // Load user details if not already loaded
      if (!payment.userid.firstName) {
        const userResponse = await axios.get(`/api/users/${payment.userid._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (userResponse.data.success) {
          payment.userid = userResponse.data.data;
        }
      }
      
      setSelectedUser({
        ...payment.userid,
        paymentInfo: payment
      });
      setShowJourneyPanel(true);
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle size={14} />;
      case 'FAILED':
        return <XCircle size={14} />;
      case 'PENDING':
        return <Clock size={14} />;
      default:
        return <AlertTriangle size={14} />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading payments...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Payment Management Panel */}
      <div className={`transition-all duration-300 ${showJourneyPanel ? 'w-2/3' : 'w-full'}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
              <p className="text-gray-600">Monitor and track all payment transactions with user journeys</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadPayments}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              {/* Results Count */}
              <div className="flex items-center justify-end text-sm text-gray-600">
                {filteredPayments.length} of {payments.length} payments
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Payment Transactions</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Plan</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Journey</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center p-8 text-gray-500">
                        No payments found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment._id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {payment.userid?.firstName} {payment.userid?.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{payment.userid?.phone}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="font-medium">{payment.plan_name}</div>
                          <div className="text-sm text-gray-500">ID: {payment.plan_id}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-sm">
                            {formatDate(payment.purchase_datetime)}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <button
                            onClick={() => openUserJourney(payment)}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg text-sm flex items-center gap-1 transition-colors"
                          >
                            <Activity size={14} />
                            View Journey
                          </button>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openUserJourney(payment)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="View User Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* User Journey Side Panel */}
      {showJourneyPanel && (
        <div className="w-1/3 border-l bg-gray-50 flex flex-col">
          {/* Panel Header */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">User Journey</h3>
                <p className="text-sm text-gray-600">
                  {selectedUser?.firstName} {selectedUser?.lastName} - Complete Activity Log
                </p>
              </div>
              <button
                onClick={() => setShowJourneyPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* User Quick Info */}
            {selectedUser && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Investor Name:</span>
                    <div className="font-medium">
                      {(selectedUser.fullName && selectedUser.fullName.trim()) ||
                      (
                        ((selectedUser.firstName || "").trim() + " " + (selectedUser.lastName || "").trim())
                          .trim()
                      ) || 'nathi'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <div className="font-medium">{selectedUser.phone}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <div className="font-medium">{selectedUser.email || 'Not provided'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">State:</span>
                    <div className="font-medium">{(selectedUser.State && selectedUser.State.trim()) || (selectedUser.state && selectedUser.state.trim()) || 'nathi'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Plan:</span>
                    <div className="font-medium">{selectedUser.paymentInfo?.plan_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <div className="font-medium text-green-600">
                      {formatCurrency(selectedUser.paymentInfo?.amount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Journey Timeline */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedUser && (
              <UserJourneyTimeline
                userId={selectedUser._id}
                userInfo={selectedUser}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagementWithJourney;