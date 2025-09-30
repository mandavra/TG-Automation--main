import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Crown, 
  Shield, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Settings,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Activity,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminPanelSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adminStats, setAdminStats] = useState({});

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    const impersonating = localStorage.getItem('impersonating');
    
    if (role === 'superadmin' && !impersonating) {
      setCurrentAdmin({ email: 'Super Admin', role: 'superadmin', isSuper: true });
    } else if (impersonating) {
      loadCurrentAdmin(impersonating);
    }
    
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('originalToken') || localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/admin/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error('Failed to load admins:', error);
    }
  };

  const loadCurrentAdmin = async (adminId) => {
    try {
      const token = localStorage.getItem('originalToken') || localStorage.getItem('token');
      const response = await axios.get(`http://localhost:4000/api/admin/dashboard/admin/${adminId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentAdmin(response.data.admin);
    } catch (error) {
      console.error('Failed to load current admin:', error);
    }
  };

  const loadAdminStats = async (adminId) => {
    if (adminStats[adminId]) return; // Already loaded
    
    try {
      const token = localStorage.getItem('originalToken') || localStorage.getItem('token');
      const response = await axios.get(`http://localhost:4000/api/admin/dashboard/admin/${adminId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAdminStats(prev => ({
        ...prev,
        [adminId]: response.data
      }));
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  };

  const switchToSuperAdmin = () => {
    const originalToken = localStorage.getItem('originalToken');
    if (originalToken) {
      localStorage.setItem('token', originalToken);
      localStorage.setItem('adminRole', 'superadmin');
      localStorage.removeItem('originalToken');
      localStorage.removeItem('originalRole');
      localStorage.removeItem('impersonating');
      
      setCurrentAdmin({ email: 'Super Admin', role: 'superadmin', isSuper: true });
      toast.success('Switched back to Super Admin view');
      navigate('/admin/super-admin-dashboard');
    }
  };

  const switchToAdmin = async (adminId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('originalToken') || localStorage.getItem('token');
      const response = await axios.post(`http://localhost:4000/api/admin/impersonate/${adminId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Store original token if not already stored
      if (!localStorage.getItem('originalToken')) {
        localStorage.setItem('originalToken', localStorage.getItem('token'));
        localStorage.setItem('originalRole', 'superadmin');
      }
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('adminRole', 'admin');
      localStorage.setItem('impersonating', adminId);
      
      setCurrentAdmin(response.data.admin);
      setIsOpen(false);
      toast.success(`Now viewing as ${response.data.admin.email}`);
      
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Failed to switch to admin view');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="relative mb-1">
      {/* Current Admin Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 min-w-48"
      >
        <div className="flex items-center gap-2">
          {currentAdmin?.isSuper ? (
            <Crown className="text-yellow-500" size={18} />
          ) : (
            <Shield className="text-blue-500" size={18} />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {currentAdmin?.email || 'Loading...'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentAdmin?.isSuper ? 'Super Admin' : 'Admin View'}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-[-160px] mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Switch Admin View
            </h3>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search admins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Super Admin Option */}
          <div className="p-2">
            <button
              onClick={switchToSuperAdmin}
              className={`w-full p-3 rounded-lg flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                currentAdmin?.isSuper ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : ''
              }`}
            >
              <Crown className="text-yellow-500" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Super Admin View
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  System-wide access and management
                </p>
              </div>
              {currentAdmin?.isSuper && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              )}
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 mx-2"></div>

          {/* Admin List */}
          <div className="p-2 max-h-80 overflow-y-auto">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-medium">
              ADMIN PANELS ({filteredAdmins.length})
            </div>
            
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No admins found
              </div>
            ) : (
              filteredAdmins.map((admin) => (
                <div
                  key={admin._id}
                  className={`p-3 rounded-lg mb-1 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    localStorage.getItem('impersonating') === admin._id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : ''
                  }`}
                  onMouseEnter={() => loadAdminStats(admin._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users size={14} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {admin.email}
                        </p>
                        
                        {/* Quick Stats */}
                        {adminStats[admin._id] && (
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {adminStats[admin._id].totalUsers} users
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {formatCurrency(adminStats[admin._id].totalRevenue || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => switchToAdmin(admin._id)}
                        disabled={loading}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                      >
                        {loading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          'Switch'
                        )}
                      </button>
                      
                      {localStorage.getItem('impersonating') === admin._id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/create-admin');
                }}
                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Users size={14} />
                Create Admin
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/super-admin-dashboard');
                }}
                className="flex-1 px-3 py-2 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <Crown size={14} />
                Super Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminPanelSwitcher;
