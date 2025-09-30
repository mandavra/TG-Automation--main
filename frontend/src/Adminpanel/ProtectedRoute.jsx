import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem("auth") === "true";
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const adminRole = localStorage.getItem("adminRole");
  const token = localStorage.getItem("token");
  
  console.log('ProtectedRoute check:', {
    path: location.pathname,
    isAuthenticated,
    isAdmin,
    adminRole,
    hasToken: !!token
  });
  
  // Basic authentication check - just require auth and token
  if (!isAuthenticated || !token) {
    console.log('Access denied - no auth or token');
    return <Navigate to="/loginAdmin" replace />;
  }
  
  // Additional check for super admin only routes
  const superAdminOnlyRoutes = ['/admin/global-search', '/admin/system-analytics', '/admin/create-admin', '/admin/super-admin-withdrawals', '/admin/super-admin-dashboard'];
  if (superAdminOnlyRoutes.includes(location.pathname) && adminRole !== 'superadmin') {
    console.log('Super admin route access denied - redirecting to dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
