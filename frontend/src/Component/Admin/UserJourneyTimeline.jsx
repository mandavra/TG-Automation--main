import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  CreditCard,
  FileText,
  Shield,
  Link,
  LogIn,
  LogOut,
  Smartphone,
  Globe,
  Monitor,
  MapPin,
  Activity,
  Settings,
  Eye,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  UserCheck,
  AlertCircle,
  DollarSign,
  FileSignature,
  Package
} from 'lucide-react';

const UserJourneyTimeline = ({ userId, userInfo }) => {
  const [timeline, setTimeline] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    if (userId) {
      loadUserJourney();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadUserJourney, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, filter, dateRange]);

  const loadUserJourney = async () => {
    try {
      const token = localStorage.getItem('token');
      const [timelineResponse, progressResponse] = await Promise.all([
        fetch(`/api/user-activity/${userId}/journey-timeline?filter=${filter}&dateRange=${dateRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/user-activity/${userId}/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (timelineResponse.ok && progressResponse.ok) {
        const timelineData = await timelineResponse.json();
        const progressData = await progressResponse.json();
        
        setTimeline(timelineData.data || []);
        setUserProgress(progressData.data || {});
      }
    } catch (error) {
      console.error('Error loading user journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType) => {
    const iconMap = {
      // Authentication
      user_registered: User,
      user_login: LogIn,
      user_logout: LogOut,
      otp_requested: Phone,
      otp_verified: CheckCircle,
      otp_failed: XCircle,
      
      // Profile
      profile_updated: Settings,
      phone_verified: Phone,
      telegram_connected: Link,
      
      // KYC
      kyc_started: Shield,
      kyc_document_uploaded: FileText,
      kyc_submitted: FileText,
      kyc_approved: CheckCircle,
      kyc_rejected: XCircle,
      
      // E-Sign
      esign_initiated: FileSignature,
      esign_completed: CheckCircle,
      esign_failed: XCircle,
      
      // Payment
      payment_initiated: CreditCard,
      payment_success: DollarSign,
      payment_failed: XCircle,
      channel_links_delivered: Link,
      
      // Channel
      channel_access_granted: Package,
      channel_joined: CheckCircle,
      channel_left: AlertCircle,
      
      // System
      error_occurred: AlertTriangle,
      admin_action_taken: UserCheck
    };
    
    return iconMap[activityType] || Activity;
  };

  const getActivityColor = (activityType, status) => {
    if (status === 'failed') return 'text-red-500 bg-red-50';
    if (status === 'pending') return 'text-yellow-500 bg-yellow-50';
    if (status === 'cancelled') return 'text-gray-500 bg-gray-50';
    
    const colorMap = {
      // Success colors
      user_registered: 'text-green-500 bg-green-50',
      kyc_approved: 'text-green-500 bg-green-50',
      esign_completed: 'text-green-500 bg-green-50',
      payment_success: 'text-green-500 bg-green-50',
      channel_links_delivered: 'text-green-500 bg-green-50',
      
      // Process colors  
      kyc_started: 'text-blue-500 bg-blue-50',
      esign_initiated: 'text-blue-500 bg-blue-50',
      payment_initiated: 'text-blue-500 bg-blue-50',
      
      // Warning colors
      kyc_rejected: 'text-red-500 bg-red-50',
      payment_failed: 'text-red-500 bg-red-50',
      error_occurred: 'text-red-500 bg-red-50',
      
      // Admin colors
      admin_action_taken: 'text-purple-500 bg-purple-50'
    };
    
    return colorMap[activityType] || 'text-gray-500 bg-gray-50';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo;
    if (diffMins < 1) timeAgo = 'Just now';
    else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
    else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
    else timeAgo = `${diffDays}d ago`;
    
    return {
      formatted: date.toLocaleString(),
      timeAgo
    };
  };

  const getStageProgress = () => {
    const stages = [
      { key: 'registration', label: 'Registration', icon: User },
      { key: 'phone_verification', label: 'Phone Verification', icon: Phone },
      { key: 'profile_setup', label: 'Profile Setup', icon: Settings },
      { key: 'kyc_process', label: 'KYC Process', icon: Shield },
      { key: 'esign_process', label: 'E-Sign Process', icon: FileSignature },
      { key: 'plan_selection', label: 'Plan Selection', icon: Package },
      { key: 'payment_process', label: 'Payment Process', icon: CreditCard },
      { key: 'channel_access', label: 'Channel Access', icon: Link },
      { key: 'active_user', label: 'Active User', icon: CheckCircle }
    ];

    const progress = userProgress.stageProgress || {};
    
    return stages.map((stage, index) => {
      const isCompleted = progress[stage.key];
      const isCurrent = userProgress.currentStage === stage.key;
      const Icon = stage.icon;
      
      return (
        <div key={stage.key} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            isCompleted 
              ? 'bg-green-100 border-green-500 text-green-600'
              : isCurrent
              ? 'bg-blue-100 border-blue-500 text-blue-600'
              : 'bg-gray-100 border-gray-300 text-gray-400'
          }`}>
            <Icon size={14} />
          </div>
          
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${
              isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
            }`}>
              {stage.label}
            </p>
            {isCurrent && (
              <p className="text-xs text-blue-600">Current Stage</p>
            )}
          </div>
          
          {index < stages.length - 1 && (
            <div className={`w-0.5 h-8 ml-4 ${
              isCompleted ? 'bg-green-200' : 'bg-gray-200'
            }`}></div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading user journey...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Progress Overview */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">User Progress</h3>
          <div className="text-sm text-gray-600">
            {userProgress.completionPercentage}% Complete
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${userProgress.completionPercentage}%` }}
          ></div>
        </div>
        
        {/* Stage Progress */}
        <div className="space-y-3">
          {getStageProgress()}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activities</option>
              <option value="authentication">Authentication</option>
              <option value="kyc">KYC Process</option>
              <option value="payment">Payments</option>
              <option value="esign">E-Sign</option>
              <option value="admin">Admin Actions</option>
              <option value="errors">Errors</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          
          <button
            onClick={loadUserJourney}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">User Journey Timeline</h3>
          <p className="text-sm text-gray-600">Complete activity log for {userInfo?.firstName} {userInfo?.lastName}</p>
        </div>
        
        <div className="p-4">
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activities found for the selected filters
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.map((activity, index) => {
                const Icon = getActivityIcon(activity.activityType);
                const colorClass = getActivityColor(activity.activityType, activity.status);
                const timestamp = formatTimestamp(activity.timestamp);
                
                return (
                  <div key={activity._id} className="flex items-start space-x-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    
                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {activity.activityTitle}
                        </h4>
                        <div className="text-xs text-gray-500">
                          {timestamp.timeAgo}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.activityDescription}
                      </p>
                      
                      {/* Activity Details */}
                      <div className="mt-2 space-y-2">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.status === 'success' ? 'bg-green-100 text-green-700' :
                            activity.status === 'failed' ? 'bg-red-100 text-red-700' :
                            activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {activity.status.toUpperCase()}
                          </span>
                          
                          {activity.priority === 'critical' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        
                        {/* Technical Details */}
                        {activity.activityData && (
                          <div className="bg-gray-50 rounded p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {/* Device & Location Info */}
                              {activity.activityData.deviceType && (
                                <div className="flex items-center gap-1">
                                  <Monitor size={12} className="text-gray-400" />
                                  <span>{activity.activityData.deviceType} - {activity.activityData.platform}</span>
                                </div>
                              )}
                              
                              {activity.location?.city && (
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} className="text-gray-400" />
                                  <span>{activity.location.city}, {activity.location.country}</span>
                                </div>
                              )}
                              
                              {/* Payment Info */}
                              {activity.activityData.paymentAmount && (
                                <div className="flex items-center gap-1">
                                  <DollarSign size={12} className="text-gray-400" />
                                  <span>₹{activity.activityData.paymentAmount}</span>
                                </div>
                              )}
                              
                              {activity.activityData.planName && (
                                <div className="flex items-center gap-1">
                                  <Package size={12} className="text-gray-400" />
                                  <span>{activity.activityData.planName}</span>
                                </div>
                              )}
                              
                              {/* Error Info */}
                              {activity.activityData.errorMessage && (
                                <div className="col-span-2 text-red-600">
                                  <strong>Error:</strong> {activity.activityData.errorMessage}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Admin Action */}
                        {activity.admin && (
                          <div className="flex items-center gap-1 text-xs text-purple-600">
                            <UserCheck size={12} />
                            <span>Action by: {activity.admin.firstName} {activity.admin.lastName}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          {timestamp.formatted}
                          {activity.duration && (
                            <span className="ml-2">• Duration: {activity.getDurationFormatted()}</span>
                          )}
                          {activity.activityData?.ipAddress && (
                            <span className="ml-2">• IP: {activity.activityData.ipAddress}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserJourneyTimeline;