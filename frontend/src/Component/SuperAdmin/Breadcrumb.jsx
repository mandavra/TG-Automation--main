import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Home, 
  Crown, 
  Shield, 
  Users,
  Settings,
  BarChart3,
  Search,
  DollarSign,
  FileText,
  Package,
  UserCog,
  CreditCard,
  UserCheck,
  AlertTriangle,
  UserX,
  FileSignature,
  TrendingUp,
  Wallet,
  LayoutDashboard,
  UserPlus
} from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const impersonating = localStorage.getItem('impersonating');
    const role = localStorage.getItem('adminRole');
    
    setIsImpersonating(!!impersonating);
    
    if (impersonating) {
      // Load current admin info (could be from localStorage or API)
      const adminEmail = localStorage.getItem('currentAdminEmail') || 'Unknown Admin';
      setCurrentAdmin({ email: adminEmail });
    } else if (role === 'superadmin') {
      setCurrentAdmin({ email: 'Super Admin', isSuper: true });
    }
  }, []);

  const getPageIcon = (path) => {
    const iconMap = {
      '/admin/dashboard': LayoutDashboard,
      '/admin/super-admin-dashboard': Crown,
      '/admin/users': UserCog,
      '/admin/payment-management': CreditCard,
      '/admin/channel-member-management': UserCheck,
      '/admin/channel-bundles': Package,
      '/admin/analytics': TrendingUp,
      '/admin/system-analytics': BarChart3,
      '/admin/withdrawals': Wallet,
      '/admin/super-admin-withdrawals': Settings,
      '/admin/admin-invoices': FileText,
      '/admin/documents': FileSignature,
      '/admin/kyc': Shield,
      '/admin/digio-errors': AlertTriangle,
      '/admin/kicked-users': UserX,
      '/admin/create-admin': UserPlus,
      '/admin/global-search': Search,
    };
    
    return iconMap[path] || Home;
  };

  const getPageTitle = (path) => {
    const titleMap = {
      '/admin/dashboard': 'Dashboard',
      '/admin/super-admin-dashboard': 'Super Admin Dashboard',
      '/admin/users': 'User Management',
      '/admin/payment-management': 'Payment Management',
      '/admin/channel-member-management': 'Channel Members',
      '/admin/channel-bundles': 'Channel Bundles',
      '/admin/analytics': 'Analytics',
      '/admin/system-analytics': 'System Analytics',
      '/admin/withdrawals': 'Withdrawals',
      '/admin/super-admin-withdrawals': 'Manage Withdrawals',
      '/admin/admin-invoices': 'Invoices',
      '/admin/documents': 'E-Signed Documents',
      '/admin/kyc': 'KYC Management',
      '/admin/digio-errors': 'Digio Errors',
      '/admin/kicked-users': 'Kicked Users',
      '/admin/create-admin': 'Admin Management',
      '/admin/global-search': 'Global Search',
    };
    
    return titleMap[path] || 'Page';
  };

  const buildBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Root breadcrumb
    breadcrumbs.push({
      path: '/admin/dashboard',
      label: 'Admin',
      icon: Home,
      clickable: true
    });

    // Build path progressively
    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      
      if (currentPath === '/admin') return; // Skip admin root
      
      breadcrumbs.push({
        path: currentPath,
        label: getPageTitle(currentPath),
        icon: getPageIcon(currentPath),
        clickable: index < pathParts.length - 1 // Last item is not clickable
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();
  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const CurrentIcon = currentPage?.icon || Home;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center space-x-1" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const Icon = crumb.icon;
              const isLast = index === breadcrumbs.length - 1;
              
              return (
                <div key={crumb.path} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="text-gray-400 mx-2" size={16} />
                  )}
                  
                  {crumb.clickable ? (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Icon size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        {crumb.label}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <Icon size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {crumb.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Admin Context Indicator */}
        <div className="flex items-center gap-3">
          
          {/* Current Admin Context */}
          {currentAdmin && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {currentAdmin.isSuper ? (
                <Crown className="text-yellow-500" size={16} />
              ) : (
                <Shield className="text-blue-500" size={16} />
              )}
              
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentAdmin.isSuper ? 'Super Admin View' : 'Admin View'}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentAdmin.email}
                </p>
              </div>
            </div>
          )}

          {/* Impersonation Warning */}
          {isImpersonating && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="text-orange-500" size={16} />
              <div className="text-right">
                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                  Impersonating Admin
                </p>
                <button
                  onClick={() => {
                    const originalToken = localStorage.getItem('originalToken');
                    if (originalToken) {
                      localStorage.setItem('token', originalToken);
                      localStorage.setItem('adminRole', 'superadmin');
                      localStorage.removeItem('originalToken');
                      localStorage.removeItem('impersonating');
                      navigate('/admin/super-admin-dashboard');
                    }
                  }}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 underline"
                >
                  Switch back to Super Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
