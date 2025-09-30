import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  CreditCard, 
  User, 
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  Receipt,
  RefreshCw,
  ExternalLink,
  Copy,
  Globe
} from 'lucide-react';

const PaymentDetailsModal = ({ isOpen, onClose, paymentId }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch payment details
  const fetchPaymentDetails = async () => {
    if (!paymentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `http://localhost:4000/api/payments/admin/${paymentId}`,
        { headers: getAuthHeader() }
      );
      
      setPaymentData(response.data);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setError(
        error.response?.data?.message || 
        error.message || 
        'Failed to load payment details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentDetails();
    } else if (!isOpen) {
      // Reset state when modal is closed
      setPaymentData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, paymentId]);

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'FAILED': return 'text-red-600 bg-red-50';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'EXPIRED': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin mr-2" size={24} />
            <span className="text-gray-600 dark:text-gray-400">Loading payment details...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center p-12">
            <XCircle className="text-red-500 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Payment Details</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
            <button
              onClick={fetchPaymentDetails}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <RefreshCw className="mr-2" size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && paymentData && (
          <div className="p-6 max-h-96 overflow-y-auto">
            {/* Payment Status */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Payment Status
                </h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentData.payment.status)}`}>
                  {paymentData.payment.status === 'SUCCESS' ? <CheckCircle size={16} className="mr-1" /> : 
                   paymentData.payment.status === 'FAILED' ? <XCircle size={16} className="mr-1" /> :
                   paymentData.payment.status === 'PENDING' ? <Clock size={16} className="mr-1" /> :
                   <AlertCircle size={16} className="mr-1" />}
                  {paymentData.payment.status}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">₹{paymentData.payment.amount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{paymentData.payment.plan_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {paymentData.payment.expiresAt ? 
                      Math.ceil((new Date(paymentData.payment.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Days Left</p>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Transaction Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Link ID</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {paymentData.payment.link_id}
                        </p>
                        <button
                          onClick={() => copyToClipboard(paymentData.payment.link_id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {paymentData.payment.transactionId && (
                    <div className="flex items-start space-x-3">
                      <Receipt className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Transaction ID</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {paymentData.payment.transactionId}
                          </p>
                          <button
                            onClick={() => copyToClipboard(paymentData.payment.transactionId)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Created Date</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(paymentData.payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  {paymentData.payment.updatedAt !== paymentData.payment.createdAt && (
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Last Updated</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(paymentData.payment.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Customer Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Customer</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {paymentData.payment.userid ? 
                          `${paymentData.payment.userid.firstName || ''} ${paymentData.payment.userid.lastName || ''}`.trim() : 
                          paymentData.payment.customer_id || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {paymentData.payment.userid?.email && (
                    <div className="flex items-start space-x-3">
                      <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {paymentData.payment.userid.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentData.payment.userid?.phone && (
                    <div className="flex items-start space-x-3">
                      <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Phone</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {paymentData.payment.userid.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {(paymentData.payment.userid?.state || paymentData.payment.userid?.State) && (
                    <div className="flex items-start space-x-3">
                      <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">State</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {paymentData.payment.userid?.state || paymentData.payment.userid?.State}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plan Details */}
            {paymentData.planDetails && (
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Plan Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Plan Name</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{paymentData.planDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Duration</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {paymentData.planDetails.duration} {paymentData.planDetails.durationType}
                    </p>
                  </div>
                  {paymentData.planDetails.description && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Description</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{paymentData.planDetails.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Failure Reason */}
            {paymentData.payment.failure_reason && (
              <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Payment Failed
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      {paymentData.payment.failure_reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Channel Memberships */}
            {paymentData.payment.userid?.telegramJoinStatus && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Telegram Status
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Telegram Join Status
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        User ID: {paymentData.payment.userid?.telegramUserId || 'N/A'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      paymentData.payment.userid.telegramJoinStatus === 'joined' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {paymentData.payment.userid.telegramJoinStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {paymentData?.payment?.invoiceId && (
              <button
                onClick={() => window.open(`/admin/admin-invoices?id=${paymentData.payment.invoiceId}`, '_blank')}
                className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
              >
                <Receipt size={16} className="mr-2" />
                View Invoice
              </button>
            )}
            
            {paymentData?.payment?.link_url && (
              <button
                onClick={() => window.open(paymentData.payment.link_url, '_blank')}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
              >
                <ExternalLink size={16} className="mr-2" />
                View Payment Link
              </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;