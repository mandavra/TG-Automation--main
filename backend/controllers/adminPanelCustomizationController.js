const adminPanelCustomizationService = require('../services/adminPanelCustomizationService');

class AdminPanelCustomizationController {
  // Get admin panel configuration
  async getAdminPanelConfig(req, res) {
    try {
      const { adminId } = req.params;
      
      // Super admin can view any config, regular admin only their own
      if (req.admin.role !== 'superadmin' && req.admin._id.toString() !== adminId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - insufficient permissions' 
        });
      }

      const config = await adminPanelCustomizationService.getAdminPanelConfig(adminId);
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting admin panel config:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get admin panel configuration'
      });
    }
  }

  // Get current admin's own configuration
  async getMyPanelConfig(req, res) {
    try {
      const adminId = req.admin._id;
      const config = await adminPanelCustomizationService.getAdminPanelConfig(adminId);
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting own panel config:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get panel configuration'
      });
    }
  }

  // Update admin panel configuration (Super admin only)
  async updateAdminPanelConfig(req, res) {
    try {
      const { adminId } = req.params;
      const updateData = req.body;
      const updatedBy = req.admin._id;

      // Only super admin can update configurations
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can modify panel configurations' 
        });
      }

      const config = await adminPanelCustomizationService.updateAdminPanelConfig(
        adminId, 
        updateData, 
        updatedBy
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Admin panel configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating admin panel config:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to update admin panel configuration'
      });
    }
  }

  // Create default configuration for admin
  async createDefaultConfig(req, res) {
    try {
      const { adminId } = req.params;
      const createdBy = req.admin._id;

      // Only super admin can create configs for other admins
      if (req.admin.role !== 'superadmin' && req.admin._id.toString() !== adminId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - insufficient permissions' 
        });
      }

      const config = await adminPanelCustomizationService.createDefaultConfig(adminId, createdBy);
      
      res.json({
        success: true,
        data: config,
        message: 'Default configuration created successfully'
      });
    } catch (error) {
      console.error('Error creating default config:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to create default configuration'
      });
    }
  }

  // Clone configuration from another admin (Super admin only)
  async cloneConfiguration(req, res) {
    try {
      const { sourceAdminId, targetAdminId } = req.body;
      const clonedBy = req.admin._id;

      // Only super admin can clone configurations
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can clone configurations' 
        });
      }

      const config = await adminPanelCustomizationService.cloneConfiguration(
        sourceAdminId, 
        targetAdminId, 
        clonedBy
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuration cloned successfully'
      });
    } catch (error) {
      console.error('Error cloning configuration:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to clone configuration'
      });
    }
  }

  // Get all admin configurations (Super admin only)
  async getAllAdminConfigs(req, res) {
    try {
      // Only super admin can view all configurations
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can view all configurations' 
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await adminPanelCustomizationService.getAllAdminConfigs(page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting all admin configs:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get admin configurations'
      });
    }
  }

  // Bulk update configurations (Super admin only)
  async bulkUpdateConfigs(req, res) {
    try {
      const { adminIds, updateData } = req.body;
      const updatedBy = req.admin._id;

      // Only super admin can perform bulk updates
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can perform bulk updates' 
        });
      }

      const results = await adminPanelCustomizationService.bulkUpdateConfigs(
        adminIds, 
        updateData, 
        updatedBy
      );
      
      res.json({
        success: true,
        data: results,
        message: `Bulk update completed - ${results.success.length} successful, ${results.failed.length} failed`
      });
    } catch (error) {
      console.error('Error performing bulk update:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to perform bulk update'
      });
    }
  }

  // Validate admin access
  async validateAdminAccess(req, res) {
    try {
      const adminId = req.admin._id;
      const validation = await adminPanelCustomizationService.validateAdminAccess(adminId);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating admin access:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to validate admin access'
      });
    }
  }

  // Get page permissions for current admin
  async getPagePermissions(req, res) {
    try {
      const { pageId } = req.params;
      const adminId = req.admin._id;

      const permissions = await adminPanelCustomizationService.getPagePermissions(adminId, pageId);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error getting page permissions:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get page permissions'
      });
    }
  }

  // Reset configuration to default (Super admin only)
  async resetToDefault(req, res) {
    try {
      const { adminId } = req.params;
      const resetBy = req.admin._id;

      // Only super admin can reset configurations
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can reset configurations' 
        });
      }

      const config = await adminPanelCustomizationService.resetToDefault(adminId, resetBy);
      
      res.json({
        success: true,
        data: config,
        message: 'Configuration reset to default successfully'
      });
    } catch (error) {
      console.error('Error resetting to default:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to reset configuration'
      });
    }
  }

  // Template management methods
  async createTemplate(req, res) {
    try {
      const { adminId, templateName } = req.body;
      const createdBy = req.admin._id;

      // Only super admin can create templates
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can create templates' 
        });
      }

      const template = await adminPanelCustomizationService.createTemplate(
        adminId, 
        templateName, 
        createdBy
      );
      
      res.json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to create template'
      });
    }
  }

  async getTemplates(req, res) {
    try {
      // Only super admin can view templates
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can view templates' 
        });
      }

      const templates = await adminPanelCustomizationService.getTemplates();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get templates'
      });
    }
  }

  async applyTemplate(req, res) {
    try {
      const { templateId, adminId } = req.body;
      const appliedBy = req.admin._id;

      // Only super admin can apply templates
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can apply templates' 
        });
      }

      const config = await adminPanelCustomizationService.applyTemplate(
        templateId, 
        adminId, 
        appliedBy
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Template applied successfully'
      });
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to apply template'
      });
    }
  }

  // Export/Import functionality
  async exportConfiguration(req, res) {
    try {
      const { adminId } = req.params;

      // Super admin can export any config, regular admin only their own
      if (req.admin.role !== 'superadmin' && req.admin._id.toString() !== adminId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - insufficient permissions' 
        });
      }

      const exportData = await adminPanelCustomizationService.exportConfiguration(adminId);
      
      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      console.error('Error exporting configuration:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to export configuration'
      });
    }
  }

  async importConfiguration(req, res) {
    try {
      const { adminId } = req.params;
      const importData = req.body;
      const importedBy = req.admin._id;

      // Only super admin can import configurations
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - only super admin can import configurations' 
        });
      }

      const config = await adminPanelCustomizationService.importConfiguration(
        adminId, 
        importData, 
        importedBy
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuration imported successfully'
      });
    } catch (error) {
      console.error('Error importing configuration:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to import configuration'
      });
    }
  }
}

module.exports = new AdminPanelCustomizationController();