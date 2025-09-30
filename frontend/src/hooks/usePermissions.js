import { useState, useEffect, useCallback } from 'react';
import adminPanelCustomizationService from '../services/adminPanelCustomizationService';

// Hook for checking permissions
export const usePermissions = (pageId = null) => {
  const [permissions, setPermissions] = useState({
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    manage: true
  });
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);
    try {
      const pagePermissions = await adminPanelCustomizationService.getPagePermissions(pageId);
      setPermissions(pagePermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Keep default permissions on error
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((action) => {
    return permissions[action] === true;
  }, [permissions]);

  const canView = permissions.view;
  const canCreate = permissions.create;
  const canEdit = permissions.edit;
  const canDelete = permissions.delete;
  const canExport = permissions.export;
  const canManage = permissions.manage;

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canManage,
    refetch: loadPermissions
  };
};

// Hook for checking access restrictions
export const useAccessControl = () => {
  const [accessControl, setAccessControl] = useState({
    allowed: true,
    reason: null
  });
  const [loading, setLoading] = useState(false);

  const checkAccess = useCallback(async () => {
    setLoading(true);
    try {
      const validation = await adminPanelCustomizationService.validateAdminAccess();
      setAccessControl(validation);
    } catch (error) {
      console.error('Error checking access:', error);
      setAccessControl({ allowed: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    ...accessControl,
    loading,
    refetch: checkAccess
  };
};

// Hook for getting admin panel configuration
export const useAdminPanelConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const adminConfig = await adminPanelCustomizationService.getMyPanelConfig();
      setConfig(adminConfig);
    } catch (error) {
      console.error('Error loading admin panel config:', error);
      setConfig(adminPanelCustomizationService.getDefaultConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    refetch: loadConfig
  };
};

// Hook for getting menu items
export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const items = await adminPanelCustomizationService.getMenuItems();
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  return {
    menuItems,
    loading,
    refetch: loadMenuItems
  };
};

// Hook for getting dashboard widgets
export const useDashboardWidgets = () => {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const dashboardWidgets = await adminPanelCustomizationService.getDashboardWidgets();
      setWidgets(dashboardWidgets);
    } catch (error) {
      console.error('Error loading dashboard widgets:', error);
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  return {
    widgets,
    loading,
    refetch: loadWidgets
  };
};

export default usePermissions;