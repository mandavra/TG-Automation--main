import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  User, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Hash,
  Users,
  RefreshCw,
  Plus,
  Copy,
  ExternalLink
} from 'lucide-react';

const ChannelMemberDetailsModal = ({ isOpen, onClose, memberId, onMemberUpdated }) => {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extensionDays, setExtensionDays] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [showExtensionForm, setShowExtensionForm] = useState(false);

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch member details
  const fetchMemberDetails = async () => {
    if (!memberId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/channel-members/admin/${memberId}`,
        { headers: getAuthHeader() }
      );
      
      setMemberData(response.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, memberId]);

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

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { 
          color: 'text-green-600 bg-green-50', 
          icon: <CheckCircle size={16} className="mr-1" />,
          label: 'Active'
        };
      case 'expired':
        return { 
          color: 'text-yellow-600 bg-yellow-50', 
          icon: <Clock size={16} className="mr-1" />,
          label: 'Expired'
        };
      case 'kicked':
        return { 
          color: 'text-red-600 bg-red-50', 
          icon: <XCircle size={16} className="mr-1" />,
          label: 'Kicked'
        };
      default:
        return { 
          color: 'text-gray-600 bg-gray-50', 
          icon: <AlertCircle size={16} className="mr-1" />,
          label: 'Unknown'
        };
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Handle extension
  const handleExtension = async (e) => {
    e.preventDefault();
    if (!extensionDays || extensionDays <= 0) {
      alert('Please enter a valid number of extension days');
      return;
    }

    try {
      setExtending(true);
      await axios.post(
        `http://localhost:4000/api/channel-members/admin/${memberId}/extend`,
        {
          extensionDays: parseInt(extensionDays),
          reason: extensionReason || 'Admin extension'
        },
        { headers: getAuthHeader() }
      );

      alert(`Successfully extended membership by ${extensionDays} days`);
      setShowExtensionForm(false);
      setExtensionDays('');
      setExtensionReason('');
      fetchMemberDetails(); // Refresh data
      onMemberUpdated?.(); // Notify parent component
    } catch (error) {
      console.error('Error extending membership:', error);
      alert('Failed to extend membership');
    } finally {
      setExtending(false);
    }
  };

  if (!isOpen) return null;

  const statusInfo = getStatusInfo(memberData?.member?.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[100vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Channel Member Details
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
            <span className="text-gray-600 dark:text-gray-400">Loading member details...</span>
          </div>
        )}

        {/* Content */}
        {!loading && memberData && (
          <div className="p-6 max-h-96 overflow-y-auto">
            {/* Member Status */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Membership Status
                </h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{memberData.member.remainingDays}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{memberData.member.totalDurationDays}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Duration</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {memberData.member.isActive ? 'Yes' : 'No'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                </div>
              </div>
            </div>

            {/* Member Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Member Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Full Name</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {memberData.user ? `${memberData.user.firstName || ''} ${memberData.user.lastName || ''}`.trim() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Telegram User ID</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {memberData.member.telegramUserId}
                        </p>
                        <button
                          onClick={() => copyToClipboard(memberData.member.telegramUserId)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {memberData.user?.email && (
                    <div className="flex items-start space-x-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {memberData.user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {memberData.user?.phone && (
                    <div className="flex items-start space-x-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Phone</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {memberData.user.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Channel Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Channel Name</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {memberData.channel?.title || memberData.member.channelInfo?.title || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Channel ID</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {memberData.member.channelId}
                        </p>
                        <button
                          onClick={() => copyToClipboard(memberData.member.channelId)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {memberData.group && (
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Bundle/Group</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {memberData.group.name}
                        </p>
                        {memberData.group.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {memberData.group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Membership Timeline
              </h3>
              
              <div className="space-y-3">
                {memberData.timeline.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      event.status === 'joined' ? 'bg-green-500' :
                      event.status === 'expired' ? 'bg-yellow-500' :
                      event.status === 'kicked' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.event}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(event.timestamp)}
                      </p>
                      {event.reason && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Reason: {event.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extension History */}
            {memberData.member.extensions && memberData.member.extensions.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Extension History
                </h3>
                <div className="space-y-2">
                  {memberData.member.extensions.map((extension, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Extended by {extension.extensionDays} days
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(extension.extendedAt)} - {extension.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extension Form */}
            {showExtensionForm && (
              <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Extend Membership
                </h3>
                <form onSubmit={handleExtension}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Extension Days *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={extensionDays}
                        onChange={(e) => setExtensionDays(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={extensionReason}
                        onChange={(e) => setExtensionReason(e.target.value)}
                        placeholder="Optional reason for extension"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={extending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extending ? (
                        <>
                          <RefreshCw className="animate-spin -ml-1 mr-2" size={16} />
                          Extending...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="mr-2" />
                          Extend Membership
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExtensionForm(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {memberData?.member?.status === 'active' && !showExtensionForm && (
              <button
                onClick={() => setShowExtensionForm(true)}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50"
              >
                <Plus size={16} className="mr-2" />
                Extend Membership
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

export default ChannelMemberDetailsModal;