import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Shield } from 'lucide-react';

const PermissionGate = ({ 
  children, 
  permission, 
  pageId, 
  fallback = null,
  showAccessDenied = true 
}) => {
  const { hasPermission, loading } = usePermissions(pageId);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check permission
  if (!hasPermission(permission)) {
    // Show custom fallback if provided
    if (fallback !== null) {
      return fallback;
    }

    // Show access denied message if enabled
    if (showAccessDenied) {
      return (
        <div className="flex items-center gap-2 text-gray-500 bg-gray-50 rounded-lg p-4">
          <Shield size={16} />
          <span className="text-sm">Access denied: Missing {permission} permission</span>
        </div>
      );
    }

    // Return null (hide component)
    return null;
  }

  // Render children if permission is granted
  return children;
};

// Specific permission gates for common actions
export const ViewGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="view" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export const CreateGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="create" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export const EditGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="edit" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export const DeleteGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="delete" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export const ExportGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="export" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export const ManageGate = ({ children, pageId, ...props }) => (
  <PermissionGate permission="manage" pageId={pageId} {...props}>
    {children}
  </PermissionGate>
);

export default PermissionGate;