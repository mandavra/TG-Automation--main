// Middleware to inject admin context into requests
// This middleware should be used on routes that need admin data isolation

const injectAdminContext = (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  // Inject admin ID into request body for data operations
  if (req.method === 'POST' && req.body) {
    req.body.adminId = req.admin._id;
  }

  // Store admin context for queries
  req.adminContext = {
    adminId: req.admin._id,
    role: req.admin.role,
    email: req.admin.email
  };

  next();
};

module.exports = injectAdminContext;