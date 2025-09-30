import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import groupActions from "../services/action/groupAction";
import DateRangePicker from "../components/DateRangePicker";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  Activity,
  Filter,
  RefreshCw,
  GripVertical
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
  const [editingPlan, setEditingPlan] = useState(null);

  // Analytics data state
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    totalPurchases: 0,
    activeUsers: 0,
    expiredSubscriptions: 0,
    earningsData: [],
    conversionRates: {
      landingPage: 0,
      directPayment: 0,
      affiliatePayment: 0
    },
    timeAnalysis: [],
    locationData: [],
    subscriptionOverview: [],
    renewalData: [],
    topPlans: [],
    expiringSubscriptions: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dateRangeValue, setDateRangeValue] = useState({
    startDate: null,
    endDate: null,
    preset: 'last30days'
  });

  const [planType, setPlanType] = useState("Base");
  const [durationUnit, setDurationUnit] = useState("day");
  const [durationValue, setDurationValue] = useState(1);

  useEffect(() => {
    if (id) {
      fetchBundleDetails();
    }
  }, [id]);

  const fetchBundleDetails = async () => {
    try {
      setLoading(true);
      console.log("Fetching bundle details for ID:", id);
      
      // Check authentication before making the API call
      const token = localStorage.getItem('token');
      const auth = localStorage.getItem('auth');
      const adminRole = localStorage.getItem('adminRole');
      
      console.log("Auth Debug:", {
        hasToken: !!token,
        tokenLength: token?.length,
        auth: auth,
        adminRole: adminRole,
        isLoggedIn: !!(token && auth === 'true')
      });
      
      if (!token || auth !== 'true') {
        throw new Error("Not authenticated. Please login again.");
      }
      
      // Try fetching via getAllGroups first to avoid 403 errors
      const allGroups = await groupActions.getAllGroups();
      console.log("All groups received:", allGroups);
      
      const targetBundle = Array.isArray(allGroups) 
        ? allGroups.find(group => group._id === id)
        : null;
        
      if (!targetBundle) {
        throw new Error("Bundle not found in groups list");
      }
      
      console.log("Bundle found via getAllGroups:", targetBundle);
      setBundle(targetBundle);
      
      // Bundle is now set via setBundle() in either the try or catch block above
      // No need to reference 'data' here anymore
      
      // Fetch channels and plans separately for real-time management
      // Don't let these API calls fail the main load
      try {
        await fetchChannels();
      } catch (channelError) {
        console.warn("Failed to fetch channels:", channelError);
      }
      
      try {
        await fetchPlans();
      } catch (planError) {
        console.warn("Failed to fetch plans:", planError);
      }

      // Fetch analytics data
      try {
        await fetchAnalytics();
      } catch (analyticsError) {
        console.warn("Failed to fetch analytics:", analyticsError);
      }
      
    } catch (error) {
      console.error("Error fetching bundle details:", error);
      toast.error(`Failed to load bundle details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn("No auth token available for channels fetch");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Frontend - Channels API response:", data);
        console.log("🔍 Frontend - Channels array:", data?.channels);
        console.log("🔍 Frontend - Channels count:", data?.channels?.length);
        
        if (data?.channels) {
          console.log("✅ Frontend - Setting channels from API:", data.channels);
          setChannels(data.channels);
          console.log("✅ Frontend - Channels state should now be:", data.channels.length, "channels");
        } else {
          console.log("⚠️ Frontend - No channels array in response, using fallback");
          setChannels(data || []);
          console.log("⚠️ Frontend - Using fallback data:", data);
        }
      } else if (response.status === 403) {
        console.warn("Channels API access denied, using bundle data instead");
        // Fallback to bundle data if available
        if (bundle?.channels) {
          setChannels(bundle.channels || []);
        } else if (bundle?.telegramChatId) {
          // Legacy single channel fallback
          setChannels([{
            chatId: bundle.telegramChatId,
            chatTitle: bundle.telegramChatTitle || "Legacy Channel",
            isActive: true,
            addedAt: new Date()
          }]);
        }
      } else {
        console.warn("Channels fetch failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn("No auth token available for plans fetch");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Frontend - Plans API response:", data);
        console.log("🔍 Frontend - Plans array:", data?.plans);
        console.log("🔍 Frontend - Plans count:", data?.plans?.length);
        
        if (data?.plans) {
          console.log("✅ Frontend - Setting plans from API:", data.plans);
          setPlans(data.plans);
          console.log("✅ Frontend - Plans state should now be:", data.plans.length, "plans");
        } else {
          console.log("⚠️ Frontend - No plans array in response, using fallback");
          setPlans(data || []);
          console.log("⚠️ Frontend - Using fallback data:", data);
        }
      } else if (response.status === 403) {
        console.warn("Plans API access denied, using bundle data instead");
        // Fallback to bundle data if available
        if (bundle?.plans && Array.isArray(bundle.plans)) {
          setPlans(bundle.plans || []);
        }
      } else {
        console.warn("Plans fetch failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn("No auth token available for analytics fetch");
        return;
      }

      // Fetch bundle-specific analytics from multiple endpoints
      const [
        statsResponse,
        earningsResponse,
        conversionResponse,
        subscriptionResponse
      ] = await Promise.allSettled([
        fetch(`http://localhost:4000/api/analytics/bundle/${id}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/analytics/bundle/${id}/earnings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/analytics/bundle/${id}/conversion`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/analytics/bundle/${id}/subscriptions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Process successful responses
      const newAnalytics = { ...analytics };

      // Basic stats (earnings, purchases, users)
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        newAnalytics.totalEarnings = statsData.totalEarnings || 0;
        newAnalytics.totalPurchases = statsData.totalPurchases || 0;
        newAnalytics.activeUsers = statsData.activeUsers || 0;
        newAnalytics.expiredSubscriptions = statsData.expiredSubscriptions || 0;
      }

      // Earnings data for charts
      if (earningsResponse.status === 'fulfilled' && earningsResponse.value.ok) {
        const earningsData = await earningsResponse.value.json();
        newAnalytics.earningsData = earningsData.dailyEarnings || [];
        newAnalytics.timeAnalysis = earningsData.hourlyAnalysis || [];
        newAnalytics.locationData = earningsData.locationData || [];
      }

      // Conversion rates
      if (conversionResponse.status === 'fulfilled' && conversionResponse.value.ok) {
        const conversionData = await conversionResponse.value.json();
        newAnalytics.conversionRates = {
          landingPage: conversionData.landingPage || 0,
          directPayment: conversionData.directPayment || 0,
          affiliatePayment: conversionData.affiliatePayment || 0
        };
      }

      // Subscription data
      if (subscriptionResponse.status === 'fulfilled' && subscriptionResponse.value.ok) {
        const subData = await subscriptionResponse.value.json();
        newAnalytics.subscriptionOverview = subData.overview || [];
        newAnalytics.renewalData = subData.renewals || [];
        newAnalytics.topPlans = subData.topPlans || [];
        newAnalytics.expiringSubscriptions = subData.expiring || [];
      }

      setAnalytics(newAnalytics);
      console.log("Analytics data updated:", newAnalytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Keep existing analytics state (empty defaults) on error
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const [testingConnection, setTestingConnection] = useState(false);
  
  const testBotConnection = async () => {
    if (!newChannel.chatId.trim()) {
      toast.error("Please enter a valid Chat ID");
      return;
    }

    try {
      setTestingConnection(true);
      
      // Make direct API call to avoid toast errors from groupActions
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/groups/${id}/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chatId: newChannel.chatId })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.isAdmin) {
          toast.success(`✅ Bot connection successful! Chat: ${result.chatTitle} (${result.chatType})`);
          // Auto-populate the channel title if not already set
          if (!newChannel.chatTitle && result.chatTitle) {
            setNewChannel(prev => ({ ...prev, chatTitle: result.chatTitle }));
          }
          return true;
        } else {
          toast.error('❌ Bot is not admin in this chat. Please add the bot as admin first.');
          return false;
        }
      } else if (response.status === 403) {
        toast.warn('⚠️ Bot testing unavailable for this bundle. You can still add the channel manually.');
        return false;
      } else {
        const errorData = await response.json();
        toast.error(`❌ ${errorData.message || 'Failed to test bot connection'}`);
        return false;
      }
    } catch (error) {
      console.error('Bot connection test failed:', error);
      toast.warn('⚠️ Bot testing unavailable. You can still add the channel manually.');
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  const addChannel = async () => {
    if (!newChannel.chatId.trim()) {
      toast.error("Please enter a valid Chat ID");
      return;
    }

    // Test bot connection first
    const connectionTest = await testBotConnection();
    if (!connectionTest) {
      return; // Don't proceed if bot connection test fails
    }

    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newChannel)
      });

      if (response.ok) {
        toast.success("Channel added successfully!");
        setNewChannel({ chatId: "", chatTitle: "" });
        setShowAddChannel(false);
        fetchChannels();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to add channel");
      }
    } catch (error) {
      console.error("Error adding channel:", error);
      toast.error("Failed to add channel. Please try again.");
    }
  };

  const removeChannel = async (channelId) => {
    if (!window.confirm("Are you sure you want to remove this channel?")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success("Channel removed successfully!");
        fetchChannels();
      } else {
        toast.error("Failed to remove channel");
      }
    } catch (error) {
      console.error("Error removing channel:", error);
      toast.error("Failed to remove channel. Please try again.");
    }
  };

  const generateJoinLink = async (channelId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/channels/${channelId}/generate-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.joinLink) {
          navigator.clipboard.writeText(data.joinLink);
          toast.success("Join link copied to clipboard!");
        }
        fetchChannels();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to generate join link");
      }
    } catch (error) {
      console.error("Error generating join link:", error);
      toast.error("Failed to generate join link. Please try again.");
    }
  };

  const addPlan = async () => {
    if (!newPlan.mrp || parseFloat(newPlan.mrp) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Map duration from modal controls to backend-friendly value
      const computeDurationKey = () => {
        const value = Number(durationValue) || 1;
        const unit = durationUnit; // 'day' | 'month' | 'year'
        const plural = value === 1 ? unit : `${unit}s`;
        return `${value} ${plural}`; // e.g., '20 days', '1 month', '2 years'
      };

      const planToAdd = {
        type: planType || newPlan.type || 'Base',
        duration: computeDurationKey(),
        mrp: parseFloat(newPlan.mrp),
        highlight: !!newPlan.highlight,
        order: Number.isFinite(plans?.length) ? plans.length : 0,
        isActive: true,
        createdAt: new Date()
      };

      // Try multiple API approaches
      let planAdded = false;
      
      // Approach 1: Direct plan endpoint
      try {
        console.log("🚀 Attempting direct plan API:", `POST /api/groups/${id}/plans`);
        console.log("📦 Plan data:", planToAdd);
        console.log("🔑 Token present:", !!token);
        
        const response = await fetch(`http://localhost:4000/api/groups/${id}/plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(planToAdd)
        });

        console.log("📡 Direct plan API response:", response.status, response.statusText);

        if (response.ok) {
          console.log("✅ Direct plan API succeeded");
          const data = await response.json().catch(() => ({}));
          const returnedPlan = data.plan || data;
          toast.success("Plan added successfully!");
          // Prefer backend-returned plan with real _id
          if (returnedPlan && (returnedPlan._id || returnedPlan.id)) {
            setPlans(prev => [...prev, { ...planToAdd, ...returnedPlan }]);
          }
          // Sync with backend to avoid divergence
          fetchPlans();
          planAdded = true;
        } else if (response.status !== 403 && response.status !== 404) {
          const error = await response.json().catch(() => ({}));
          console.error("❌ Direct plan API error:", error);
          throw new Error(error.message || `API error: ${response.status}`);
        } else {
          console.warn(`⚠️ Direct plan API returned ${response.status} - trying fallback`);
        }
      } catch (directError) {
        console.warn("❌ Direct plan API failed:", directError.message);
      }

      // Approach 2: Use groupActions service
      if (!planAdded) {
        try {
          console.log("🚀 Attempting groupActions update approach");
          // Get current bundle data and add the new plan
          const currentPlans = [...plans, planToAdd];
          const updateData = {
            subscriptionPlans: currentPlans,
            plans: currentPlans // Try both field names
          };
          console.log("📦 GroupActions update data:", updateData);

          const result = await groupActions.updateGroup(id, updateData);
          console.log("✅ GroupActions update succeeded:", result);
          toast.success("Plan added successfully via groupActions!");
          setPlans(currentPlans);
          // Also pull fresh list from server (populated ids)
          fetchPlans();
          planAdded = true;
        } catch (groupActionsError) {
          console.warn("❌ GroupActions approach failed:", groupActionsError.message);
        }
      }

      // Approach 3: Direct bundle update API
      if (!planAdded) {
        try {
          console.log("🚀 Attempting direct bundle update API:", `PUT /api/groups/${id}`);
          // Get current bundle data and add the new plan
          const currentPlans = [...plans, planToAdd];
          const updateData = {
            subscriptionPlans: currentPlans,
            plans: currentPlans // Try both field names
          };
          console.log("📦 Bundle update data:", updateData);

          const response = await fetch(`http://localhost:4000/api/groups/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
          });

          console.log("📡 Bundle update API response:", response.status, response.statusText);

          if (response.ok) {
            console.log("✅ Bundle update API succeeded");
            toast.success("Plan added successfully via bundle update!");
            // Try to take plans from response if present
            const updated = await response.json().catch(() => ({}));
            const updatedPlans = updated?.subscriptionPlans || updated?.plans;
            if (Array.isArray(updatedPlans)) {
              setPlans(updatedPlans);
            } else {
              setPlans(prev => [...prev, planToAdd]);
            }
            // Ensure final sync
            fetchPlans();
            planAdded = true;
          } else if (response.status !== 403) {
            const error = await response.json().catch(() => ({}));
            console.error("❌ Bundle update API error:", error);
            console.warn("Bundle update failed:", error);
          } else {
            console.warn(`⚠️ Bundle update API returned ${response.status} - access denied`);
          }
        } catch (updateError) {
          console.error("❌ Bundle update approach failed:", updateError.message);
          console.warn("Bundle update approach failed:", updateError.message);
        }
      }

      // Approach 4: Local state management as fallback
      if (!planAdded) {
        console.log("⚠️ All API approaches failed - using local state management for plan addition");
        toast.warn("⚠️ Plan management not available for this bundle. Changes saved locally");
        // Add temporary ID for UI purposes only
        const planForUI = {
          ...planToAdd,
          _id: Date.now().toString()
        };
        setPlans(prev => [...prev, planForUI]);
        planAdded = true;
      }

      // Update local state and UI
      if (planAdded) {
        setNewPlan({ type: "Base", duration: "month", mrp: "", highlight: false, order: 0 });
        setPlanType('Base');
        setDurationUnit('month');
        setDurationValue(1);
        setShowAddPlan(false);
      }

    } catch (error) {
      console.error("Error adding plan:", error);
      toast.error("Failed to add plan. Please try again.");
    }
  };

  const removePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to remove this plan?")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success("Plan removed successfully!");
        fetchPlans();
      } else if (response.status === 403 || response.status === 404) {
        console.warn("Remove plan API access denied - attempting bundle update fallback");
        // Fallback: try updating the group's plans array directly
        try {
          const token = localStorage.getItem('token');
          const updatedPlans = plans.filter(p => p._id !== planId);
          const updateRes = await fetch(`http://localhost:4000/api/groups/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              subscriptionPlans: updatedPlans,
              plans: updatedPlans
            })
          });
          if (updateRes.ok) {
            setPlans(updatedPlans);
            toast.success("Plan removed successfully!");
          } else {
            console.warn('Bundle update fallback failed. Removing from UI only.');
            setPlans(prev => prev.filter(plan => plan._id !== planId));
            toast.warn("⚠️ Plan management not available. Removed from display only.");
          }
        } catch (fbErr) {
          console.warn('Bundle update fallback error:', fbErr);
          setPlans(prev => prev.filter(plan => plan._id !== planId));
          toast.warn("⚠️ Plan management not available. Removed from display only.");
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.error("Remove plan API error:", response.status, error);
        toast.error(error.message || "Failed to remove plan");
      }
    } catch (error) {
      console.error("Error removing plan:", error);
      toast.error("Failed to remove plan. Please try again.");
    }
  };

  // Plan management functions
  const updatePlan = async (planId, updatedData) => {
    try {
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        // Include both discountPrice and offerPrice for backend compatibility
        body: JSON.stringify({
          ...updatedData,
          offerPrice: updatedData.discountPrice ?? updatedData.offerPrice ?? null
        })
      });

      if (response.ok) {
        toast.success("Plan updated successfully!");
        // Optimistic update to avoid flicker
        setPlans(prev => prev.map(p => p._id === planId ? { ...p, ...updatedData, offerPrice: updatedData.discountPrice ?? updatedData.offerPrice ?? null } : p));
        // Also refresh from server if available
        fetchPlans();
      } else {
        toast.error("Failed to update plan");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan. Please try again.");
    }
  };

  const togglePlan = async (planId, isActive) => {
    await updatePlan(planId, { isActive });
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
  };

  // Drag and drop functionality
  const handleDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    const { source, destination } = result;

    if (source.index === destination.index) {
      return;
    }

    console.log('🔄 Starting drag and drop reorder:', {
      from: source.index,
      to: destination.index,
      totalPlans: plans.length
    });

    // Store the original plans for potential revert
    const originalPlans = [...plans];
    
    // Reorder the plans array
    const newPlans = Array.from(plans);
    const [reorderedPlan] = newPlans.splice(source.index, 1);
    newPlans.splice(destination.index, 0, reorderedPlan);

    // Update local state immediately for responsive UI
    setPlans(newPlans);

    try {
      // Update the order field for each plan
      const updatedPlans = newPlans.map((plan, index) => ({
        ...plan,
        order: index,
        updatedAt: new Date()
      }));

      console.log('📡 Sending reorder request to backend:', {
        url: `http://localhost:4000/api/groups/${id}/plans/reorder`,
        plansCount: updatedPlans.length,
        newOrder: updatedPlans.map((p, i) => ({ id: p._id, order: i }))
      });

      // Try to update the order on the backend
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/groups/${id}/plans/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plans: updatedPlans })
      });

      console.log('📡 Backend response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Reorder successful:', data.message);
        toast.success("✅ Plan order updated and saved successfully!");
        
        // Don't update the state with backend response since drag-and-drop is working correctly
        // and the backend data might be missing some UI fields like prices
        // The optimistic update (setPlans(newPlans) on line 704) is sufficient
        console.log('🔄 Keeping current optimistic state - backend confirmed success');
        // Keep the current newPlans state as it's already correct and has all UI fields
      } else if (response.status === 403) {
        console.warn('❌ Access denied - admin may not own this group');
        const errorData = await response.json().catch(() => ({}));
        toast.error(`❌ Access denied: ${errorData.message || 'You do not have permission to reorder plans for this bundle'}`);
        
        // Revert to original plans
        setPlans(originalPlans);
      } else if (response.status === 404) {
        console.warn('❌ Reorder endpoint not found - trying fallback');
        
        // Fallback: update via bundle update API
        try {
          console.log('🔄 Trying fallback: updating entire bundle');
          const updateResponse = await fetch(`http://localhost:4000/api/groups/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              subscriptionPlans: updatedPlans
            })
          });

          if (updateResponse.ok) {
            console.log('✅ Fallback update successful');
            toast.success("✅ Plan order updated successfully!");
            
            const fallbackData = await updateResponse.json();
            const fallbackPlans = fallbackData.subscriptionPlans || fallbackData.plans;
            if (fallbackPlans && Array.isArray(fallbackPlans) && fallbackPlans.length > 0) {
              console.log('🔄 Updating with fallback response:', fallbackPlans.length, 'plans');
              setPlans(fallbackPlans);
            }
            // If no plans in response, keep current reordered state
          } else {
            console.error('❌ Fallback update also failed:', updateResponse.status);
            toast.error("❌ Failed to save plan order. Please try again.");
            
            // Revert to original plans
            setPlans(originalPlans);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback update error:', fallbackError);
          toast.error("❌ Failed to save plan order. Please try again.");
          
          // Revert to original plans
          setPlans(originalPlans);
        }
      } else {
        console.error('❌ Unexpected response status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        toast.error(`❌ Failed to save plan order: ${errorData.message || 'Server error'}`);
        
        // Revert to original plans
        setPlans(originalPlans);
      }
    } catch (error) {
      console.error('❌ Network error during reorder:', error);
      toast.error("❌ Network error. Plan order changes were not saved.");
      
      // Revert to original plans
      setPlans(originalPlans);
    }
  };

  const savePageContent = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      // Collect all the page content form data
      const formData = new FormData(document.querySelector('form[data-page-content]'));
      const contentData = Object.fromEntries(formData.entries());

      const response = await fetch(`http://localhost:4000/api/groups/${id}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          howItWorks: {
            title: contentData.howItWorksTitle || "How It Works",
            description: contentData.howItWorksDescription || "Get started in 4 simple steps"
          },
          contentSection: {
            hidden: !contentData.contentSectionEnabled,
            title: contentData.contentTitle || "Premium Content",
            subtitle: contentData.contentSubtitle || "What You'll Get",
            description: contentData.contentDescription || "",
            expandedText: contentData.contentExpandedText || ""
          },
          disclaimer: {
            hidden: !contentData.disclaimerEnabled,
            title: contentData.disclaimerTitle || "Disclaimer",
            content: contentData.disclaimerContent || ""
          }
        })
      });

      if (response.ok) {
        toast.success("Page content saved successfully!");
        fetchBundleData(); // Refresh bundle data
      } else {
        toast.error("Failed to save page content");
      }
    } catch (error) {
      console.error("Error saving page content:", error);
      toast.error("Failed to save page content. Please try again.");
    }
  };

  const getDurationDisplay = (duration) => {
    switch (duration) {
      case 'month': return '1 Month';
      case 'quarter': return '3 Months';
      case 'half-year': return '6 Months';
      case 'year': return '1 Year';
      default: {
        // Support formats like '20 days', '2 months', '1 year', '1 day'
        if (typeof duration === 'string') {
          const m = duration.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/i);
          if (m) {
            const value = parseInt(m[1], 10);
            const unit = m[2].toLowerCase();
            const prettyUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
            const finalUnit = value === 1 ? prettyUnit : prettyUnit + 's';
            return `${value} ${finalUnit.charAt(0).toUpperCase()}${finalUnit.slice(1)}`;
          }
        }
        return duration;
      }
    }
  };

  const getDurationDays = (duration) => {
    switch (duration) {
      case 'month': return 30;
      case 'quarter': return 90;
      case 'half-year': return 180;
      case 'year': return 365;
      default: return 30;
    }
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
    if (!bundle) return 0;
    
    // Priority: Use frontend channels state first (most up-to-date)
    if (channels.length > 0) {
      return channels.filter(ch => ch.isActive).length;
    }
    
    // Fallback: Use bundle.channels if available
    if (bundle.channels && Array.isArray(bundle.channels)) {
      return bundle.channels.filter(ch => ch.isActive).length;
    }
    
    // Final fallback: Legacy single channel
    return bundle.telegramChatId ? 1 : 0;
  };

  // PlanCard component
  const PlanCard = ({ plan, index, onUpdate, onToggle, onDelete, onEdit, isDragging = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const parseDuration = (durationStr) => {
      // Map legacy keys
      const map = {
        'month': { value: 1, unit: 'month' },
        'quarter': { value: 3, unit: 'month' },
        'half-year': { value: 6, unit: 'month' },
        'year': { value: 1, unit: 'year' }
      };
      if (map[durationStr]) return map[durationStr];
      // Parse formats like '14 days', '1 month', '2 years'
      if (typeof durationStr === 'string') {
        const m = durationStr.match(/^(\d+)\s*(day|days|month|months|year|years)$/i);
        if (m) {
          const value = parseInt(m[1], 10) || 1;
          let unit = m[2].toLowerCase();
          if (unit.endsWith('s')) unit = unit.slice(0, -1);
          return { value, unit };
        }
      }
      return { value: 1, unit: 'month' };
    };
    const parsed = parseDuration(plan.duration);
    const [editedPlan, setEditedPlan] = useState({
      name: getDurationDisplay(plan.duration),
      price: plan.mrp,
      discountPrice: plan.discountPrice || plan.offerPrice || '',
      hasDiscount: !!(plan.discountPrice || plan.offerPrice),
      subscribers: plan.activeSubscribers || 0,
      durationUnit: parsed.unit,
      durationValue: parsed.value
    });

    const handleSave = () => {
      const value = Number(editedPlan.durationValue) || 1;
      const unit = editedPlan.durationUnit || 'day';
      const plural = value === 1 ? unit : `${unit}s`;
      const durationString = `${value} ${plural}`;
      const updatedData = {
        mrp: parseFloat(editedPlan.price),
        discountPrice: editedPlan.hasDiscount ? parseFloat(editedPlan.discountPrice) : null,
        duration: durationString
      };
      
      // Debug logging
      console.log('🔍 Saving plan data:', updatedData);
      console.log('   MRP:', updatedData.mrp);
      console.log('   Discount Price:', updatedData.discountPrice);
      console.log('   Has Discount:', editedPlan.hasDiscount);
      
      onUpdate(plan._id, updatedData);
      setIsEditing(false);
    };

    const calculateDiscount = () => {
      if (!editedPlan.hasDiscount || !editedPlan.discountPrice) return null;
      const original = parseFloat(editedPlan.price);
      const discounted = parseFloat(editedPlan.discountPrice);
      if (original && discounted && original > discounted) {
        return Math.round(((original - discounted) / original) * 100);
      }
      return null;
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all ${
        isDragging ? 'shadow-xl rotate-2 scale-105 z-50' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-move text-gray-400 hover:text-gray-600 drag-handle">
              <GripVertical className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getDurationDisplay(plan.duration)}
            </h3>
          </div>
          
          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={plan.isActive}
                onChange={(e) => onToggle(plan._id, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
            
            {/* Edit/Save Button */}
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              {isEditing ? <CheckCircle className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Price Section */}
        <div className="mb-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editedPlan.durationUnit}
                    onChange={(e) => setEditedPlan({ ...editedPlan, durationUnit: e.target.value })}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={editedPlan.durationValue}
                    onChange={(e) => setEditedPlan({ ...editedPlan, durationValue: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. 14"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan Price</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    type="number"
                    value={editedPlan.price}
                    onChange={(e) => setEditedPlan({ ...editedPlan, price: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editedPlan.hasDiscount}
                  onChange={(e) => setEditedPlan({ ...editedPlan, hasDiscount: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Offer discounted price on plan price
                </label>
              </div>
              
              {editedPlan.hasDiscount && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₹</span>
                    <input
                      type="number"
                      value={editedPlan.discountPrice}
                      onChange={(e) => setEditedPlan({ ...editedPlan, discountPrice: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Discounted price"
                    />
                  </div>
                  {calculateDiscount() && (
                    <div className="text-right mt-1">
                      <span className="text-blue-600 font-medium">
                        ₹ {editedPlan.discountPrice} ₹ {editedPlan.price} ({calculateDiscount()}% off)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                {(plan.discountPrice || plan.offerPrice) ? (
                  <>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{plan.discountPrice || plan.offerPrice}
                    </span>
                    <span className="text-lg text-gray-500 line-through">₹{plan.mrp}</span>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {Math.round(((plan.mrp - (plan.discountPrice || plan.offerPrice)) / plan.mrp) * 100)}% off
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{plan.mrp}</span>
                )}
                <span className="text-gray-500">/ {getDurationDisplay(plan.duration)}</span>
              </div>
              <div className="text-sm text-gray-500">
                {editedPlan.subscribers} Active Subscribers
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onEdit(plan)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Details
          </button>
          
          <button
            onClick={() => onDelete(plan._id)}
            className="text-red-600 hover:text-red-800 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Channels</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{getChannelCount(bundle)}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{plans.length}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Subscribers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.activeUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                {getBundleStatusIcon(bundle)}
                <span className="text-gray-900 dark:text-white">
                  {bundle.isDefault ? "Default Bundle" : bundle.status?.charAt(0).toUpperCase() + bundle.status?.slice(1)}
                </span>
              </div>
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
            onClick={() => setActiveTab("content")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "content"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Page Content
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
      {/* ============== COMPREHENSIVE OVERVIEW WITH ANALYTICS ============== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Analytics Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Filter data to analyze bundle performance over time
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Date Range Filter */}
                <div className="min-w-[240px]">
                  <DateRangePicker
                    value={dateRangeValue}
                    onChange={(newValue) => {
                      setDateRangeValue(newValue);
                      // Refetch analytics with new date range
                      fetchAnalytics();
                    }}
                    placeholder="Select date range"
                  />
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={fetchAnalytics}
                  disabled={analyticsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
          {/* Big Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { 
                label: "Total earnings", 
                value: analyticsLoading ? "Loading..." : (analytics.totalEarnings > 0 ? `₹${(analytics.totalEarnings / 100000).toFixed(2)}L` : "₹0"),
                loading: analyticsLoading
              },
              { 
                label: "Total purchases", 
                value: analyticsLoading ? "Loading..." : analytics.totalPurchases.toString(),
                loading: analyticsLoading
              },
              { 
                label: "Current active users", 
                value: analyticsLoading ? "Loading..." : analytics.activeUsers.toString(),
                loading: analyticsLoading
              },
              { 
                label: "Subscriptions expired", 
                value: analyticsLoading ? "Loading..." : analytics.expiredSubscriptions.toString(),
                loading: analyticsLoading
              },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">{card.label}</div>
                <div className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Earnings & Purchases */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Earnings and purchases
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.earningsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.earningsData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="earnings" fill="#6366f1" />
                  <Bar dataKey="purchases" fill="#93c5fd" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading earnings data...
                  </div>
                ) : (
                  <div className="text-center">
                    <BarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No earnings data available yet</p>
                    <p className="text-sm">Data will appear after first purchases</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conversion rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Conversion rate
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {[
              { 
                label: "Landing page link", 
                value: analyticsLoading ? "Loading..." : `${analytics.conversionRates.landingPage.toFixed(2)}%`
              },
              { 
                label: "Direct payment link", 
                value: analyticsLoading ? "Loading..." : `${analytics.conversionRates.directPayment.toFixed(2)}%`
              },
              { 
                label: "Affiliate payment link", 
                value: analyticsLoading ? "Loading..." : `${analytics.conversionRates.affiliatePayment.toFixed(2)}%`
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300 mb-3"
              >
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Best time to sell */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Best time to sell
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.timeAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.timeAnalysis}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="earnings" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading time analysis data...
                  </div>
                ) : (
                  <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No time analysis data available yet</p>
                    <p className="text-sm">Data will appear after sales activity</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top 10 locations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Top 10 locations
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart layout="vertical" data={analytics.locationData}>
                  <XAxis type="number" />
                  <YAxis dataKey="location" type="category" width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading location data...
                  </div>
                ) : (
                  <div className="text-center">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No location data available yet</p>
                    <p className="text-sm">Data will appear after customer purchases</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subscriptions overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Subscriptions overview
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.subscriptionOverview.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.subscriptionOverview}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-65 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading subscription overview...
                  </div>
                ) : (
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No subscription data available yet</p>
                    <p className="text-sm">Data will appear after subscriptions are created</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subscriptions renewal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Subscriptions renewal
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.renewalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.renewalData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="renewals" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-55 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading renewal data...
                  </div>
                ) : (
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No renewal data available yet</p>
                    <p className="text-sm">Data will appear after subscription renewals</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top 3 subscription plans */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Top subscription plans
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.topPlans.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.topPlans}
                    dataKey="count"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {analytics.topPlans.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || `#${Math.floor(Math.random()*16777215).toString(16)}`} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-65 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading plan analytics...
                  </div>
                ) : (
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No plan data available yet</p>
                    <p className="text-sm">Data will appear after plan subscriptions</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subscriptions expiring in 7 days */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Subscriptions expiring in 7 days
              {analyticsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </div>
            {analytics.expiringSubscriptions.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.expiringSubscriptions}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-55 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {analyticsLoading ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading expiry data...
                  </div>
                ) : (
                  <div className="text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No expiring subscriptions</p>
                    <p className="text-sm">Great! All subscriptions are current</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUBSCRIPTION PLANS TAB ================= */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Average revenue/subscription purchased</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">₹0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Plan with highest subscriptions sold</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Total subscriptions sold till date</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>
            <button
              onClick={() => setShowAddPlan(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>

          {(() => {
            console.log("🔍 Frontend - Rendering plans. Current state:", {
              plansLength: plans.length,
              plans: plans
            });
            return plans.length > 0;
          })() ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                <Droppable droppableId="plans">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-4 min-h-[100px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2' : ''
                      }`}
                    >
                      {plans.map((plan, index) => (
                        <Draggable key={plan._id || `plan-${index}`} draggableId={plan._id || `plan-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                transform: snapshot.isDragging 
                                  ? `${provided.draggableProps.style?.transform} rotate(2deg)` 
                                  : provided.draggableProps.style?.transform
                              }}
                            >
                              <PlanCard 
                                plan={plan} 
                                index={index}
                                onUpdate={updatePlan}
                                onToggle={togglePlan}
                                onDelete={removePlan}
                                onEdit={editPlan}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                {/* Add Another Plan Button */}
                <div 
                  onClick={() => setShowAddPlan(true)}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                >
                  <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                  <span className="text-gray-500 group-hover:text-blue-500 font-medium">Add another Plan</span>
                </div>
              </div>
            </DragDropContext>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-8 flex flex-col items-center text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No plans created</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Create subscription plans to start selling access to your channel bundle.
              </p>
              <button
                onClick={() => setShowAddPlan(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                Create Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= CHANNELS TAB ================= */}
      {activeTab === "channels" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Telegram Channels</h3>
            <button
              onClick={() => setShowAddChannel(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </div>

          {(() => {
            console.log("🔍 Frontend - Rendering channels. Current state:", {
              channelsLength: channels.length,
              channels: channels,
              bundleTelegramChatId: bundle?.telegramChatId
            });
            return channels.length > 0 || bundle.telegramChatId;
          })() ? (
            <div className="grid gap-4">
              {/* Legacy single channel display */}
              {bundle.telegramChatId && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MessageCircle className="w-8 h-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {bundle.telegramChatTitle || "Legacy Channel"}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Chat ID: {bundle.telegramChatId}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Active (Legacy)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New multi-channel display */}
              {channels.map((channel) => (
                <div key={channel._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MessageCircle className="w-8 h-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {channel.chatTitle || "Unnamed Channel"}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Chat ID: {channel.chatId}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                            channel.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {channel.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </span>
                          {channel.joinLink && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs rounded-full">
                              <LinkIcon className="w-3 h-3" />
                              Join Link Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {channel.joinLink ? (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(channel.joinLink);
                            toast.success("Join link copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </button>
                      ) : (
                        <button
                          onClick={() => generateJoinLink(channel._id)}
                          className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Generate Link
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeChannel(channel._id)}
                        className="p-1 text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-8 flex flex-col items-center text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No channels configured</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Add Telegram channels to your bundle to start offering subscriptions.
              </p>
              <button
                onClick={() => setShowAddChannel(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                Add Channel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= PAGE CONTENT TAB ================= */}
      {activeTab === "content" && (
        <form data-page-content className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Customize Your Channel Bundle Page
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure the sections that appear on your public channel bundle page
            </p>
          </div>

          {/* How It Works Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How It Works Section</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Step-by-step process for users
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Title</label>
                <input
                  type="text"
                  name="howItWorksTitle"
                  defaultValue={bundle?.howItWorks?.title || "How It Works"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Description</label>
                <input
                  type="text"
                  name="howItWorksDescription"
                  defaultValue={bundle?.howItWorks?.description || "Get started in 4 simple steps"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Steps</label>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  + Add Step
                </button>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                      {step}
                    </span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Step title"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Step description"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Section</h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="contentSectionEnabled" className="rounded" defaultChecked={!bundle?.contentSection?.hidden} />
                <span className="text-sm text-gray-600 dark:text-gray-400">Show section</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  name="contentTitle"
                  defaultValue={bundle?.contentSection?.title || "Premium Content"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtitle</label>
                <input
                  type="text"
                  name="contentSubtitle"
                  defaultValue={bundle?.contentSection?.subtitle || "What You'll Get"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                rows="3"
                name="contentDescription"
                defaultValue={bundle?.contentSection?.description || "Access exclusive content and premium features designed for your success."}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Extended Content</label>
              <textarea
                rows="4"
                name="contentExpandedText"
                placeholder="Additional content shown when user clicks 'Learn more'"
                defaultValue={bundle?.contentSection?.expandedText}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Disclaimer Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Disclaimer Section</h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="disclaimerEnabled" className="rounded" defaultChecked={!bundle?.disclaimer?.hidden} />
                <span className="text-sm text-gray-600 dark:text-gray-400">Show section</span>
              </label>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
              <input
                type="text"
                name="disclaimerTitle"
                defaultValue={bundle?.disclaimer?.title || "Disclaimer"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
              <textarea
                rows="6"
                name="disclaimerContent"
                defaultValue={bundle?.disclaimer?.content}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button 
              type="button"
              onClick={savePageContent}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Page Content
            </button>
          </div>
        </form>
      )}

      {/* ================= COUPONS TAB ================= */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Unique active coupons created to date</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Coupons used till date</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">No coupons applied yet</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Revenue from coupon redemption</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">₹0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-8 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No coupons created</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Please create your first coupon to get started.
            </p>
            <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
              Create coupon
            </button>
          </div>
        </div>
      )}

      {/* ================= AFFILIATE TAB ================= */}
      {activeTab === "affiliate" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Affiliate sales</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Amount earned from affiliate</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">₹0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-400">Commission paid to affiliates</h4>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">₹0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">For this month</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-8 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Affiliate is disabled</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Please enable your affiliate to get started.
            </p>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Channel</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telegram Chat ID *
                  </label>
                  <input
                    type="text"
                    value={newChannel.chatId}
                    onChange={(e) => setNewChannel({ ...newChannel, chatId: e.target.value })}
                    placeholder="e.g., -1001234567890"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                {/* Test Bot Connection Button */}
                <div>
                  <button
                    onClick={testBotConnection}
                    disabled={!newChannel.chatId || testingConnection}
                    className={`w-full py-2 text-sm font-medium rounded-lg transition ${
                      !newChannel.chatId || testingConnection
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-600'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
                    }`}
                  >
                    {testingConnection ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
                        Testing Connection...
                      </>
                    ) : (
                      '🤖 Test Bot Connection'
                    )}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Verify that Rigi_Robot has admin access to this channel
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={addChannel}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Channel
                </button>
                <button
                  onClick={() => {
                    setShowAddChannel(false);
                    setNewChannel({ chatId: "", chatTitle: "" });
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddPlan && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-5 rounded-md shadow-md w-[320px] text-xs">
            <h2 className="text-blue-600 font-semibold mb-3 text-sm">Add Subscription Plan</h2>
            <form className="space-y-3">
              <div>
                <label className="block text-xs mb-1">Type *</label>
                <input
                  type="text"
                  value={planType}
                  onChange={e => setPlanType(e.target.value)}
                  className="w-full border rounded-md px-2 py-1 text-xs"
                  placeholder="Enter plan type (e.g. Base, Pro, Enterprise)"
                  required
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Duration *</label>
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
                <label className="block text-xs mb-1">MRP *</label>
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
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlan(false);
                    setNewPlan({ type: "Base", duration: "month", mrp: "", highlight: false, order: 0 });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addPlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                >
                  Add Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}