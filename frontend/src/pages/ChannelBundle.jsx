import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import groupActions from "../services/action/groupAction";
import { 
  ExternalLink, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Settings, 
  Users, 
  DollarSign,
  Calendar,
  Star,
  Package,
  MessageCircle,
  Link as LinkIcon,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";

export default function ChannelBundlePage() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBundles, setSelectedBundles] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const data = await groupActions.getAllGroups();
      setBundles(data || []);
    } catch (error) {
      console.error("Error fetching channel bundles:", error);
      toast.error("Failed to load channel bundles. Please refresh the page.");
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBundle = async (bundleId) => {
    const bundle = bundles.find(b => b._id === bundleId);
    if (window.confirm(`Are you sure you want to delete the channel bundle "${bundle?.name}"?\n\nThis will also remove:\n• All associated channels\n• All subscription plans\n• All subscriber data\n\nThis action cannot be undone.`)) {
      try {
        await groupActions.deleteGroup(bundleId);
        toast.success(`Channel bundle "${bundle?.name}" deleted successfully!`);
        fetchBundles();
      } catch (error) {
        console.error("Error deleting channel bundle:", error);
        const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred";
        toast.error(`Failed to delete channel bundle: ${errorMessage}`);
      }
    }
  };

  const handleSetDefault = async (bundleId) => {
    try {
      await groupActions.setDefaultGroup(bundleId);
      toast.success("Default channel bundle updated!");
      fetchBundles();
    } catch (error) {
      console.error("Error setting default channel bundle:", error);
      toast.error("Failed to set default channel bundle");
    }
  };

  const handleSelectBundle = (bundleId) => {
    setSelectedBundles(prev => {
      const isSelected = prev.includes(bundleId);
      const updated = isSelected 
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId];
      setShowBulkActions(updated.length > 0);
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allBundleIds = filteredBundles.map(bundle => bundle._id);
    const allSelected = selectedBundles.length === allBundleIds.length;
    
    if (allSelected) {
      setSelectedBundles([]);
      setShowBulkActions(false);
    } else {
      setSelectedBundles(allBundleIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedBundles.length) return;
    
    const defaultBundles = selectedBundles.filter(bundleId => {
      const bundle = bundles.find(b => b._id === bundleId);
      return bundle?.isDefault;
    });
    
    if (defaultBundles.length > 0) {
      toast.error("Cannot delete default channel bundles. Please unset default status first.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedBundles.length} channel bundles? This action cannot be undone.`)) {
      try {
        for (const bundleId of selectedBundles) {
          await groupActions.deleteGroup(bundleId);
        }
        toast.success(`${selectedBundles.length} channel bundles deleted successfully!`);
        setSelectedBundles([]);
        setShowBulkActions(false);
        fetchBundles();
      } catch (error) {
        console.error("Error deleting channel bundles:", error);
        toast.error("Failed to delete some channel bundles");
      }
    }
  };

  const getBundleStatusIcon = (bundle) => {
    if (bundle.isDefault) return <Star className="w-4 h-4 text-yellow-500" />;
    
    switch (bundle.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBundleStatusBadge = (bundle) => {
    let statusText = "Unknown";
    let statusClass = statusClasses.default;
    
    if (bundle.isDefault) {
      statusText = "Default";
      statusClass = "bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700";
    } else if (bundle.status) {
      statusText = bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1);
      statusClass = statusClasses[bundle.status] || statusClasses.default;
    }
    
    return { statusText, statusClass };
  };

  const getChannelCount = (bundle) => {
    const legacyCount = bundle.telegramChatId ? 1 : 0;
    const newCount = bundle.channels ? bundle.channels.filter(ch => ch.isActive).length : 0;
    return legacyCount + newCount;
  };

  const getPlanCount = (bundle) => {
    return bundle.subscriptionPlans ? bundle.subscriptionPlans.length : 0;
  };

  // Filter and sort bundles
  const filteredBundles = bundles
    .filter(bundle => {
      const matchesSearch = (
        bundle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.telegramChatTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (!matchesSearch) return false;
      
      if (filterStatus === "all") return true;
      if (filterStatus === "default") return bundle.isDefault;
      return bundle.status === filterStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'channels':
          aValue = getChannelCount(a);
          bValue = getChannelCount(b);
          break;
        case 'revenue':
          aValue = a.stats?.totalRevenue || 0;
          bValue = b.stats?.totalRevenue || 0;
          break;
        case 'subscribers':
          aValue = a.stats?.totalSubscribers || 0;
          bValue = b.stats?.totalSubscribers || 0;
          break;
        default:
          aValue = new Date(a[sortBy] || 0);
          bValue = new Date(b[sortBy] || 0);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const statusClasses = {
    active: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
    pending: "bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    error: "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700",
    default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 mx-auto max-w-full sm:max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            Channel Bundle Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage collections of Telegram channels as subscription packages
          </p>
        </div>
        <Link
          to="/admin/create-channel-bundle"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Channel Bundle
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bundles</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{bundles.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bundles</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{bundles.filter(b => b.status === 'active').length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                ₹{bundles.reduce((sum, b) => sum + (b.stats?.totalRevenue || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Subscribers</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {bundles.reduce((sum, b) => sum + (b.stats?.totalSubscribers || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channel bundles by name, description, or channel title..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
              <option value="default">Default</option>
            </select>
          </div>
          
          {/* Sort */}
          <div className="grid grid-cols-2 sm:flex sm:gap-2 w-full sm:w-auto gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="channels">Channels</option>
              <option value="revenue">Revenue</option>
              <option value="subscribers">Subscribers</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full sm:w-auto px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedBundles.length} channel bundle{selectedBundles.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
              <button
                onClick={() => {
                  setSelectedBundles([]);
                  setShowBulkActions(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel Bundles Grid */}
      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <span className="text-base sm:text-lg text-gray-600 dark:text-gray-400">Loading channel bundles...</span>
            </div>
          </div>
        ) : filteredBundles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Package className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No channel bundles found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? "Try adjusting your search or filters." : "Get started by creating your first channel bundle."}
            </p>
            {!searchQuery && (
              <Link
                to="/admin/create-channel-bundle"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Your First Bundle
              </Link>
            )}
          </div>
        ) : (
          filteredBundles.map((bundle) => {
            const { statusText, statusClass } = getBundleStatusBadge(bundle);
            const channelCount = getChannelCount(bundle);
            const planCount = getPlanCount(bundle);
            
            return (
              <div
                key={bundle._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-4">
                    <div className="flex items-center sm:items-start gap-3 sm:gap-4 flex-1 flex-wrap">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedBundles.includes(bundle._id)}
                        onChange={() => handleSelectBundle(bundle._id)}
                        className="w-4 h-4 sm:w-5 sm:h-5 mt-1 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 shrink-0"
                      />
                      
                      {/* Bundle Image */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {bundle.image ? (
                          <img
                            src={bundle.image}
                            alt={bundle.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Bundle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 break-words">
                            {bundle.name || "Unnamed Bundle"}
                          </h3>
                          {getBundleStatusIcon(bundle)}
                        </div>
                        
                        {bundle.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 break-words">
                            {bundle.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            <MessageCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>{channelCount} channel{channelCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>{planCount} plan{planCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>{bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                        
                        {/* Custom Route Link */}
                        {bundle.customRoute && (
                          <div className="mt-2">
                            <a
                              href={`/pc/${bundle.customRoute}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                            >
                              <LinkIcon className="w-4 h-4" />
                              /pc/{bundle.customRoute}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                        ₹{(bundle.stats?.totalRevenue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                        {(bundle.stats?.totalSubscribers || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Subscribers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                        {bundle.stats?.activeSubscriptions || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
                      <Link
                        to={`/admin/channel-bundle-details/${bundle._id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                      
                      <Link
                        to={`/admin/edit-channel-bundle/${bundle._id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors w-full sm:w-auto"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Bundle
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
                      {!bundle.isDefault && (
                        <button
                          onClick={() => handleSetDefault(bundle._id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors w-full sm:w-auto"
                        >
                          <Star className="w-4 h-4" />
                          Set Default
                        </button>
                      )}
                      
                      {!bundle.isDefault && (
                        <button
                          onClick={() => handleDeleteBundle(bundle._id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Selection Helper */}
      {filteredBundles.length > 0 && (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {selectedBundles.length === filteredBundles.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredBundles.length} channel bundle{filteredBundles.length !== 1 ? 's' : ''} {searchQuery || filterStatus !== 'all' ? 'found' : 'total'}
            </span>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredBundles.length} of {bundles.length} bundles
          </div>
        </div>
      )}
    </div>
  );
}