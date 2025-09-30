import { useState, useEffect } from "react";
import adminPanelCustomizationService from "../services/adminPanelCustomizationService";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  UserX,
  UserPlus,
  UsersRound,
  Wallet,
  TrendingUp,
  FileText,
  Settings,
  Package,
  FileSignature,
  Shield,
  UserCog,
  CreditCard,
  UserCheck,
  Crown,
  Search,
  BarChart3,
  Eye,
  Globe
} from "lucide-react";
import axios from "axios";
// Remove: import { Tooltip } from "@mui/material";

const Sidebar = ({ onCollapse }) => {
  // Detect mobile on mount
  const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(() => getIsMobile()); // default collapsed on mobile
  const [hasDigioErrors, setHasDigioErrors] = useState(false);
  const [customMenuItems, setCustomMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const location = useLocation();

  // Ensure sidebar stays collapsed if user resizes to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadCustomMenuItems = async () => {
      try {
        const menuItems = await adminPanelCustomizationService.getMenuItems();
        console.log('Loaded custom menu items:', menuItems);
        setCustomMenuItems(menuItems);
      } catch (error) {
        console.error('Error loading custom menu items:', error);
        // Fall back to default navigation if custom menu fails
        setCustomMenuItems([]);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    const checkDigioErrors = async () => {
      try {
        console.log('Checking for Digio errors...');
        const response = await axios.get('http://localhost:4000/api/digio/errors');
        console.log('Digio errors response:', response.data);
        const hasUnresolvedErrors = response.data.some(error => error.status === 'unresolved');
        console.log('Has unresolved errors:', hasUnresolvedErrors);
        setHasDigioErrors(hasUnresolvedErrors);
      } catch (err) {
        console.error('Error checking Digio errors:', err);
        setHasDigioErrors(false);
      }
    };

    loadCustomMenuItems();
    checkDigioErrors();
    const interval = setInterval(checkDigioErrors, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const role = localStorage.getItem('adminRole');

  // Icon mapping for dynamic menu items
  const getIconComponent = (iconName) => {
    const iconMap = {
      UserCog,
      CreditCard,
      UserCheck,
      Package,
      TrendingUp,
      Wallet,
      FileText,
      FileSignature,
      Shield,
      AlertTriangle,
      UserX,
      Crown,
      Search,
      BarChart3,
      Eye,
      Globe,
      Users,
      UsersRound,
      UserPlus,
      Settings,
      LayoutDashboard: BarChart3 // Map LayoutDashboard to BarChart3
    };
    return iconMap[iconName] || Settings;
  };

  // Combine custom menu items with hardcoded super admin items
  const getDynamicNavItems = () => {
    if (isLoadingMenu) {
      return [];
    }

    // If we have custom menu items, use them
    if (customMenuItems.length > 0) {
      const navItems = customMenuItems.map(item => ({
        path: item.path,
        label: item.customLabel || item.label,
        icon: getIconComponent(item.customIcon || item.icon),
        category: item.category,
        permissions: item.permissions,
        superOnly: item.category === 'super_admin',
        enhanced: item.category === 'enhanced'
      }));

      // Add dashboard and super admin specific items
      let mergedItems = navItems;
      
      // Always add dashboard first
      const dashboardItem = { path: "/admin/dashboard", label: "Dashboard", icon: BarChart3 };
      
      if (role === 'superadmin') {
        const superAdminItems = [
          // dashboardItem,
          { path: "/admin/super-admin-dashboard", label: "Super Dashboard", icon: Crown, superOnly: true },
          { path: "/admin/global-search", label: "Global Search", icon: Search, superOnly: true },
          { path: "/admin/create-admin", label: "Admin Management", icon: UserPlus, superOnly: true },
          { path: "/admin/system-analytics", label: "System Analytics", icon: BarChart3, enhanced: true },
          { path: "/admin/super-admin-withdrawals", label: "All Withdrawals", icon: Wallet, enhanced: true }
        ];
        // Prefer custom items over defaults by appending defaults first
        mergedItems = [...superAdminItems, ...navItems];
      } else {
        // For regular admin, add dashboard first
        mergedItems = [dashboardItem, ...navItems];
      }

      // De-duplicate by path
      const seenPaths = new Set();
      const uniqueItems = [];
      for (const item of mergedItems) {
        if (seenPaths.has(item.path)) continue;
        seenPaths.add(item.path);
        uniqueItems.push(item);
      }
      return uniqueItems;
    }

    // Fall back to original static navigation
    const staticItems = getStaticNavItems();
    console.log('Using static navigation items:', staticItems.map(item => item.path));
    return staticItems;
  };

  const getStaticNavItems = () => {
    if (role === 'superadmin') {
      // Super admin gets enhanced navigation with merged tabs
      return [
        // Dashboard
        // { path: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
        
        // Super Admin Core Features
        { path: "/admin/super-admin-dashboard", label: "Super Dashboard", icon: Crown, superOnly: true },
        { path: "/admin/global-search", label: "Global Search", icon: Search, superOnly: true },
        { path: "/admin/create-admin", label: "Admin Management", icon: UserPlus, superOnly: true },
        
        // Enhanced Analytics (merged system + regular analytics)
        { path: "/admin/system-analytics", label: "System Analytics", icon: BarChart3, enhanced: true },
        
        // Enhanced Withdrawals (merged super admin + regular withdrawals)
        { path: "/admin/super-admin-withdrawals", label: "All Withdrawals", icon: Wallet, enhanced: true },
        
        // Regular Admin Features (available to super admin too)
        { path: "/admin/users", label: "User Management", icon: UserCog },
        { path: "/admin/payment-management", label: "Payment Management", icon: CreditCard },
        { path: "/admin/channel-member-management", label: "Channel Members", icon: UserCheck },
        { path: "/admin/channel-bundles", label: "Channel Bundles", icon: Package },
        { path: "/admin/admin-invoices", label: "Invoices", icon: FileText },
        { path: "/admin/documents", label: "E-Signed Documents", icon: FileSignature },
        { path: "/admin/kyc", label: "KYC Management", icon: Shield },
        { path: "/admin/digio-errors", label: "Digio Errors", icon: AlertTriangle },
        { path: "/admin/kicked-users", label: "Kicked Users", icon: UserX },
      ];
    } else {
      // Regular admin navigation
      return [
        { path: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
        { path: "/admin/users", label: "User Management", icon: UserCog },
        { path: "/admin/payment-management", label: "Payment Management", icon: CreditCard },
        { path: "/admin/channel-member-management", label: "Channel Members", icon: UserCheck },
        { path: "/admin/channel-bundles", label: "Channel Bundles", icon: Package },
        { path: "/admin/analytics", label: "Analytics", icon: TrendingUp },
        { path: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
        { path: "/admin/admin-invoices", label: "Invoices", icon: FileText },
        { path: "/admin/documents", label: "E-Signed Documents", icon: FileSignature },
        { path: "/admin/kyc", label: "KYC Management", icon: Shield },
        { path: "/admin/digio-errors", label: "Digio Errors", icon: AlertTriangle },
        { path: "/admin/kicked-users", label: "Kicked Users", icon: UserX },
      ];
    }
  };

  const navItems = getDynamicNavItems();
  
  // Debug logging
  console.log('Sidebar Debug:', {
    role,
    customMenuItems: customMenuItems.length,
    isLoadingMenu,
    navItems: navItems.length,
    navItemsPaths: navItems.map(item => item.path)
  });

  const handleCollapse = () => setCollapsed((prev) => !prev);

  // Inform parent about current collapsed state
  useEffect(() => {
    if (typeof onCollapse === 'function') {
      onCollapse(collapsed);
    }
  }, [collapsed, onCollapse]);

  const logout = () => {
    // Clear admin session data
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("adminRole");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("originalToken");
    localStorage.removeItem("originalRole");
    localStorage.removeItem("impersonating");
    
    // Clear any user session data that might interfere
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("phone");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("otp");
    
    window.location.href = "/loginAdmin";
  };

  return (
    <div
      className={
        `bg-white dark:bg-gray-900 text-gray-900 dark:text-white h-[calc(100vh-3rem)] transition-all duration-300 shadow-xl rounded-r-2xl border-r border-gray-200 dark:border-gray-800 flex flex-col
        ${collapsed ? "w-11" : "w-48"} fixed top-[65px] md:top-17 left-0 z-[50]`
      }
      style={{ position: 'fixed', height: 'calc(100vh - 3rem)', overflowY: 'auto' }}
    >
      {/* Collapse/Expand Arrow Button */}
      <div className={`flex p-1 ${collapsed ? "justify-center" : "justify-end"}`}>
        <button
          onClick={handleCollapse}
          className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors border border-gray-200 dark:border-gray-700 shadow"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ width: 28, height: 28 }}
        >
          {collapsed ? <ChevronRight className="justify-center" size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className={`flex-1 flex flex-col items-center mt-1 pt-1 space-y-0.5 overflow-y-auto ${collapsed ? "hide-scrollbar" : ""} ${collapsed ? "" : "items-start pl-1 pr-1"}`}>
        {isLoadingMenu ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path === "/admin/channel-bundles" && (
                location.pathname === "/admin/Group" ||
                location.pathname === "/admin/groups" ||
                location.pathname.startsWith("/admin/channel-bundle")
              ));
            const showSeparator = role === 'superadmin' && (
              (index === 3) || (index === 5)
            );
            return (
              <div key={item.path} className={`w-full flex flex-col items-center ${collapsed ? "" : "items-start"}`}>
                {showSeparator && (
                  <div className={`my-1 ${collapsed ? "w-6 mx-auto" : "w-full"}`}>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 opacity-70 rounded"></div>
                  </div>
                )}
                <div className="sidebar-tooltip-group w-full flex flex-col items-center">
                  <Link
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? "justify-center w-8 h-8 mx-auto" : "gap-2 px-2 py-1 w-full"} rounded-lg transition-all duration-200 group relative
                      ${isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow ring-2 ring-blue-100 dark:ring-blue-900"
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 dark:text-gray-500"}
                    `}
                    style={{ marginBottom: 6, minHeight: collapsed ? 32 : 32 }}
                  >
                    <Icon size={18} />
                    {!collapsed && (
                      <span className={`text-[12px] font-medium ml-1 ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"}`}>{item.label}</span>
                    )}
                    {isActive && (
                      <span className={`absolute left-0 ${collapsed ? "top-1 h-5" : "top-1 h-4"} w-1 bg-blue-500 rounded-r-full`}></span>
                    )}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </nav>
      {/* Sticky Logout Button slightly above bottom */}
      <div className={`w-full flex flex-col items-center ${collapsed ? "" : "items-start pl-1 pr-1"}`} style={{ paddingBottom: 20, paddingTop: 0, marginBottom: 20 }}>
        <div className="sidebar-tooltip-group w-full flex flex-col items-center">
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center ${collapsed ? "justify-center w-8 h-8 mx-auto" : "gap-2 px-2 py-1 w-full"} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg font-semibold border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all text-[12px] shadow group relative`}
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-[12px] ml-1">Logout</span>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;