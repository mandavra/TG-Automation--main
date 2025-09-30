// /src/components/GlobalSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Users,
  CreditCard,
  FileText,
  Package,
  Eye,
  ChevronRight,
  Crown,
  Clock,
  ArrowUpRight,
  Loader2,
  X
} from 'lucide-react';
import api from '../services/api.js';
import { toast } from 'react-toastify';

const GlobalSearch = () => {
  const navigate = useNavigate();

  // state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('');
  const [admins, setAdmins] = useState([]);

  // refs for debounce + mounted + abort controller
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentSearchController = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    const role = localStorage.getItem('adminRole');

    // if not superadmin redirect; keep this behaviour as you had it
    if (role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    loadAdmins();
    loadRecentSearches();

    // cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (currentSearchController.current) {
        try { currentSearchController.current.abort(); } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /**
   * Load admins list from API.
   * Improved: uses AbortController, safe guards, toast on failure.
   */
  const loadAdmins = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // if no token, redirect to login or show message
      toast.warn('Not authenticated. Please login.');
      navigate('/loginAdmin');
      return;
    }

    // cancel any existing controller
    if (currentSearchController.current) {
      try { currentSearchController.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    currentSearchController.current = controller;

    try {
      const response = await api.get('/admin/list', {
        signal: controller.signal
      });

      // safe fallback if API uses other shape
      const adminsData = response?.data?.admins ?? response?.data ?? [];
      if (isMountedRef.current) setAdmins(Array.isArray(adminsData) ? adminsData : []);
    } catch (error) {
      if (error?.code === 'ERR_CANCELED') {
        // request cancelled, ignore
        return;
      }
      console.error('Failed to load admins:', error);
      toast.error('Unable to load admins');
      // keep admins as [] so UI still works
      if (isMountedRef.current) setAdmins([]);
    } finally {
      currentSearchController.current = null;
    }
  };

  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('superadmin_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      // invalid JSON maybe; clear it
      localStorage.removeItem('superadmin_recent_searches');
      setRecentSearches([]);
    }
  };

  const saveRecentSearch = (query, type) => {
    const newSearch = {
      query,
      type,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    const updated = [newSearch, ...recentSearches.filter(s => s.query !== query)].slice(0, 10);
    setRecentSearches(updated);
    try {
      localStorage.setItem('superadmin_recent_searches', JSON.stringify(updated));
    } catch (e) {
      // localStorage set might fail on privacy mode - ignore
      console.warn('Could not save recent search', e);
    }
  };

  /**
   * performSearch - improved:
   * - debounced caller uses this
   * - supports cancelling previous requests
   * - includes selectedAdminFilter param
   * - robust checks for response shape
   */
  const performSearch = async (query = searchQuery, type = searchType, force = false) => {
    const trimmed = (query || '').trim();
    if (!force && (!trimmed || trimmed.length < 2)) {
      if (isMountedRef.current) {
        setResults({});
        setTotalFound(0);
      }
      return;
    }

    setLoading(true);

    // cancel previous
    if (currentSearchController.current) {
      try { currentSearchController.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    currentSearchController.current = controller;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.warn('Missing auth token; please re-login.');
        navigate('/loginAdmin');
        return;
      }

      const queryForRequest = force && trimmed.length < 2 ? 'all' : trimmed;
      const params = new URLSearchParams({
        query: queryForRequest,
        ...(type && type !== 'all' ? { type } : {}),
        ...(selectedAdminFilter ? { adminId: selectedAdminFilter } : {})
      });

      const url = `/admin/search/global?${params.toString()}`;

      const response = await api.get(url, {
        signal: controller.signal
      });

      // Normalize results: API may return different shapes; handle safely.
      const data = response?.data ?? {};
      const resultsObj = data.results ?? data; // if API returns { results: { users: [...] } } or direct
      const total = Number(data.totalFound ?? data.total ?? Object.values(resultsObj).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0));

      if (isMountedRef.current) {
        setResults(resultsObj);
        setTotalFound(total);
      }

      // save recent only if found something
      if (total > 0) saveRecentSearch(trimmed, type);
    } catch (error) {
      if (error?.code === 'ERR_CANCELED') {
        // ignore cancellations
        return;
      }
      console.error('Search error:', error);
      // try to extract message
      const message = error?.response?.data?.message || error.message || 'Search failed';
      toast.error(`Search failed: ${message}`);
      if (isMountedRef.current) {
        setResults({});
        setTotalFound(0);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
      currentSearchController.current = null;
    }
  };

  // debounced input handler
  const handleSearchChange = (value) => {
    setSearchQuery(value);

    // clear previous timer
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // start new debounce only when len >= 2
    if ((value || '').trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value, searchType);
      }, 450);
    } else {
      // clear results for short queries
      setResults({});
      setTotalFound(0);
    }
  };

  const handleQuickSearch = (query, type = 'all') => {
    setSearchQuery(query);
    setSearchType(type);
    const shouldForce = type === 'groups' || (query || '').trim().length >= 2;
    performSearch(query, type, shouldForce);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchType('all');
    setResults({});
    setTotalFound(0);
    setSelectedAdminFilter('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (currentSearchController.current) {
      try { currentSearchController.current.abort(); } catch (e) {}
      currentSearchController.current = null;
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(Number(amount) || 0);
    } catch (e) {
      return `₹${amount}`;
    }
  };

  const getAdminEmail = (adminId) => {
    const admin = admins.find(a => String(a._id) === String(adminId));
    return admin?.email || 'Unknown Admin';
  };

  const searchTypes = [
    { value: 'all', label: 'All', icon: Search },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'payments', label: 'Payments', icon: CreditCard },
    { value: 'invoices', label: 'Invoices', icon: FileText },
    { value: 'groups', label: 'Groups', icon: Package }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="text-yellow-500" size={24} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Global Search
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Search across admin tenants & resources
              </p>
            </div>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search users, payments, documents, groups..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  showFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                }`}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={() => {
                  const trimmed = (searchQuery || '').trim();
                  const shouldForce = searchType === 'groups' || !!selectedAdminFilter || trimmed.length >= 2;
                  performSearch(searchQuery, searchType, shouldForce);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search Type Tabs - horizontally scrollable on small screens */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {searchTypes.map((type) => {
                const Icon = type.icon;
                const active = searchType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      const nextType = type.value;
                      setSearchType(nextType);
                      const trimmed = (searchQuery || '').trim();
                      const shouldForce = nextType === 'groups' || !!selectedAdminFilter || trimmed.length >= 2;
                      performSearch(searchQuery, nextType, shouldForce);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Admin
                  </label>
                  <select
                    value={selectedAdminFilter}
                    onChange={(e) => setSelectedAdminFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Admins</option>
                    {admins.map(admin => (
                      <option key={admin._id} value={admin._id}>
                        {admin.email || admin.name || admin._id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => performSearch(searchQuery, searchType, true)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-3" size={18} />
              <span className="text-gray-600 dark:text-gray-300">Searching...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && totalFound > 0 && (
          <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search Results ({totalFound} found)
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Query: "{searchQuery}"
              </span>
            </div>

            {/* Users */}
            {Array.isArray(results.users) && results.users.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  Users ({results.users.length})
                </h3>

                <div className="space-y-2">
                  {results.users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Users size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.firstName || ''} {user.lastName || ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email || '—'} • {getAdminEmail(user.adminId)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/users/${user._id}`)}
                        className="ml-3 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments */}
            {Array.isArray(results.payments) && results.payments.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-green-500" />
                  Payments ({results.payments.length})
                </h3>

                <div className="space-y-2">
                  {results.payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CreditCard size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formatCurrency(payment.amount)} - {payment.status || '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {payment.userid?.firstName || ''} {payment.userid?.lastName || ''} • {getAdminEmail(payment.adminId)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/payment-management`)}
                        className="ml-3 px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {Array.isArray(results.invoices) && results.invoices.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  Invoices ({results.invoices.length})
                </h3>

                <div className="space-y-2">
                  {results.invoices.map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <FileText size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {invoice.invoiceNo || '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {invoice.billedTo?.name || '—'} • {getAdminEmail(invoice.adminId)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/admin-invoices`)}
                        className="ml-3 px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            {Array.isArray(results.groups) && results.groups.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package size={18} className="text-orange-500" />
                  Channel Bundles ({results.groups.length})
                </h3>

                <div className="space-y-2">
                  {results.groups.map((group) => (
                    <div key={group._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <Package size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {(group.description || '').substring(0, 60)}{(group.description || '').length > 60 ? '…' : ''} • {getAdminEmail(group.createdBy)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/channel-bundles`)}
                        className="ml-3 px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No results (when query present) */}
        {!loading && (searchQuery || '').trim().length >= 2 && totalFound === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <div className="text-center">
              <Search className="mx-auto mb-3 text-gray-400" size={40} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No results found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Try adjusting your search query or filters.
              </p>
            </div>
          </div>
        )}

        {/* Recent searches & Quick actions - shown when no query */}
        {(searchQuery || '').trim().length < 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Recent Searches */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Clock size={16} />
                Recent Searches
              </h3>

              {recentSearches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No recent searches yet</p>
              ) : (
                <div className="space-y-2">
                  {recentSearches.slice(0, 8).map((search) => (
                    <button
                      key={search.id}
                      onClick={() => handleQuickSearch(search.query, search.type)}
                      className="w-full p-2 text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {search.query}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {search.type === 'all' ? 'All types' : search.type} • {new Date(search.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Search Templates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Quick Search Templates</h3>

              <div className="space-y-2">
                <button
                  onClick={() => handleQuickSearch('status:active', 'users')}
                  className="w-full p-2 text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-3"
                >
                  <Users size={18} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">Active Users</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 truncate">Find all active users across system</p>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickSearch('status:SUCCESS', 'payments')}
                  className="w-full p-2 text-left bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center gap-3"
                >
                  <CreditCard size={18} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate">Successful Payments</p>
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">View all successful transactions</p>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickSearch('status:pending', 'payments')}
                  className="w-full p-2 text-left bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 flex items-center gap-3"
                >
                  <Clock size={18} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 truncate">Pending Payments</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 truncate">Find payments awaiting processing</p>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickSearch('', 'groups')}
                  className="w-full p-2 text-left bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 flex items-center gap-3"
                >
                  <Package size={18} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate">All Channel Bundles</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 truncate">Browse all groups and bundles</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Super Admin Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-4 text-white">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Crown size={16} />
            Super Admin Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/admin/super-admin-withdrawals')}
              className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight size={14} />
                <span className="text-sm font-medium">Manage Withdrawals</span>
              </div>
              <p className="text-xs opacity-90">Process pending withdrawal requests</p>
            </button>

            <button
              onClick={() => navigate('/admin/system-analytics')}
              className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight size={14} />
                <span className="text-sm font-medium">System Analytics</span>
              </div>
              <p className="text-xs opacity-90">View detailed system insights</p>
            </button>

            <button
              onClick={() => navigate('/admin/create-admin')}
              className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight size={14} />
                <span className="text-sm font-medium">Admin Management</span>
              </div>
              <p className="text-xs opacity-90">Create and manage admin accounts</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
