const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail, isActive: true });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret',
      { expiresIn: '7d' }
    );

    res.json({ token, admin: { id: admin._id, email: admin.email, role: admin.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    // Only super-admin should reach here; roleMiddleware enforces
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'Admin with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email: normalizedEmail, password: hashed, role: 'admin' });
    res.status(201).json({ id: admin._id, email: admin.email, role: admin.role });
  } catch (error) {
    res.status(500).json({ message: 'Create admin failed', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id } = req.admin || {};
    const admin = await Admin.findById(id).select('_id email role isActive createdAt');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ id: admin._id, email: admin.email, role: admin.role });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

exports.listAdmins = async (req, res) => {
  try {
    // Only super admin can list all admins
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }
    const admins = await Admin.find({})
      .select('_id email role isActive createdAt permissions platformFee')
      .sort({ createdAt: -1 });
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list admins', error: error.message });
  }
};

exports.updateAdminEmail = async (req, res) => {
  try {
    // Only super admin can update other admins
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }
    
    const { id } = req.params;
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    email = String(email).trim().toLowerCase();

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'superadmin') return res.status(403).json({ message: 'Cannot modify Super Admin' });

    const exists = await Admin.findOne({ email, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    admin.email = email;
    await admin.save();
    res.json({ id: admin._id, email: admin.email, role: admin.role });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update email', error: error.message });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    // Only super admin can update other admins
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }
    
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'superadmin') return res.status(403).json({ message: 'Cannot modify Super Admin' });

    const hashed = await bcrypt.hash(password, 10);
    admin.password = hashed;
    await admin.save();
    res.json({ id: admin._id, email: admin.email, role: admin.role, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    // Only super admin can delete other admins
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }
    
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'superadmin') return res.status(403).json({ message: 'Cannot delete Super Admin' });

    await Admin.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete admin', error: error.message });
  }
};

// Super Admin: Update admin permissions and platform fee
exports.updatePermissionsAndFee = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const { id } = req.params;
    const { permissions, platformFee } = req.body || {};

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    // Removed: if (admin.role === 'superadmin') return res.status(403).json({ message: 'Cannot modify Super Admin' });

    if (permissions) {
      if (!Array.isArray(permissions) || permissions.some(p => typeof p !== 'string')) {
        return res.status(400).json({ message: 'Invalid permissions format' });
      }
      admin.permissions = permissions;
    }

    if (platformFee !== undefined) {
      const feeNum = Number(platformFee);
      if (!Number.isFinite(feeNum)) {
        return res.status(400).json({ message: 'Invalid platformFee' });
      }
      admin.platformFee = feeNum;
    }

    await admin.save();

    res.json({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
      platformFee: admin.platformFee
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update permissions/fee', error: error.message });
  }
};

exports.seedSuperAdmin = async ({ email, password }) => {
  // to be called on server start
  try {
    const exists = await Admin.findOne({ role: 'superadmin' });
    if (exists) return { seeded: false, message: 'Super admin already exists' };
    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashed, role: 'superadmin' });
    return { seeded: true, id: admin._id, email: admin.email };
  } catch (e) {
    return { seeded: false, error: e.message };
  }
};

// Super Admin Dashboard Methods
exports.getDashboardStats = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const User = require('../models/user.model');
    const Plan = require('../models/plan');
    const Group = require('../models/group.model');
    const PaymentLink = require('../models/paymentLinkModel');
    const Invoice = require('../models/Invoice');
    const WithdrawalRequest = require('../models/withdrawalRequest.model');

    const stats = {
      totalAdmins: await Admin.countDocuments({ role: 'admin' }),
      totalUsers: await User.countDocuments({}),
      totalPlans: await Plan.countDocuments({}),
      totalChannelBundles: await Group.countDocuments({}),
      totalRevenue: await PaymentLink.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      totalInvoices: await Invoice.countDocuments({}),
      
      // Withdrawal statistics
      totalWithdrawalRequests: await WithdrawalRequest.countDocuments({}),
      pendingWithdrawals: await WithdrawalRequest.countDocuments({ status: 'pending' }),
      totalWithdrawnAmount: await WithdrawalRequest.aggregate([
        { $match: { status: { $in: ['approved', 'processed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      
      recentActivity: await PaymentLink.find({ status: 'SUCCESS' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userid', 'firstName lastName email')
        .populate('adminId', 'email'),
        
      recentWithdrawals: await WithdrawalRequest.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('adminId', 'email')
        .populate('processedBy', 'email')
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get dashboard stats', error: error.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const { adminId } = req.params;
    const User = require('../models/user.model');
    const Plan = require('../models/plan');
    const Group = require('../models/group.model');
    const PaymentLink = require('../models/paymentLinkModel');

    const admin = await Admin.findById(adminId).select('_id email role isActive createdAt');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const stats = {
      admin,
      totalUsers: await User.countDocuments({ adminId }),
      totalPlans: await Plan.countDocuments({ adminId }),
      totalChannelBundles: await Group.countDocuments({ createdBy: adminId }),
      totalRevenue: await PaymentLink.aggregate([
        { $match: { adminId: new require('mongoose').Types.ObjectId(adminId), status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      recentPayments: await PaymentLink.find({ adminId, status: 'SUCCESS' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userid', 'firstName lastName email')
    };

    res.json(stats);
  } catch (error) {
    console.error('getAdminStats error:', error); // Added logging
    res.status(500).json({ message: 'Failed to get admin stats', error: error.message });
  }
};

exports.impersonateAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const { adminId } = req.params;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot impersonate super admin' });
    }

    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role,
        impersonatedBy: req.admin._id // Track who is impersonating
      },
      process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret',
      { expiresIn: '1h' } // Shorter expiry for impersonation
    );

    res.json({ 
      token, 
      admin: { id: admin._id, email: admin.email, role: admin.role },
      impersonatedBy: req.admin.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to impersonate admin', error: error.message });
  }
};

// Super Admin: Get system-wide overview
exports.getSystemOverview = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const User = require('../models/user.model');
    const Plan = require('../models/plan');
    const Group = require('../models/group.model');
    const PaymentLink = require('../models/paymentLinkModel');
    const Invoice = require('../models/Invoice');
    const WithdrawalRequest = require('../models/withdrawalRequest.model');
    const ChannelMember = require('../models/ChannelMember');

    // Get comprehensive system stats
    const [adminStats, systemStats, revenueStats] = await Promise.all([
      // Admin performance stats
      Admin.aggregate([
        { $match: { role: 'admin' } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'adminId',
            as: 'users'
          }
        },
        {
          $lookup: {
            from: 'paymentlinks',
            localField: '_id', 
            foreignField: 'adminId',
            as: 'payments'
          }
        },
        {
          $project: {
            email: 1,
            isActive: 1,
            createdAt: 1,
            userCount: { $size: '$users' },
            paymentCount: { $size: '$payments' },
            revenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      cond: { $eq: ['$$this.status', 'SUCCESS'] }
                    }
                  },
                  as: 'payment',
                  in: '$$payment.amount'
                }
              }
            }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Overall system stats
      {
        totalAdmins: await Admin.countDocuments({ role: 'admin' }),
        activeAdmins: await Admin.countDocuments({ role: 'admin', isActive: true }),
        totalUsers: await User.countDocuments({}),
        activeUsers: await User.countDocuments({ telegramJoinStatus: { $in: ['joined', 'active'] } }),
        totalPayments: await PaymentLink.countDocuments({}),
        successfulPayments: await PaymentLink.countDocuments({ status: 'SUCCESS' }),
        totalPlans: await Plan.countDocuments({}),
        activePlans: await Plan.countDocuments({ status: 'active' }),
        totalChannelBundles: await Group.countDocuments({}),
        totalChannelMembers: await ChannelMember.countDocuments({}),
        totalInvoices: await Invoice.countDocuments({}),
        totalWithdrawals: await WithdrawalRequest.countDocuments({}),
        pendingWithdrawals: await WithdrawalRequest.countDocuments({ status: 'pending' })
      },
      
      // Revenue and growth stats
      PaymentLink.aggregate([
        { 
          $match: { status: 'SUCCESS' } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyRevenue: { $sum: '$amount' },
            dailyCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ])
    ]);

    res.json({
      adminPerformance: adminStats,
      systemStats,
      revenueStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get system overview', error: error.message });
  }
};

// Super Admin: Bulk operations
exports.bulkUserOperation = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const { operation, userIds, data } = req.body;
    
    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid bulk operation data' });
    }

    let result = {};
    const User = require('../models/user.model');

    switch (operation) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: true } }
        );
        break;
        
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: false } }
        );
        break;
        
      case 'updateStatus':
        if (!data?.status) {
          return res.status(400).json({ message: 'Status is required for update operation' });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { telegramJoinStatus: data.status } }
        );
        break;
        
      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid operation type' });
    }

    res.json({
      success: true,
      operation,
      affected: result.modifiedCount || result.deletedCount || 0,
      message: `Bulk ${operation} completed successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk operation failed', error: error.message });
  }
};

// Super Admin: Global search across all data
exports.globalSearch = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }

    const { query, type } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const User = require('../models/user.model');
    const PaymentLink = require('../models/paymentLinkModel');
    const Invoice = require('../models/Invoice');
    const Group = require('../models/group.model');

    const searchRegex = { $regex: query, $options: 'i' };
    const results = {};

    // Search based on type or search all if no type specified
    if (!type || type === 'users') {
      results.users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { panNumber: searchRegex }
        ]
      }).populate('adminId', 'email').limit(10);
    }

    if (!type || type === 'payments') {
      results.payments = await PaymentLink.find({
        $or: [
          { link_id: searchRegex },
          { customer_id: searchRegex },
          { plan_name: searchRegex }
        ]
      }).populate('userid', 'firstName lastName').populate('adminId', 'email').limit(10);
    }

    if (!type || type === 'invoices') {
      results.invoices = await Invoice.find({
        $or: [
          { invoiceNo: searchRegex },
          { 'billedTo.name': searchRegex },
          { 'billedTo.phone': searchRegex },
          { 'billedTo.email': searchRegex }
        ]
      }).populate('adminId', 'email').limit(10);
    }

    if (!type || type === 'groups') {
      results.groups = await Group.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }).populate('createdBy', 'email').limit(10);
    }

    res.json({
      query,
      type: type || 'all',
      results,
      totalFound: Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Global search failed', error: error.message });
  }
};

// Super Admin: Set platformFee for all admins
exports.setPlatformFeeForAll = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Super admin access required' });
    }
    const { platformFee } = req.body;
    const feeNum = Number(platformFee);
    if (!Number.isFinite(feeNum)) {
      return res.status(400).json({ message: 'Invalid platformFee' });
    }
    // Update all admins except superadmin
    const result = await Admin.updateMany(
      { role: { $ne: 'superadmin' } },
      { $set: { platformFee: feeNum } }
    );
    res.json({ success: true, updated: result.modifiedCount, platformFee: feeNum });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update platformFee for all admins', error: error.message });
  }
};


