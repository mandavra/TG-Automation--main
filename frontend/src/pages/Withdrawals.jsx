import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";
import { Wallet, Download, DollarSign, Clock, Check, X, AlertCircle } from "lucide-react";

const Withdrawals = () => {
  const [balance, setBalance] = useState(0);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [netEarnedAmount, setNetEarnedAmount] = useState(0);

  useEffect(() => {
    fetchBalance();
    fetchWithdrawalRequests();
    fetchNetEarnedAmount();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await api.get("/withdrawal/balance");
      if (response.data.success && response.data.balance) {
        setBalance(response.data.balance.remainingNetEarned || 0);
        setNetEarnedAmount(response.data.balance.totalNetEarned || 0);
      } else {
        setBalance(0);
        setNetEarnedAmount(0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch balance");
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/withdrawal/my-requests");
      if (response.data.success && response.data.withdrawalRequests) {
        setWithdrawalRequests(response.data.withdrawalRequests);
      } else {
        setWithdrawalRequests(response.data.withdrawalRequests || response.data.requests || response.data || []);
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      toast.error("Failed to fetch withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchNetEarnedAmount = async () => {
    try {
      const response = await api.get("/analytics/revenue");
      setNetEarnedAmount(response.data.netEarnedSubtotal || 0);
    } catch (error) {
      setNetEarnedAmount(0);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(withdrawAmount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      const requestData = {
        amount: parseFloat(withdrawAmount),
      };

      const response = await api.post("/withdrawal/request", requestData);
      toast.success(response.data.message || "Withdrawal request submitted successfully!");
      
      // Reset form
      setWithdrawAmount("");
      setShowWithdrawModal(false);
      
      // Refresh data
      fetchBalance();
      fetchWithdrawalRequests();
    } catch (error) {
      console.error("Error submitting withdrawal request:", error);
      const errorMessage = error.response?.data?.message || "Failed to submit withdrawal request";
      toast.error(errorMessage);
      if (error.response?.data?.availableBalance !== undefined) {
        toast.info(`Available balance: ₹${error.response.data.availableBalance}`);
      } else if (error.response?.data?.balance?.availableBalance !== undefined) {
        toast.info(`Available balance: ₹${error.response.data.balance.availableBalance}`);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
      case "processed":
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

  return (
    <div className="p-4 space-y-6 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Earnings & Withdrawals
        </h1>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Net Earned Amount */}
        {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Net Earned Amount</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">₹{netEarnedAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-400" />
          </div>
        </div> */}
        {/* Remaining Net Earned
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Remaining Net Earned</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">₹{balance.toLocaleString()}</p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-400" />
          </div>
        </div> */}
        {/* Available Balance */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Available Balance</p>
              <p className="text-3xl font-bold">₹{balance.toLocaleString()}</p>
            </div>
            <Wallet className="w-12 h-12 text-green-200" />
          </div>
          <button
            onClick={() => {
              console.log("Request Withdrawal clicked, current balance:", balance);
              setShowWithdrawModal(true);
            }}
            className={`mt-4 px-4 py-2 rounded-lg font-medium transition-colors w-full ${
              balance <= 0 
                ? "bg-gray-300 text-gray-600 cursor-not-allowed" 
                : "bg-white text-green-600 hover:bg-gray-50"
            }`}
            disabled={balance <= 0}
          >
            {balance <= 0 ? "No Balance Available" : "Request Withdrawal"}
          </button>
        </div>

        {/* Pending Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {withdrawalRequests.filter(req => req.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Withdrawn</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ₹{withdrawalRequests
                  .filter(req => req.status === 'processed')
                  .reduce((sum, req) => sum + req.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <Download className="w-10 h-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Withdrawal Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Withdrawal History</h2>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No withdrawal requests found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
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
                    Processed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {withdrawalRequests.map((request) => (
                  <tr key={request._id}>
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
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.processedAt ? new Date(request.processedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {request.processingNotes || request.adminNotes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Request Withdrawal
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={balance}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter amount to withdraw"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available balance: ₹{balance.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawalRequest}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
