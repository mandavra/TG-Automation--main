const mongoose = require('mongoose');

// Admin Panel Customization Schema
const adminPanelCustomizationSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true
  },
  
  // Sidebar Configuration
  sidebarConfig: {
    // Menu items configuration
    menuItems: [{
      id: {
        type: String,
        required: true
      },
      path: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      icon: {
        type: String,
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      },
      visible: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      },
      category: {
        type: String,
        enum: ['core', 'management', 'analytics', 'settings', 'super_admin'],
        default: 'management'
      },
      permissions: [{
        type: String,
        enum: ['view', 'create', 'edit', 'delete', 'export', 'manage']
      }],
      customLabel: String,
      customIcon: String,
      badge: {
        enabled: Boolean,
        color: String,
        text: String
      }
    }],
    
    // Sidebar appearance
    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      collapsed: {
        type: Boolean,
        default: false
      },
      width: {
        type: String,
        enum: ['narrow', 'normal', 'wide'],
        default: 'normal'
      },
      showIcons: {
        type: Boolean,
        default: true
      },
      showLabels: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Dashboard Configuration
  dashboardConfig: {
    // Widget configuration
    widgets: [{
      id: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['stats', 'chart', 'table', 'custom'],
        required: true
      },
      title: String,
      enabled: {
        type: Boolean,
        default: true
      },
      visible: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      },
      size: {
        type: String,
        enum: ['small', 'medium', 'large', 'full'],
        default: 'medium'
      },
      position: {
        row: Number,
        column: Number
      },
      dataSource: String,
      refreshInterval: Number,
      permissions: [String]
    }],
    
    // Layout configuration
    layout: {
      columns: {
        type: Number,
        default: 3,
        min: 1,
        max: 4
      },
      spacing: {
        type: String,
        enum: ['tight', 'normal', 'loose'],
        default: 'normal'
      },
      headerVisible: {
        type: Boolean,
        default: true
      },
      welcomeMessage: {
        enabled: Boolean,
        customText: String
      }
    }
  },
  
  // Page-specific configurations
  pageConfigs: [{
    pageId: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    permissions: [{
      action: {
        type: String,
        enum: ['view', 'create', 'edit', 'delete', 'export', 'import', 'manage'],
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }],
    
    // UI customizations
    ui: {
      showHeader: {
        type: Boolean,
        default: true
      },
      showFilters: {
        type: Boolean,
        default: true
      },
      showSearch: {
        type: Boolean,
        default: true
      },
      showExport: {
        type: Boolean,
        default: true
      },
      showBulkActions: {
        type: Boolean,
        default: true
      },
      customTitle: String,
      customDescription: String,
      hideColumns: [String],
      defaultSorting: {
        column: String,
        direction: {
          type: String,
          enum: ['asc', 'desc'],
          default: 'asc'
        }
      }
    }
  }],
  
  // Access restrictions
  restrictions: {
    // Data access limitations
    dataAccess: {
      // Limit to own data only
      ownDataOnly: {
        type: Boolean,
        default: false
      },
      // Date range restrictions
      dateRange: {
        enabled: Boolean,
        maxDays: Number,
        startDate: Date,
        endDate: Date
      },
      // Record limits
      recordLimits: {
        maxRecords: Number,
        maxExport: Number
      }
    },
    
    // Feature restrictions
    features: {
      canExport: {
        type: Boolean,
        default: true
      },
      canImport: {
        type: Boolean,
        default: false
      },
      canBulkEdit: {
        type: Boolean,
        default: true
      },
      canDelete: {
        type: Boolean,
        default: true
      },
      canCreateAdmin: {
        type: Boolean,
        default: false
      }
    },
    
    // Time-based restrictions
    timeRestrictions: {
      enabled: Boolean,
      allowedHours: {
        start: String, // "09:00"
        end: String    // "18:00"
      },
      allowedDays: [{
        type: Number,
        min: 0, // Sunday
        max: 6  // Saturday
      }],
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      }
    }
  },
  
  // Branding customization
  branding: {
    // Logo customization
    logo: {
      enabled: Boolean,
      url: String,
      width: Number,
      height: Number
    },
    
    // Color scheme
    colors: {
      primary: String,
      secondary: String,
      accent: String,
      background: String,
      text: String
    },
    
    // Custom CSS
    customCSS: String,
    
    // Footer customization
    footer: {
      enabled: Boolean,
      text: String,
      links: [{
        label: String,
        url: String
      }]
    }
  },
  
  // Notification preferences
  notifications: {
    // Email notifications
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['instant', 'hourly', 'daily', 'weekly'],
        default: 'instant'
      },
      types: [{
        type: String,
        enum: ['payments', 'users', 'system', 'errors'],
        enabled: Boolean
      }]
    },
    
    // In-app notifications
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: true
      },
      desktop: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Metadata
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isTemplate: {
      type: Boolean,
      default: false
    },
    templateName: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (adminId index is automatically created by unique: true)
adminPanelCustomizationSchema.index({ 'metadata.isActive': 1 });
adminPanelCustomizationSchema.index({ 'metadata.isTemplate': 1 });

// Virtual for admin details
adminPanelCustomizationSchema.virtual('admin', {
  ref: 'Admin',
  localField: 'adminId',
  foreignField: '_id',
  justOne: true
});

// Methods
adminPanelCustomizationSchema.methods.getMenuItems = function() {
  return this.sidebarConfig.menuItems.filter(item => item.enabled && item.visible)
    .sort((a, b) => a.order - b.order);
};

adminPanelCustomizationSchema.methods.getDashboardWidgets = function() {
  return this.dashboardConfig.widgets.filter(widget => widget.enabled && widget.visible)
    .sort((a, b) => a.order - b.order);
};

adminPanelCustomizationSchema.methods.hasPermission = function(pageId, action) {
  const pageConfig = this.pageConfigs.find(page => page.pageId === pageId);
  if (!pageConfig || !pageConfig.enabled) return false;
  
  const permission = pageConfig.permissions.find(perm => perm.action === action);
  return permission ? permission.enabled : false;
};

adminPanelCustomizationSchema.methods.isAccessAllowed = function() {
  const restrictions = this.restrictions.timeRestrictions;
  if (!restrictions.enabled) return true;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  // Check time restrictions
  if (restrictions.allowedHours) {
    const startHour = parseInt(restrictions.allowedHours.start.split(':')[0]);
    const endHour = parseInt(restrictions.allowedHours.end.split(':')[0]);
    
    if (currentHour < startHour || currentHour > endHour) {
      return false;
    }
  }
  
  // Check day restrictions
  if (restrictions.allowedDays && restrictions.allowedDays.length > 0) {
    if (!restrictions.allowedDays.includes(currentDay)) {
      return false;
    }
  }
  
  return true;
};

// Static methods
adminPanelCustomizationSchema.statics.getDefaultConfig = function() {
  return {
    sidebarConfig: {
      menuItems: [
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
      ],
      appearance: {
        theme: 'auto',
        collapsed: false,
        width: 'normal',
        showIcons: true,
        showLabels: true
      }
    },
    dashboardConfig: {
      widgets: [
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
      ],
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
};

const AdminPanelCustomization = mongoose.model('AdminPanelCustomization', adminPanelCustomizationSchema);

module.exports = AdminPanelCustomization;