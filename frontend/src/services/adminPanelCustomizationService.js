import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api/admin-panel-customization';

class AdminPanelCustomizationService {
  constructor() {
    this.defaultConfig = null;
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get current admin's panel configuration
  async getMyPanelConfig() {
    try {
      const response = await axios.get(`${API_BASE_URL}/my-config`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching my panel config:', error);
      // Return default configuration if none exists
      return this.getDefaultConfig();
    }
  }

  // Get specific admin's panel configuration
  async getAdminPanelConfig(adminId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/${adminId}/config`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching admin panel config:', error);
      throw error;
    }
  }

  // Update admin panel configuration (Super admin only)
  async updateAdminPanelConfig(adminId, updateData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/${adminId}/config`, updateData, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating admin panel config:', error);
      throw error;
    }
  }

  // Validate current admin's access
  async validateAdminAccess() {
    try {
      const response = await axios.get(`${API_BASE_URL}/validate-access`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error validating admin access:', error);
      return { allowed: true }; // Default to allowed if validation fails
    }
  }

  // Get page permissions for current admin
  async getPagePermissions(pageId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/permissions/${pageId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting page permissions:', error);
      // Return default permissions if error
      return {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true
      };
    }
  }

  // Get menu items for current admin (filtered and sorted)
  async getMenuItems() {
    try {
      const config = await this.getMyPanelConfig();
      if (!config?.sidebarConfig?.menuItems) {
        return this.getDefaultMenuItems();
      }

      return config.sidebarConfig.menuItems
        .filter(item => item.enabled && item.visible)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('Error getting menu items:', error);
      return this.getDefaultMenuItems();
    }
  }

  // Get dashboard widgets for current admin
  async getDashboardWidgets() {
    try {
      const config = await this.getMyPanelConfig();
      if (!config?.dashboardConfig?.widgets) {
        return this.getDefaultDashboardWidgets();
      }

      return config.dashboardConfig.widgets
        .filter(widget => widget.enabled && widget.visible)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('Error getting dashboard widgets:', error);
      return this.getDefaultDashboardWidgets();
    }
  }

  // Check if admin has specific permission for a page
  async hasPagePermission(pageId, action) {
    try {
      const permissions = await this.getPagePermissions(pageId);
      return permissions[action] === true;
    } catch (error) {
      console.error('Error checking page permission:', error);
      return true; // Default to allowed
    }
  }

  // Get default configuration (fallback)
  getDefaultConfig() {
    if (!this.defaultConfig) {
      this.defaultConfig = {
        sidebarConfig: {
          menuItems: this.getDefaultMenuItems(),
          appearance: {
            theme: 'auto',
            collapsed: false,
            width: 'normal',
            showIcons: true,
            showLabels: true
          }
        },
        dashboardConfig: {
          widgets: this.getDefaultDashboardWidgets(),
          layout: {
            columns: 3,
            spacing: 'normal',
            headerVisible: true,
            welcomeMessage: {
              enabled: true
            }
          }
        },
        restrictions: {
          dataAccess: {
            ownDataOnly: false
          },
          features: {
            canExport: true,
            canImport: false,
            canBulkEdit: true,
            canDelete: true,
            canCreateAdmin: false
          }
        }
      };
    }
    return this.defaultConfig;
  }

  // Get default menu items
  getDefaultMenuItems() {
    return [
      {
        id: 'dashboard',
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        enabled: true,
        visible: true,
        order: 0,
        category: 'core',
        permissions: ['view']
      },
      {
        id: 'users',
        path: '/admin/users',
        label: 'User Management',
        icon: 'UserCog',
        enabled: true,
        visible: true,
        order: 1,
        category: 'management',
        permissions: ['view', 'create', 'edit', 'delete']
      },
      {
        id: 'payments',
        path: '/admin/payment-management',
        label: 'Payment Management',
        icon: 'CreditCard',
        enabled: true,
        visible: true,
        order: 2,
        category: 'management',
        permissions: ['view', 'export']
      },
      {
        id: 'channel-members',
        path: '/admin/channel-member-management',
        label: 'Channel Members',
        icon: 'UserCheck',
        enabled: true,
        visible: true,
        order: 3,
        category: 'management',
        permissions: ['view', 'manage']
      },
      {
        id: 'channel-bundles',
        path: '/admin/channel-bundles',
        label: 'Channel Bundles',
        icon: 'Package',
        enabled: true,
        visible: true,
        order: 4,
        category: 'management',
        permissions: ['view', 'create', 'edit', 'delete']
      },
      {
        id: 'analytics',
        path: '/admin/analytics',
        label: 'Analytics',
        icon: 'TrendingUp',
        enabled: true,
        visible: true,
        order: 5,
        category: 'analytics',
        permissions: ['view']
      },
      {
        id: 'withdrawals',
        path: '/admin/withdrawals',
        label: 'Withdrawals',
        icon: 'Wallet',
        enabled: true,
        visible: true,
        order: 6,
        category: 'management',
        permissions: ['view', 'manage']
      },
      {
        id: 'invoices',
        path: '/admin/admin-invoices',
        label: 'Invoices',
        icon: 'FileText',
        enabled: true,
        visible: true,
        order: 7,
        category: 'management',
        permissions: ['view', 'export']
      },
      {
        id: 'documents',
        path: '/admin/documents',
        label: 'E-Signed Documents',
        icon: 'FileSignature',
        enabled: true,
        visible: true,
        order: 8,
        category: 'management',
        permissions: ['view']
      },
      {
        id: 'kyc',
        path: '/admin/kyc',
        label: 'KYC Management',
        icon: 'Shield',
        enabled: true,
        visible: true,
        order: 9,
        category: 'management',
        permissions: ['view', 'manage']
      },
      {
        id: 'digio-errors',
        path: '/admin/digio-errors',
        label: 'Digio Errors',
        icon: 'AlertTriangle',
        enabled: true,
        visible: true,
        order: 10,
        category: 'settings',
        permissions: ['view']
      },
      {
        id: 'kicked-users',
        path: '/admin/kicked-users',
        label: 'Kicked Users',
        icon: 'UserX',
        enabled: true,
        visible: true,
        order: 11,
        category: 'management',
        permissions: ['view']
      }
    ];
  }

  // Get default dashboard widgets
  getDefaultDashboardWidgets() {
    return [
      {
        id: 'user-stats',
        type: 'stats',
        title: 'User Statistics',
        enabled: true,
        visible: true,
        order: 0,
        size: 'medium'
      },
      {
        id: 'payment-stats',
        type: 'stats',
        title: 'Payment Statistics',
        enabled: true,
        visible: true,
        order: 1,
        size: 'medium'
      },
      {
        id: 'recent-activities',
        type: 'table',
        title: 'Recent Activities',
        enabled: true,
        visible: true,
        order: 2,
        size: 'large'
      }
    ];
  }

  // Cache management
  clearCache() {
    this.defaultConfig = null;
  }
}

export default new AdminPanelCustomizationService();