const tenantMiddleware = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  // Add tenant filtering helper to request object
  req.getTenantFilter = () => {
    if (req.admin.role === 'superadmin') {
      // Super admin can see all data - no filter
      return {};
    } else {
      // Regular admin can only see their own data
      return { adminId: req.admin._id };
    }
  };

  // Helper for group/channel bundle queries (uses createdBy field)
  req.getGroupTenantFilter = () => {
    if (req.admin.role === 'superadmin') {
      return {};
    } else {
      return { createdBy: req.admin._id };
    }
  };

  // Helper to check if admin can access specific resource
  req.canAccessResource = (resourceAdminId) => {
    if (req.admin.role === 'superadmin') {
      return true;
    }
    return resourceAdminId && resourceAdminId.toString() === req.admin._id.toString();
  };

  // Helper to ensure admin ownership on create operations
  req.setAdminOwnership = (data) => {
    if (req.admin.role !== 'superadmin') {
      // Regular admins can only create resources for themselves
      data.adminId = req.admin._id;
    }
    return data;
  };

  // Helper to set group ownership
  req.setGroupOwnership = (data) => {
    data.createdBy = req.admin._id;
    return data;
  };

  next();
};

module.exports = tenantMiddleware;