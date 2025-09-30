import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import adminPanelCustomizationService from '../services/adminPanelCustomizationService';

const ProtectedRoute = ({ children, requiredPermission = 'view', pageId = null }) => {
  const [hasPermission, setHasPermission] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [accessValidation, setAccessValidation] = useState({ allowed: true });
  const location = useLocation();

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check time-based access restrictions
        const accessCheck = await adminPanelCustomizationService.validateAdminAccess();
        setAccessValidation(accessCheck);

        // If page-specific permissions are required
        if (pageId && requiredPermission) {
          const hasPagePermission = await adminPanelCustomizationService.hasPagePermission(pageId, requiredPermission);
          setHasPermission(hasPagePermission);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Default to allowing access if permission check fails
        setHasPermission(true);
        setAccessValidation({ allowed: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [pageId, requiredPermission, location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check time-based access restrictions
  if (!accessValidation.allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Clock className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">{accessValidation.reason}</p>
            <p className="text-sm text-gray-500">
              Please contact your administrator if you need access during these hours.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check page-specific permissions
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Shield className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required permission: <span className="font-medium">{requiredPermission}</span>
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the protected component
  return children;
};

// Higher-order component for easier usage
export const withPermissionCheck = (Component, requiredPermission = 'view', pageId = null) => {
  return (props) => (
    <ProtectedRoute requiredPermission={requiredPermission} pageId={pageId}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;