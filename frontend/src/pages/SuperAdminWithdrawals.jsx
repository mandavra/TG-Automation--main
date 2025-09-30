import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";
import { 
  Wallet, 
  Download, 
  DollarSign, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  UserCheck,
  UserX,
  Plus,
  Search,
  Filter,
  Users
} from "lucide-react";

const SuperAdminWithdrawals = () => {
  const [dashboard, setDashboard] = useState({
    pendingCount: 0,
    recentRequests: [],
    stats: {},
    adminSummary: []
  });
  const [allRequests, setAllRequests] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDirectWithdrawModal, setShowDirectWithdrawModal] = useState(false);
  const [processingNotes, setProcessingNotes] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [directWithdrawData, setDirectWithdrawData] = useState({
    targetAdminId: "",
    amount: "",
    paymentMethod: "upi",
    bankDetails: {
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      accountHolderName: "",
      upiId: ""
    },
    processingNotes: "",
    transactionId: ""
  });
  const [filters, setFilters] = useState({
    status: "all",
    search: ""
  });

  useEffect(() => {
    fetchDashboard();
    fetchAllRequests();
    fetchStatistics();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/withdrawal/admin/dashboard");
      if (response.data.success) {
        setDashboard(response.data.dashboard);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to fetch dashboard data");
    }
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/withdrawal/admin/all-requests");
      if (response.data.success) {
        setAllRequests(response.data.withdrawalRequests);
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      toast.error("Failed to fetch withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/withdrawal/admin/statistics");
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleProcessRequest = async (action) => {
    try {
      const response = await api.put(`/withdrawal/admin/process/${selectedRequest._id}`, {
        action,
        processingNotes,
        transactionId: action === "approve" ? transactionId : undefined
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowProcessModal(false);
        setProcessingNotes("");
        setTransactionId("");
        setSelectedRequest(null);
        fetchDashboard();
        fetchAllRequests();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error(error.response?.data?.message || "Failed to process request");
    }
  };

  const handleDirectWithdrawal = async () => {
    try {
      const requestData = {
        targetAdminId: directWithdrawData.targetAdminId,
        amount: parseFloat(directWithdrawData.amount),
        paymentMethod: directWithdrawData.paymentMethod,
        bankDetails: directWithdrawData.paymentMethod === "bank_transfer" ? {
          accountNumber: directWithdrawData.bankDetails.accountNumber,
          ifscCode: directWithdrawData.bankDetails.ifscCode,
          bankName: directWithdrawData.bankDetails.bankName,
          accountHolderName: directWithdrawData.bankDetails.accountHolderName
        } : directWithdrawData.paymentMethod === "upi" ? {
          upiId: directWithdrawData.bankDetails.upiId
        } : {},
        processingNotes: directWithdrawData.processingNotes,
        transactionId: directWithdrawData.transactionId
      };

      const response = await api.post("/withdrawal/admin/direct-withdrawal", requestData);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowDirectWithdrawModal(false);
        setDirectWithdrawData({
          targetAdminId: "",
          amount: "",
          paymentMethod: "upi",
          bankDetails: {
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            accountHolderName: "",
            upiId: ""
          },
          processingNotes: "",
          transactionId: ""
        });
        fetchDashboard();
        fetchAllRequests();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error processing direct withdrawal:", error);
      toast.error(error.response?.data?.message || "Failed to process direct withdrawal");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
      case "processed":
      case "completed":
        return <Check className="w-4 h-4 text-green-500" />;
      case "rejected":
      case "failed":
        return <X className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "approved":
      case "processed":
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = allRequests.filter(request => {
    const matchesStatus = filters.status === "all" || request.status === filters.status;
    const matchesSearch = !filters.search || 
      request.adminId?.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      request.amount.toString().includes(filters.search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4  mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center my-4 flex-wrap">
        <h1 className="text-[20px] sm:text-4xl font-semibold text-gray-800 dark:text-white">
          Super Admin - Withdrawal Management
        </h1>
        <button
          onClick={() => setShowDirectWithdrawModal(true)}
          className="mt-2 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Direct Withdrawal
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-4">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending Requests</p>
              <p className="text-3xl font-bold">{dashboard.pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Approved</p>
              <p className="text-3xl font-bold">{dashboard.stats?.approved?.count || 0}</p>
            </div>
            <Check className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Amount</p>
              <p className="text-3xl font-bold">₹{statistics.totalProcessedAmount?.toLocaleString() || 0}</p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Admins</p>
              <p className="text-3xl font-bold">{dashboard.adminSummary?.length || 0}</p>
            </div>
            <Users className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 my-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by admin email or amount..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-40 sm:w-56 flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Withdrawal Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg my-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Withdrawal Requests</h2>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No withdrawal requests found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Requested At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.adminId?.email || 'Unknown Admin'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.type === 'direct' ? 'Direct Withdrawal' : 'Requested'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{request.amount.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                       request.paymentMethod === 'upi' ? 'UPI' : 'Wallet'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowProcessModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <UserCheck className="w-4 h-4 inline mr-1" />
                            Process
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          // Show details modal - you can implement this
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Process Request Modal */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-auto max-h-[100vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Process Withdrawal Request
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Admin: {selectedRequest.adminId?.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Amount: ₹{selectedRequest.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Processing Notes
                </label>
                <textarea
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter processing notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID (for approval)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter transaction ID for approval"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProcessRequest("reject")}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-1"
              >
                <UserX className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => handleProcessRequest("approve")}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-1"
              >
                <UserCheck className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Withdrawal Modal */}
      {showDirectWithdrawModal && (
        <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Direct Withdrawal</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Send funds to an admin via UPI or bank transfer</p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectWithdrawModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Admin Email</label>
                  <input
                    type="email"
                    value={directWithdrawData.targetAdminId}
                    onChange={(e) => setDirectWithdrawData({...directWithdrawData, targetAdminId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                    <input
                      type="number"
                      value={directWithdrawData.amount}
                      onChange={(e) => setDirectWithdrawData({...directWithdrawData, amount: e.target.value})}
                      min="1"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter net amount to transfer</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="payment_method"
                      value="upi"
                      checked={directWithdrawData.paymentMethod === 'upi'}
                      onChange={(e) => setDirectWithdrawData({...directWithdrawData, paymentMethod: e.target.value})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    UPI
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={directWithdrawData.paymentMethod === 'bank_transfer'}
                      onChange={(e) => setDirectWithdrawData({...directWithdrawData, paymentMethod: e.target.value})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Bank Transfer
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Choose how to send the funds</p>
              </div>

              {directWithdrawData.paymentMethod === "bank_transfer" && (
                <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={directWithdrawData.bankDetails.accountNumber}
                        onChange={(e) => setDirectWithdrawData({
                          ...directWithdrawData,
                          bankDetails: {...directWithdrawData.bankDetails, accountNumber: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0000 0000 0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={directWithdrawData.bankDetails.ifscCode}
                        onChange={(e) => setDirectWithdrawData({
                          ...directWithdrawData,
                          bankDetails: {...directWithdrawData.bankDetails, ifscCode: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="SBIN000000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={directWithdrawData.bankDetails.bankName}
                        onChange={(e) => setDirectWithdrawData({
                          ...directWithdrawData,
                          bankDetails: {...directWithdrawData.bankDetails, bankName: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="State Bank of India"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={directWithdrawData.bankDetails.accountHolderName}
                        onChange={(e) => setDirectWithdrawData({
                          ...directWithdrawData,
                          bankDetails: {...directWithdrawData.bankDetails, accountHolderName: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {directWithdrawData.paymentMethod === "upi" && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UPI Details</p>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UPI ID</label>
                  <input
                    type="text"
                    placeholder="example@upi"
                    value={directWithdrawData.bankDetails.upiId}
                    onChange={(e) => setDirectWithdrawData({
                      ...directWithdrawData,
                      bankDetails: {...directWithdrawData.bankDetails, upiId: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Processing Notes</label>
                  <textarea
                    value={directWithdrawData.processingNotes}
                    onChange={(e) => setDirectWithdrawData({...directWithdrawData, processingNotes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional notes for audit trail"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={directWithdrawData.transactionId}
                    onChange={(e) => setDirectWithdrawData({...directWithdrawData, transactionId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Reference number"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Secure action. Verify details before processing.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDirectWithdrawModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDirectWithdrawal}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Process Withdrawal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminWithdrawals;