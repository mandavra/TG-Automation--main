import React, { useState, useEffect } from 'react';
import {
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  X,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Crown,
  Search,
  BarChart3,
  Package,
  UserCog,
  CreditCard,
  UserCheck,
  TrendingUp,
  Wallet,
  FileText,
  FileSignature,
  Shield,
  AlertTriangle,
  UserX,
  LayoutDashboard,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

const AdminPanelPreview = ({ config, adminInfo, onClose }) => {
  const [viewportSize, setViewportSize] = useState('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Icon mapping for menu items
  const getIconComponent = (iconName) => {
    const iconMap = {
      LayoutDashboard,
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
      UserPlus,
      Settings
    };
    return iconMap[iconName] || Settings;
  };

  const getViewportStyles = () => {
    const styles = {
      desktop: { width: '100%', height: '100%' },
      tablet: { width: '768px', height: '1024px' },
      mobile: { width: '375px', height: '667px' }
    };
    return styles[viewportSize];
  };

  const getMenuItems = () => {
    if (!config?.sidebarConfig?.menuItems) return [];
    
    return config.sidebarConfig.menuItems
      .filter(item => item.enabled && item.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const renderSidebar = () => {
    const menuItems = getMenuItems();
    const appearance = config?.sidebarConfig?.appearance || {};

    return (
      <div 
        className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-14' : 'w-48'
        } flex flex-col`}
        style={{ height: '100%' }}
      >
        {/* Collapse Toggle */}
        <div className={`flex p-2.5 ${sidebarCollapsed ? "justify-center" : "justify-end"}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1 px-2 flex-1">
          {menuItems.map((item, index) => {
            const Icon = getIconComponent(item.customIcon || item.icon);
            const isActive = index === 0; // Simulate first item as active

            return (
              <div key={item.id} className="relative">
                <div
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="relative">
                    <Icon size={18} className="shrink-0" />
                    {item.category === 'super_admin' && !sidebarCollapsed && (
                      <Crown size={8} className="absolute -top-1 -right-1 text-yellow-500" />
                    )}
                  </div>
                  
                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-sm">{item.customLabel || item.label}</span>
                      {item.category === 'super_admin' && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded">
                          SUPER
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isActive && !sidebarCollapsed && (
                  <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-full"></span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-2">
          <div className="flex items-center gap-2 text-red-600 px-2.5 py-2 hover:bg-red-100 rounded-lg cursor-pointer">
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    const widgets = config?.dashboardConfig?.widgets?.filter(w => w.enabled && w.visible) || [];

    return (
      <div className="flex-1 bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {config?.dashboardConfig?.layout?.welcomeMessage?.enabled 
                  ? config?.dashboardConfig?.layout?.welcomeMessage?.customText || `Welcome, ${adminInfo?.name || 'Admin'}`
                  : 'Dashboard'
                }
              </h1>
              <p className="text-sm text-gray-600">Preview of customized admin panel</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {config?.dashboardConfig?.layout?.headerVisible !== false && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Dashboard Overview</h2>
            </div>
          )}

          {/* Widgets Grid */}
          <div className={`grid gap-6 ${
            config?.dashboardConfig?.layout?.columns === 4 ? 'grid-cols-4' : 
            config?.dashboardConfig?.layout?.columns === 2 ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            {widgets.length > 0 ? widgets.map(widget => (
              <div
                key={widget.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
                  widget.size === 'large' ? 'col-span-2' : 
                  widget.size === 'full' ? 'col-span-full' :
                  'col-span-1'
                }`}
              >
                <h3 className="text-sm font-medium text-gray-900 mb-2">{widget.title}</h3>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {widget.type === 'stats' ? '1,234' : 'Widget Content'}
                </div>
                <p className="text-xs text-gray-500">
                  {widget.type === 'stats' ? '+12% from last month' : 'Preview data'}
                </p>
              </div>
            )) : (
              // Default preview widgets if none configured
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Total Users</h3>
                  <div className="text-2xl font-bold text-blue-600 mb-2">1,234</div>
                  <p className="text-xs text-gray-500">+12% from last month</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Revenue</h3>
                  <div className="text-2xl font-bold text-green-600 mb-2">₹5,67,890</div>
                  <p className="text-xs text-gray-500">+8% from last month</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Active Plans</h3>
                  <div className="text-2xl font-bold text-purple-600 mb-2">456</div>
                  <p className="text-xs text-gray-500">+5% from last month</p>
                </div>
              </>
            )}
          </div>

          {/* Sample Content */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">Recent Activity</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCog size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Sample activity {i}</p>
                        <p className="text-xs text-gray-500">{i} minutes ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 ${
      isFullscreen ? 'p-0' : ''
    }`}>
      <div 
        className={`bg-white rounded-lg shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-6xl max-h-[90vh] w-full'
        }`}
        style={!isFullscreen ? getViewportStyles() : {}}
      >
        {/* Preview Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye size={20} />
              <span className="font-medium">Admin Panel Preview</span>
            </div>
            {adminInfo && (
              <div className="text-sm opacity-75">
                {adminInfo.name} ({adminInfo.email})
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Viewport Size Selector */}
            <div className="flex items-center gap-1 bg-gray-800 rounded p-1">
              <button
                onClick={() => setViewportSize('desktop')}
                className={`p-1.5 rounded ${viewportSize === 'desktop' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="Desktop"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setViewportSize('tablet')}
                className={`p-1.5 rounded ${viewportSize === 'tablet' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="Tablet"
              >
                <Tablet size={16} />
              </button>
              <button
                onClick={() => setViewportSize('mobile')}
                className={`p-1.5 rounded ${viewportSize === 'mobile' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="Mobile"
              >
                <Smartphone size={16} />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-800 rounded"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Reset Preview */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 hover:bg-gray-800 rounded"
              title="Reset Preview"
            >
              <RotateCcw size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex flex-1 overflow-hidden">
          {renderSidebar()}
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPreview;