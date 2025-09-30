import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { UserX, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';

const KickedUsers = () => {
  const [kickedUsers, setKickedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, today, week, month

  useEffect(() => {
    fetchKickedUsers();
    
    // Connect to Telegram bot WebSocket for real-time updates
    const telegramSocket = io('http://localhost:4000');
    
    telegramSocket.on('connect', () => {
      console.log('Connected to Telegram bot WebSocket for kicked users');
      telegramSocket.emit('getKickedUsers');
    });
    
    telegramSocket.on('kickedUsersData', (data) => {
      setKickedUsers(data);
      setLoading(false);
    });
    
    telegramSocket.on('telegramKick', (data) => {
      // Add new kicked user to the list
      const newKickedUser = {
        id: Date.now(),
        userId: data.userId,
        userName: data.user,
        reason: data.reason,
        kickTime: data.time,
        status: 'kicked',
        channelId: data.channelId
      };
      
      setKickedUsers(prev => [newKickedUser, ...prev]);
    });
    
    const interval = setInterval(fetchKickedUsers, 40000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
      telegramSocket.disconnect();
    };
  }, []);

  const fetchKickedUsers = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call to get kicked users
      // For now, we'll simulate with localStorage data
      const storedKicks = localStorage.getItem('telegramKicks') || '[]';
      const kicks = JSON.parse(storedKicks);
      setKickedUsers(kicks);
      setError(null);
    } catch (err) {
      setError('Failed to fetch kicked users');
      console.error('Error fetching kicked users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'kicked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'error':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getFilteredUsers = () => {
    let filtered = kickedUsers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId?.toString().includes(searchTerm) ||
        user.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply time filter
    const now = new Date();
    switch (filterType) {
      case 'today':
        filtered = filtered.filter(user => {
          const kickDate = new Date(user.kickTime);
          return kickDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        filtered = filtered.filter(user => {
          const kickDate = new Date(user.kickTime);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return kickDate >= weekAgo;
        });
        break;
      case 'month':
        filtered = filtered.filter(user => {
          const kickDate = new Date(user.kickTime);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return kickDate >= monthAgo;
        });
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => new Date(b.kickTime) - new Date(a.kickTime));
  };

  const clearAllKicks = () => {
    if (window.confirm('Are you sure you want to clear all kicked user records?')) {
      localStorage.removeItem('telegramKicks');
      setKickedUsers([]);
    }
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading kicked users...</span>
          </div>
        </div>
      </div>
    );
  }

  if (kickedUsers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kicked Users</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Monitor users kicked from Telegram channel</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-200 dark:border-green-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserX className="h-6 w-6 text-green-400 dark:text-green-300" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-300">No Kicked Users</h3>
                <p className="mt-2 text-sm text-green-700 dark:text-green-200">
                  No users have been kicked from the Telegram channel yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kicked Users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Monitor users kicked from Telegram channel - Total: {kickedUsers.length}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by user name, ID, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button
                onClick={fetchKickedUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={clearAllKicks}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <UserX className="w-8 h-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Kicked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kickedUsers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {kickedUsers.filter(user => {
                    const kickDate = new Date(user.kickTime);
                    return kickDate.toDateString() === new Date().toDateString();
                  }).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {kickedUsers.filter(user => user.status === 'error').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {kickedUsers.filter(user => user.status === 'kicked').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kicked Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Kick Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Channel</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user, idx) => (
                  <tr
                    key={user.id || idx}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <UserX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.userName || 'Unknown User'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {user.reason || 'Subscription expired'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {format(new Date(user.kickTime), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status || 'kicked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.channelId || 'Main Channel'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KickedUsers; 