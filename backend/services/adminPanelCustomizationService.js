const AdminPanelCustomization = require('../models/adminPanelCustomization.model');
const Admin = require('../models/admin.model');

class AdminPanelCustomizationService {
  // Get admin panel configuration
  async getAdminPanelConfig(adminId) {
    try {
      let config = await AdminPanelCustomization.findOne({ adminId }).populate('admin');
      
      if (!config) {
        // Create default configuration for new admin
        config = await this.createDefaultConfig(adminId);
      }
      
      return config;
    } catch (error) {
      throw new Error(`Failed to get admin panel config: ${error.message}`);
    }
  }
  
  // Create default configuration for admin
  async createDefaultConfig(adminId, createdBy = null) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }
      
      const defaultConfig = AdminPanelCustomization.getDefaultConfig();
      
      // Adjust default config based on admin role
      if (admin.role === 'superadmin') {
        // Add super admin specific menu items
        defaultConfig.sidebarConfig.menuItems.unshift(
          {
            id: 'super-dashboard',
            path: '/admin/super-admin-dashboard',
            label: 'Super Dashboard',
            icon: 'Crown',
            enabled: true,
            visible: true,
            order: -1,
            category: 'super_admin',
            permissions: ['view']
          },
          {
            id: 'global-search',
            path: '/admin/global-search',
            label: 'Global Search',
            icon: 'Search',
            enabled: true,
            visible: true,
            order: -1,
            category: 'super_admin',
            permissions: ['view']
          },
          {
            id: 'admin-management',
            path: '/admin/create-admin',
            label: 'Admin Management',
            icon: 'UserPlus',
            enabled: true,
            visible: true,
            order: -1,
            category: 'super_admin',
            permissions: ['view', 'create', 'edit', 'delete']
          }
        );
        
        // Enable advanced features for super admin
        defaultConfig.restrictions.features.canCreateAdmin = true;
        defaultConfig.restrictions.features.canImport = true;
      }
      
      const newConfig = new AdminPanelCustomization({
        adminId,
        ...defaultConfig,
        metadata: {
          createdBy: createdBy || adminId,
          isActive: true,
          version: 1
        }
      });
      
      await newConfig.save();
      return newConfig;
    } catch (error) {
      throw new Error(`Failed to create default config: ${error.message}`);
    }
  }
  
  // Update admin panel configuration
  async updateAdminPanelConfig(adminId, updateData, updatedBy) {
    try {
      const config = await AdminPanelCustomization.findOne({ adminId });
      
      if (!config) {
        throw new Error('Admin panel configuration not found');
      }
      
      // Update configuration
      Object.keys(updateData).forEach(key => {
        if (key !== 'metadata') {
          config[key] = updateData[key];
        }
      });
      
      // Update metadata
      config.metadata.lastModifiedBy = updatedBy;
      config.metadata.version += 1;
      
      await config.save();
      return config;
    } catch (error) {
      throw new Error(`Failed to update admin panel config: ${error.message}`);
    }
  }
  
  // Clone configuration from template or another admin
  async cloneConfiguration(sourceAdminId, targetAdminId, clonedBy) {
    try {
      const sourceConfig = await AdminPanelCustomization.findOne({ adminId: sourceAdminId });
      
      if (!sourceConfig) {
        throw new Error('Source configuration not found');
      }
      
      // Remove existing config if any
      await AdminPanelCustomization.deleteOne({ adminId: targetAdminId });
      
      // Create new config based on source
      const configData = sourceConfig.toObject();
      delete configData._id;
      delete configData.adminId;
      delete configData.createdAt;
      delete configData.updatedAt;
      
      const newConfig = new AdminPanelCustomization({
        ...configData,
        adminId: targetAdminId,
        metadata: {
          createdBy: clonedBy,
          isActive: true,
          version: 1
        }
      });
      
      await newConfig.save();
      return newConfig;
    } catch (error) {
      throw new Error(`Failed to clone configuration: ${error.message}`);
    }
  }
  
  // Create configuration template
  async createTemplate(adminId, templateName, createdBy) {
    try {
      const sourceConfig = await AdminPanelCustomization.findOne({ adminId });
      
      if (!sourceConfig) {
        throw new Error('Source configuration not found');
      }
      
      const templateData = sourceConfig.toObject();
      delete templateData._id;
      delete templateData.adminId;
      delete templateData.createdAt;
      delete templateData.updatedAt;
      
      const template = new AdminPanelCustomization({
        ...templateData,
        adminId: null, // Templates don't have specific admin
        metadata: {
          createdBy,
          isActive: true,
          isTemplate: true,
          templateName,
          version: 1
        }
      });
      
      await template.save();
      return template;
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }
  
  // Apply template to admin
  async applyTemplate(templateId, adminId, appliedBy) {
    try {
      const template = await AdminPanelCustomization.findById(templateId);
      
      if (!template || !template.metadata.isTemplate) {
        throw new Error('Template not found');
      }
      
      // Remove existing config
      await AdminPanelCustomization.deleteOne({ adminId });
      
      // Apply template
      const configData = template.toObject();
      delete configData._id;
      delete configData.createdAt;
      delete configData.updatedAt;
      
      const newConfig = new AdminPanelCustomization({
        ...configData,
        adminId,
        metadata: {
          createdBy: appliedBy,
          isActive: true,
          isTemplate: false,
          templateName: undefined,
          version: 1
        }
      });
      
      await newConfig.save();
      return newConfig;
    } catch (error) {
      throw new Error(`Failed to apply template: ${error.message}`);
    }
  }
  
  // Get all templates
  async getTemplates() {
    try {
      return await AdminPanelCustomization.find({
        'metadata.isTemplate': true,
        'metadata.isActive': true
      }).select('metadata.templateName sidebarConfig.menuItems dashboardConfig.widgets')
        .sort({ 'metadata.templateName': 1 });
    } catch (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }
  
  // Get all admin configurations (super admin only)
  async getAllAdminConfigs(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const configs = await AdminPanelCustomization.find({
        'metadata.isTemplate': false,
        'metadata.isActive': true
      })
      .populate('admin', 'firstName lastName email role')
      .populate('metadata.createdBy', 'firstName lastName email')
      .populate('metadata.lastModifiedBy', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
      
      const total = await AdminPanelCustomization.countDocuments({
        'metadata.isTemplate': false,
        'metadata.isActive': true
      });
      
      return {
        configs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get admin configurations: ${error.message}`);
    }
  }
  
  // Bulk update configurations
  async bulkUpdateConfigs(adminIds, updateData, updatedBy) {
    try {
      const results = {
        success: [],
        failed: []
      };
      
      for (const adminId of adminIds) {
        try {
          await this.updateAdminPanelConfig(adminId, updateData, updatedBy);
          results.success.push(adminId);
        } catch (error) {
          results.failed.push({ adminId, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to perform bulk update: ${error.message}`);
    }
  }
  
  // Validate admin access
  async validateAdminAccess(adminId) {
    try {
      const config = await AdminPanelCustomization.findOne({ adminId });
      
      if (!config) {
        return { allowed: true, reason: 'No restrictions configured' };
      }
      
      const isAllowed = config.isAccessAllowed();
      
      if (!isAllowed) {
        const restrictions = config.restrictions.timeRestrictions;
        let reason = 'Access denied due to time restrictions';
        
        if (restrictions.allowedHours) {
          reason += `. Allowed hours: ${restrictions.allowedHours.start} - ${restrictions.allowedHours.end}`;
        }
        
        if (restrictions.allowedDays && restrictions.allowedDays.length > 0) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const allowedDayNames = restrictions.allowedDays.map(day => dayNames[day]);
          reason += `. Allowed days: ${allowedDayNames.join(', ')}`;
        }
        
        return { allowed: false, reason };
      }
      
      return { allowed: true };
    } catch (error) {
      throw new Error(`Failed to validate admin access: ${error.message}`);
    }
  }
  
  // Get admin permissions for specific page
  async getPagePermissions(adminId, pageId) {
    try {
      const config = await AdminPanelCustomization.findOne({ adminId });
      
      if (!config) {
        // Default permissions if no config
        return {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true
        };
      }
      
      const pageConfig = config.pageConfigs.find(page => page.pageId === pageId);
      
      if (!pageConfig) {
        // Default permissions if page not configured
        return {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true
        };
      }
      
      const permissions = {};
      pageConfig.permissions.forEach(perm => {
        permissions[perm.action] = perm.enabled;
      });
      
      return permissions;
    } catch (error) {
      throw new Error(`Failed to get page permissions: ${error.message}`);
    }
  }
  
  // Reset configuration to default
  async resetToDefault(adminId, resetBy) {
    try {
      // Remove existing config
      await AdminPanelCustomization.deleteOne({ adminId });
      
      // Create new default config
      return await this.createDefaultConfig(adminId, resetBy);
    } catch (error) {
      throw new Error(`Failed to reset configuration: ${error.message}`);
    }
  }
  
  // Export configuration
  async exportConfiguration(adminId) {
    try {
      const config = await AdminPanelCustomization.findOne({ adminId })
        .populate('admin', 'firstName lastName email role');
      
      if (!config) {
        throw new Error('Configuration not found');
      }
      
      const exportData = config.toObject();
      delete exportData._id;
      delete exportData.__v;
      delete exportData.createdAt;
      delete exportData.updatedAt;
      
      return {
        exportedAt: new Date(),
        adminInfo: {
          name: `${config.admin.firstName} ${config.admin.lastName}`,
          email: config.admin.email,
          role: config.admin.role
        },
        configuration: exportData
      };
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error.message}`);
    }
  }
  
  // Import configuration
  async importConfiguration(adminId, importData, importedBy) {
    try {
      if (!importData.configuration) {
        throw new Error('Invalid import data format');
      }
      
      const configData = importData.configuration;
      configData.adminId = adminId;
      configData.metadata = {
        createdBy: importedBy,
        isActive: true,
        version: 1
      };
      
      // Remove existing config
      await AdminPanelCustomization.deleteOne({ adminId });
      
      // Create new config from import
      const newConfig = new AdminPanelCustomization(configData);
      await newConfig.save();
      
      return newConfig;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }
}

module.exports = new AdminPanelCustomizationService();