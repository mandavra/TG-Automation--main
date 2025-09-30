import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import groupActions from "../services/action/groupAction";
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Plus, 
  MessageCircle, 
  DollarSign, 
  Users, 
  Calendar,
  ExternalLink,
  Settings,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  Link as LinkIcon,
  Copy,
  Eye,
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";

// Recharts imports for comprehensive analytics
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";

export default function ChannelBundleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newChannel, setNewChannel] = useState({ chatId: "", chatTitle: "" });
  const [newPlan, setNewPlan] = useState({
    type: "Base",
    duration: "month",
    mrp: "",
    highlight: false,
    order: 0
  });
  const [planType, setPlanType] = useState("Base");
  const [durationUnit, setDurationUnit] = useState("day");
  const [durationValue, setDurationValue] = useState(1);

  useEffect(() => {
    if (id) {
      fetchBundleDetails();
      fetchChannels();
      fetchPlans();
    }
  }, [id]);

  const fetchBundleDetails = async () => {
    try {
      setLoading(true);
      const data = await groupActions.getGroupById(id);
      setBundle(data);
    } catch (error) {
      console.error("Error fetching bundle details:", error);
      toast.error("Failed to load bundle details");
      navigate("/admin/channel-bundles");
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.chatId) {
      toast.error("Please enter a channel ID");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newChannel),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Channel added successfully!");
        setShowAddChannel(false);
        setNewChannel({ chatId: "", chatTitle: "" });
        fetchChannels();
        fetchBundleDetails();
      } else {
        toast.error(data.message || "Failed to add channel");
      }
    } catch (error) {
      console.error("Error adding channel:", error);
      toast.error("Failed to add channel");
    }
  };

  const handleRemoveChannel = async (channelId) => {
    if (window.confirm("Are you sure you want to remove this channel from the bundle?")) {
      try {
        const response = await fetch(`http://localhost:4000/api/groups/${id}/channels/${channelId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          toast.success("Channel removed successfully!");
          fetchChannels();
          fetchBundleDetails();
        } else {
          toast.error(data.message || "Failed to remove channel");
        }
      } catch (error) {
        console.error("Error removing channel:", error);
        toast.error("Failed to remove channel");
      }
    }
  };

  const handleGenerateJoinLink = async (channelId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels/${channelId}/generate-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Join link generated successfully!");
        fetchChannels();
      } else {
        toast.error(data.message || "Failed to generate join link");
      }
    } catch (error) {
      console.error("Error generating join link:", error);
      toast.error("Failed to generate join link");
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.mrp || newPlan.mrp <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...newPlan, mrp: parseFloat(newPlan.mrp) }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Plan added successfully!");
        setShowAddPlan(false);
        setNewPlan({
          type: "Base",
          duration: "month",
          mrp: "",
          highlight: false,
          order: 0
        });
        fetchPlans();
        fetchBundleDetails();
      } else {
        toast.error(data.message || "Failed to add plan");
      }
    } catch (error) {
      console.error("Error adding plan:", error);
      toast.error("Failed to add plan");
    }
  };

  const handleRemovePlan = async (planId) => {
    if (window.confirm("Are you sure you want to remove this plan? This action cannot be undone.")) {
      try {
        const response = await fetch(`http://localhost:4000/api/groups/${id}/plans/${planId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          toast.success("Plan removed successfully!");
          fetchPlans();
          fetchBundleDetails();
        } else {
          toast.error(data.message || "Failed to remove plan");
        }
      } catch (error) {
        console.error("Error removing plan:", error);
        toast.error("Failed to remove plan");
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getBundleStatusIcon = (bundle) => {
    if (bundle?.isDefault) return <Star className="w-5 h-5 text-yellow-500" />;
    
    switch (bundle?.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChannelCount = (bundle) => {
    const legacyCount = bundle?.telegramChatId ? 1 : 0;
    const newCount = bundle?.channels ? bundle.channels.filter(ch => ch.isActive).length : 0;
    return legacyCount + newCount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading bundle details...</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Channel Bundle Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The requested channel bundle could not be found.</p>
          <Link
            to="/admin/channel-bundles"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Channel Bundles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/channel-bundles"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {bundle.name || "Unnamed Bundle"}
              </h1>
              {getBundleStatusIcon(bundle)}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Channel Bundle Management
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {bundle.customRoute && (
            <a
              href={`/pc/${bundle.customRoute}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Page
            </a>
          )}
          
          <Link
            to={`/admin/edit-channel-bundle/${bundle._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Bundle
          </Link>
        </div>
      </div>

      {/* Bundle Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Channels</p>
              <p className="text-3xl font-bold text-blue-600">{getChannelCount(bundle)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subscription Plans</p>
              <p className="text-3xl font-bold text-green-600">{plans.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">
                ₹{(bundle.stats?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subscribers</p>
              <p className="text-3xl font-bold text-blue-600">
                {(bundle.stats?.totalSubscribers || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bundle Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bundle Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Description</label>
            <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              {bundle.description || "No description provided"}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Custom Route</label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex-1">
                {bundle.customRoute ? `/pc/${bundle.customRoute}` : "No custom route set"}
              </p>
              {bundle.customRoute && (
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/pc/${bundle.customRoute}`)}
                  className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Created Date</label>
            <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              {bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString() : "N/A"}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Status</label>
            <div className="flex items-center gap-2">
              {getBundleStatusIcon(bundle)}
              <span className="text-gray-900 dark:text-white">
                {bundle.isDefault ? "Default Bundle" : bundle.status?.charAt(0).toUpperCase() + bundle.status?.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("channels")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "channels"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Channels ({channels.length})
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "plans"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Subscription Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "coupons"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Coupons
          </button>
          <button
            onClick={() => setActiveTab("affiliate")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "affiliate"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Affiliate
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowAddChannel(true)}
                className="flex items-center gap-3 p-4 text-left border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Plus className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Add Channel</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Add a new Telegram channel</div>
                </div>
              </button>
              
              <button
                onClick={() => setShowAddPlan(true)}
                className="flex items-center gap-3 p-4 text-left border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <Plus className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Add Plan</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Create a subscription plan</div>
                </div>
              </button>
              
              <Link
                to={`/admin/edit-channel-bundle/${bundle._id}`}
                className="flex items-center gap-3 p-4 text-left border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
              >
                <Settings className="w-6 h-6 text-yellow-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Bundle Settings</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Edit bundle configuration</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Bundle Created</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {bundle.createdAt ? new Date(bundle.createdAt).toLocaleString() : "N/A"}
                  </div>
                </div>
              </div>
              
              {channels.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {channels.length} Channel{channels.length !== 1 ? 's' : ''} Added
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Latest: {channels[0]?.addedAt ? new Date(channels[0].addedAt).toLocaleString() : "N/A"}
                    </div>
                  </div>
                </div>
              )}
              
              {plans.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {plans.length} Subscription Plan{plans.length !== 1 ? 's' : ''} Created
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Price range: ₹{Math.min(...plans.map(p => p.mrp))} - ₹{Math.max(...plans.map(p => p.mrp))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "channels" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Telegram Channels ({channels.length})
            </h3>
            <button
              onClick={() => setShowAddChannel(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </div>

          {channels.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Channels Added</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add Telegram channels to this bundle to start offering subscriptions.
              </p>
              <button
                onClick={() => setShowAddChannel(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Your First Channel
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {channels.map((channel) => (
                <div
                  key={channel._id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {channel.chatTitle || "Untitled Channel"}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {channel.chatId}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Added: {new Date(channel.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {channel.joinLink ? (
                        <button
                          onClick={() => copyToClipboard(channel.joinLink)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Copy Link
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateJoinLink(channel._id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          Generate Link
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveChannel(channel._id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subscription Plans ({plans.length})
            </h3>
            <button
              onClick={() => setShowAddPlan(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Plans Created</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create subscription plans to start monetizing your channel bundle.
              </p>
              <button
                onClick={() => setShowAddPlan(true)}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Plan
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {plan.type} Plan
                          </h4>
                          {plan.highlight && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-green-600">₹{plan.mrp}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          Per {plan.duration}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemovePlan(plan._id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Telegram Channel
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel ID *
                </label>
                <input
                  type="text"
                  value={newChannel.chatId}
                  onChange={(e) => setNewChannel({ ...newChannel, chatId: e.target.value })}
                  placeholder="@channelname or -100123456789"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel Title (Optional)
                </label>
                <input
                  type="text"
                  value={newChannel.chatTitle}
                  onChange={(e) => setNewChannel({ ...newChannel, chatTitle: e.target.value })}
                  placeholder="Channel display name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddChannel(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChannel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Subscription Plan
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan Type *</label>
                <input
                  type="text"
                  value={planType}
                  onChange={e => setPlanType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter plan type (e.g. Base, Pro, Enterprise)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration *</label>
                <div className="flex gap-2">
                  <select
                    value={durationUnit}
                    onChange={e => setDurationUnit(e.target.value)}
                    className="border rounded-md px-2 py-1 text-xs"
                    required
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={durationValue}
                    onChange={e => setDurationValue(Number(e.target.value))}
                    className="border rounded-md px-2 py-1 text-xs w-16"
                    placeholder="e.g. 20"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MRP *</label>
                <input
                  type="number"
                  value={newPlan.mrp}
                  onChange={e => setNewPlan({ ...newPlan, mrp: e.target.value })}
                  placeholder="Enter MRP"
                  className="w-full border rounded-md px-2 py-1 text-xs"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPlan.highlight}
                    onChange={(e) => setNewPlan({ ...newPlan, highlight: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Highlight as popular plan
                  </span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddPlan(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlan}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}