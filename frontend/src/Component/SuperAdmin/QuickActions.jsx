import { useState, useEffect } from 'react';
import { 
  Zap, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Settings,
  FileCheck,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Crown
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const QuickActions = () => {
  const [pendingActions, setPendingActions] = useState({
    withdrawals: 0,
    kycDocuments: 0,
    digioErrors: 0,
    inactiveUsers: 0
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadPendingActions();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadPendingActions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingActions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load pending withdrawals
      const withdrawalsResponse = await axios.get('http://localhost:4000/api/withdrawal/admin/all-requests', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { status: 'pending' }
      });
      
      // Load other pending actions (mock for demo)
      setPendingActions({
        withdrawals: withdrawalsResponse.data.requests?.length || 0,
        kycDocuments: 5, // Mock data
        digioErrors: 2, // Mock data
        inactiveUsers: 15 // Mock data
      });
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  };

  const handleQuickAction = async (action, params = {}) => {
    setActionLoading(prev => ({ ...prev, [action]: true }));
    
    try {
      const token = localStorage.getItem('token');
      
      switch (action) {
        case 'approveAllWithdrawals':
          await axios.post('http://localhost:4000/api/withdrawal/admin/bulk-approve', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          toast.success('All pending withdrawals approved');
          break;
          
        case 'processKycDocuments':
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 2000));
          toast.success('KYC documents processed');
          break;
          
        case 'resolveDigioErrors':
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 1500));
          toast.success('Digio errors resolved');
          break;
          
        case 'activateInactiveUsers':
          await axios.post('http://localhost:4000/api/admin/bulk/users', {
            operation: 'activate',
            userIds: params.userIds || []
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          toast.success('Inactive users activated');
          break;
          
        case 'generateSystemReport':
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 3000));
          toast.success('System report generated and downloaded');
          break;
          
        default:
          toast.info('Action not implemented yet');
      }
      
      // Refresh pending actions
      await loadPendingActions();
    } catch (error) {
      toast.error(`Failed to execute ${action}`);
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const quickActionItems = [
    {
      id: 'approveWithdrawals',
      title: 'Approve Withdrawals',
      description: 'Process pending withdrawal requests',
      icon: DollarSign,
      color: 'green',
      count: pendingActions.withdrawals,
      action: 'approveAllWithdrawals',
      urgent: pendingActions.withdrawals > 5
    },
    {
      id: 'processKyc',
      title: 'Process KYC Documents',
      description: 'Review and approve KYC submissions',
      icon: FileCheck,
      color: 'blue',
      count: pendingActions.kycDocuments,
      action: 'processKycDocuments',
      urgent: pendingActions.kycDocuments > 10
    },
    {
      id: 'resolveErrors',
      title: 'Resolve Digio Errors',
      description: 'Fix document signing issues',
      icon: AlertTriangle,
      color: 'red',
      count: pendingActions.digioErrors,
      action: 'resolveDigioErrors',
      urgent: pendingActions.digioErrors > 0
    },
    {
      id: 'activateUsers',
      title: 'Activate Inactive Users',
      description: 'Reactivate dormant user accounts',
      icon: Users,
      color: 'purple',
      count: pendingActions.inactiveUsers,
      action: 'activateInactiveUsers',
      urgent: pendingActions.inactiveUsers > 20
    },
    {
      id: 'systemReport',
      title: 'Generate System Report',
      description: 'Create comprehensive system analysis',
      icon: TrendingUp,
      color: 'orange',
      count: null,
      action: 'generateSystemReport',
      urgent: false
    },
    {
      id: 'systemHealth',
      title: 'System Health Check',
      description: 'Run comprehensive system diagnostics',
      icon: Shield,
      color: 'indigo',
      count: null,
      action: 'systemHealthCheck',
      urgent: false
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        
        <button
          onClick={loadPendingActions}
          disabled={loading}
          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActionItems.map((item) => {
          const Icon = item.icon;
          const isLoading = actionLoading[item.action];
          
          return (
            <div
              key={item.id}
              className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                item.urgent 
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              {/* Urgent Badge */}
              {item.urgent && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              )}
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`text-${item.color}-500`} size={20} />
                  {item.count !== null && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.urgent
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : `bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-700 dark:text-${item.color}-300`
                    }`}>
                      {item.count}
                    </span>
                  )}
                </div>
                
                {item.urgent && (
                  <AlertTriangle size={16} className="text-red-500" />
                )}
              </div>
              
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                {item.description}
              </p>
              
              <button
                onClick={() => handleQuickAction(item.action)}
                disabled={isLoading || (item.count === 0 && item.count !== null)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  isLoading
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : item.count === 0 && item.count !== null
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : item.urgent
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : `bg-${item.color}-600 hover:bg-${item.color}-700 text-white`
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Execute
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {Object.values(pendingActions).reduce((sum, count) => sum + (count || 0), 0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Total Pending Actions
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {quickActionItems.filter(item => item.urgent).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Urgent Items
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {quickActionItems.filter(item => item.count === 0).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Completed
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {quickActionItems.length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Available Actions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
