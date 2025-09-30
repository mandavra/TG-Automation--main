import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  User, 
  Mail, 
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  Building,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  RefreshCw,
  MessageCircle,
  Package,
  TrendingUp
} from 'lucide-react';

const UserDetailsModal = ({ isOpen, onClose, userId }) => {
  const [userData, setUserData] = useState(null);
  const [channelMemberships, setChannelMemberships] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch user details
  const fetchUserDetails = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/users/admin/${userId}`,
        { headers: getAuthHeader() }
      );
      
      setUserData(response.data.user);
      setChannelMemberships(response.data.channelMemberships || []);
      setPaymentHistory(response.data.paymentHistory || []);
      setEditData(response.data.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

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
      case 'joined': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'kicked': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'FAILED': return 'text-red-600 bg-red-50';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Handle edit save
  const handleSave = async () => {
    try {
      const response = await axios.put(
        `http://localhost:4000/api/users/admin/${userId}`,
        editData,
        { headers: getAuthHeader() }
      );
      
      setUserData(response.data.user);
      setEditMode(false);
      alert('User information updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user information. Please try again.');
    }
  };

  // Handle edit cancel
  const handleCancel = () => {
    setEditData(userData);
    setEditMode(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            User Details
          </h2>
          <div className="flex items-center space-x-2">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Save size={16} className="mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              >
                <Edit size={16} className="mr-1" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin mr-2" size={24} />
            <span className="text-gray-600 dark:text-gray-400">Loading user details...</span>
          </div>
        )}

        {/* Content */}
        {!loading && userData && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  User Details
                </button>
                <button
                  onClick={() => setActiveTab('memberships')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'memberships'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Channel Memberships
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Payment History
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* User Status */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        User Status
                      </h3>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(userData.telegramJoinStatus)}`}>
                        {userData.telegramJoinStatus || 'pending'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{channelMemberships.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Channels</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">₹{paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{paymentHistory.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Payments</p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Personal Information
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <User className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Full Name</p>
                            {editMode ? (
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                <input
                                  type="text"
                                  placeholder="First Name"
                                  value={editData.firstName || ''}
                                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1"
                                />
                                <input
                                  type="text"
                                  placeholder="Middle Name"
                                  value={editData.middleName || ''}
                                  onChange={(e) => setEditData({ ...editData, middleName: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1"
                                />
                                <input
                                  type="text"
                                  placeholder="Last Name"
                                  value={editData.lastName || ''}
                                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1"
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.fullName || 'Not provided'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">PAN Number</p>
                            {editMode ? (
                              <input
                                type="text"
                                value={editData.panNumber || ''}
                                onChange={(e) => setEditData({ ...editData, panNumber: e.target.value })}
                                className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1 w-full mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.panNumber || 'Not provided'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Date of Birth</p>
                            {editMode ? (
                              <input
                                type="date"
                                value={editData.dob || ''}
                                onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                                className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1 w-full mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.dob || 'Not provided'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Contact Information
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                            {editMode ? (
                              <input
                                type="email"
                                value={editData.email || ''}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1 w-full mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.email || 'Not provided'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Phone</p>
                            <div className="flex items-center space-x-2 mt-1">
                              {editMode ? (
                                <input
                                  type="tel"
                                  value={editData.phone || ''}
                                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1 flex-1"
                                />
                              ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                                  {userData.phone || 'Not provided'}
                                </p>
                              )}
                              {userData.phone && !editMode && (
                                <button
                                  onClick={() => window.open(`https://wa.me/${userData.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                                  className="text-green-600 hover:text-green-900"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Location</p>
                            {editMode ? (
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <input
                                  type="text"
                                  placeholder="City"
                                  value={editData.City || ''}
                                  onChange={(e) => setEditData({ ...editData, City: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1"
                                />
                                <input
                                  type="text"
                                  placeholder="State"
                                  value={editData.State || ''}
                                  onChange={(e) => setEditData({ ...editData, State: e.target.value })}
                                  className="text-sm text-gray-600 dark:text-gray-400 border rounded px-2 py-1"
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.City && userData.State ? `${userData.City}, ${userData.State}` : 'Not provided'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memberships Tab */}
              {activeTab === 'memberships' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Channel Memberships ({channelMemberships.length})
                  </h3>
                  
                  {channelMemberships.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Package size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No channel memberships found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {channelMemberships.map((membership, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {membership.channelName || membership.channelId}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {membership.planName} - ₹{membership.amount}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                membership.isActive && new Date(membership.expiresAt) > new Date() 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {membership.isActive && new Date(membership.expiresAt) > new Date() ? 'Active' : 'Expired'}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Expires: {formatDate(membership.expiresAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Payment History ({paymentHistory.length})
                  </h3>
                  
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <DollarSign size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No payment history found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {payment.plan_name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Transaction ID: {payment.link_id}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(payment.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">
                                ₹{payment.amount}
                              </p>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserDetailsModal;