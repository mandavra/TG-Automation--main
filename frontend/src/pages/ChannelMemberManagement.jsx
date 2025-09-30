  import React, { useState, useEffect } from 'react';
  import axios from 'axios';
  import { 
    Search, 
    Filter, 
    Download, 
    Plus, 
    RefreshCw,
    Users,
    UserCheck,
    UserX,
    Clock,
    TrendingUp,
    Calendar,
    Eye,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight
  } from 'lucide-react';
  import ChannelMemberDetailsModal from '../Component/ChannelMemberManagement/ChannelMemberDetailsModal';

  const ChannelMemberManagement = () => {
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState({
      totalMembers: 0,
      newMembers: 0,
      activeMembers: 0,
      expiredMembers: 0,
      retentionRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState('30d');
    const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1
    });
    const [selectedMember, setSelectedMember] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [channels, setChannels] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    
    // Get auth header
    const getAuthHeader = () => {
      const token = localStorage.getItem('token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Fetch dashboard statistics
    const fetchDashboardStats = async () => {
      try {
        const response = await axios.get(
          `http://localhost:4000/api/channel-members/admin/stats/dashboard`,
          { 
            headers: getAuthHeader(),
            params: { dateRange: dateRangeFilter, channelId: channelFilter }
          }
        );
        setDashboardStats(response.data);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    // Fetch channel members
    const fetchMembers = async (page = 1) => {
      try {
        setLoading(true);
        const response = await axios.get(
          'http://localhost:4000/api/channel-members/admin',
          {
            headers: getAuthHeader(),
            params: {
              page,
              limit: pagination.limit,
              search: searchTerm,
              status: statusFilter === 'all' ? undefined : statusFilter,
              channelId: channelFilter === 'all' ? undefined : channelFilter,
              dateRange: dateRangeFilter
            }
          }
        );
        
        setMembers(response.data.members);
        setPagination(response.data.pagination);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch available channels for filter
    const fetchChannels = async () => {
      try {
        // This would ideally come from a channels endpoint
        // For now, we'll extract unique channels from the dashboard stats
        if (dashboardStats?.membersByChannel) {
          const channelOptions = dashboardStats.membersByChannel.map(item => ({
            id: item._id,
            name: item.channelTitle || `Channel ${item._id}`,
            count: item.count
          }));
          setChannels(channelOptions);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    useEffect(() => {
      fetchDashboardStats();
    }, [dateRangeFilter, channelFilter]);

    useEffect(() => {
      fetchMembers(1);
    }, [searchTerm, statusFilter, channelFilter, dateRangeFilter]);

    useEffect(() => {
      if (dashboardStats) {
        fetchChannels();
      }
    }, [dashboardStats]);

    // Handle page change
    const handlePageChange = (newPage) => {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchMembers(newPage);
    };

    // Handle member details view
    const handleViewMember = (member) => {
      setSelectedMember(member);
      setModalOpen(true);
    };

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

    // Get status badge color
    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'expired': return 'bg-yellow-100 text-yellow-800';
        case 'kicked': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    // Safe getters for display values
    const getChannelTitle = (member) => {
      return (
        member?.channelInfo?.title ||
        member?.channelTitle ||
        member?.channelName ||
        member?.channel?.title ||
        member?.channelId ||
        '—'
      );
    };

    const getBundleName = (member) => {
      return (
        member?.channelInfo?.bundleName ||
        member?.bundleName ||
        member?.bundle?.name ||
        null
      );
    };

    const getChannelSubtitle = (member) => {
      const bundle = getBundleName(member);
      if (bundle) return bundle;
      if (member?.channelId) return `ID: ${member.channelId}`;
      return '—';
    };

    // Export members data
    const handleExport = async () => {
      try {
        const allMembers = await axios.get(
          'http://localhost:4000/api/channel-members/admin',
          {
            headers: getAuthHeader(),
            params: {
              page: 1,
              limit: 10000, // Large limit to get all members
              search: searchTerm,
              status: statusFilter === 'all' ? undefined : statusFilter,
              channelId: channelFilter === 'all' ? undefined : channelFilter,
              dateRange: dateRangeFilter
            }
          }
        );

        // Create CSV content
        const csvContent = [
          ['Name', 'Email', 'Phone', 'Channel', 'Status', 'Joined Date', 'Expires Date', 'Remaining Days'].join(','),
          ...allMembers.data.members.map(member => [
            `"${member.userName}"`,
            `"${member.userEmail}"`,
            `"${member.userPhone}"`,
            `"${(member?.channelInfo?.title || member?.channelTitle || member?.channelName || member?.channel?.title || member?.channelId || '—')}"`,
            `"${member.status}"`,
            `"${formatDate(member.joinedAt)}"`,
            `"${formatDate(member.expiresAt)}"`,
            `"${member.remainingDays}"`
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `channel-members-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting members:', error);
      }
    };

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Channel Member Management</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMembers?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeMembers?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expired</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiredMembers?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newMembers?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.retentionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Members
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, username, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="kicked">Kicked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel
              </label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Channels</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Channel Members ({pagination.total})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="animate-spin mr-2" size={24} />
              <span className="text-gray-600 dark:text-gray-400">Loading members...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center p-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No members found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Expires Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Remaining Days
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {members.map((member) => (
                      <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.userName || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {member.userEmail}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {member.userPhone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {getChannelTitle(member)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getChannelSubtitle(member)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(member.joinedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(member.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            member.remainingDays > 7 ? 'text-green-600' :
                            member.remainingDays > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {member.remainingDays} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewMember(member)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      {[...Array(pagination.pages)].map((_, index) => {
                        const page = index + 1;
                        if (page === 1 || page === pagination.pages || (page >= pagination.page - 1 && page <= pagination.page + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === pagination.page - 2 || page === pagination.page + 2) {
                          return <span key={page} className="px-2">...</span>;
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Member Details Modal */}
        {selectedMember && (
          <ChannelMemberDetailsModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedMember(null);
            }}
            memberId={selectedMember._id}
            onMemberUpdated={() => fetchMembers(pagination.page)}
          />
        )}
      </div>
    );
  };

  export default ChannelMemberManagement;